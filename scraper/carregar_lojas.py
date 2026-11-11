"""Carrega a lista curada de lojas (scraper/lojas/lojas.json) na tabela ``loja``.

Idempotente: upsert por (mercado_id, codigo_externo). Rodar de novo não duplica nada e nunca
apaga loja. Não toca na loja padrão de cada mercado (``codigo_externo = 'padrao'``, reservado) e
só substitui latitude/longitude quando o arquivo traz valor (uma coordenada já geocodificada no
banco não volta a nulo). Respeita ``validar_dsn``: só PostgreSQL local descartável, nunca o Neon.
A tabela é criada pela migration 06 da equipe, nunca aqui.
"""
import argparse
import json
import os
import re
from pathlib import Path

from pipeline import CODIGO_LOJA_PADRAO, ErroIngestao, validar_dsn

ARQUIVO_PADRAO = Path(__file__).resolve().parent / 'lojas' / 'lojas.json'
OBRIGATORIOS = ('mercado', 'nome', 'codigo_externo', 'fonte_url')


def normalizar_cep(valor):
    """Só dígitos (8). Aceita 00000-000; qualquer outra coisa é inválida."""
    if not re.fullmatch(r'\d{5}-?\d{3}', str(valor).strip()):
        raise ValueError('cep_invalido')
    return re.sub(r'\D', '', str(valor))


def mercado_id_da_rede(rede):
    """mercado.id da rede (mesmos ids de REDES_CONFIG e de deploy/02_mercados.sql)."""
    from rotina_carga import REDES_CONFIG
    if rede not in REDES_CONFIG:
        raise ValueError('mercado_desconhecido')
    return REDES_CONFIG[rede]['mercado_id_default']


def _texto(valor, campo, maximo):
    if not isinstance(valor, str) or not valor.strip():
        return None
    valor = valor.strip()
    if len(valor) > maximo:
        raise ValueError(f'{campo}_longo_demais')
    return valor


def _coordenada(valor, campo, limite):
    if valor is None:
        return None
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not -limite <= valor <= limite:
        raise ValueError(f'{campo}_invalida')
    return float(valor)


def validar_loja(loja):
    """Loja normalizada ou ValueError('motivo'). Campos obrigatórios: ver OBRIGATORIOS."""
    if not isinstance(loja, dict):
        raise ValueError('loja_nao_objeto')
    faltando = [c for c in OBRIGATORIOS if _texto(loja.get(c), c, 255) is None]
    if faltando:
        raise ValueError('campos_obrigatorios_ausentes: ' + ','.join(faltando))
    codigo = _texto(loja['codigo_externo'], 'codigo_externo', 100)
    if codigo == CODIGO_LOJA_PADRAO:
        raise ValueError('codigo_externo_reservado')
    uf = _texto(loja.get('uf'), 'uf', 50)  # o tamanho certo (2 letras) e conferido pela regex abaixo
    if uf is not None and not re.fullmatch(r'[A-Za-z]{2}', uf):
        raise ValueError('uf_invalida')
    latitude = _coordenada(loja.get('latitude'), 'latitude', 90)
    longitude = _coordenada(loja.get('longitude'), 'longitude', 180)
    if (latitude is None) != (longitude is None):
        raise ValueError('latitude_e_longitude_juntas')
    cep = loja.get('cep')
    return {
        'mercado': _texto(loja['mercado'], 'mercado', 50),
        'nome': _texto(loja['nome'], 'nome', 255),
        'endereco': _texto(loja.get('endereco'), 'endereco', 500),
        'cidade': _texto(loja.get('cidade'), 'cidade', 120),
        'uf': uf.upper() if uf else None,
        'cep': normalizar_cep(cep) if cep not in (None, '') else None,
        'codigo_externo': codigo,
        'latitude': latitude,
        'longitude': longitude,
    }


def ler_lojas(caminho=ARQUIVO_PADRAO):
    """Lê e valida o arquivo inteiro; junta todos os problemas num único erro."""
    dados = json.loads(Path(caminho).read_text(encoding='utf-8'))
    lojas, problemas, vistos = [], [], set()
    for indice, bruta in enumerate(dados.get('lojas', [])):
        try:
            loja = validar_loja(bruta)
            mercado_id_da_rede(loja['mercado'])
            chave = (loja['mercado'], loja['codigo_externo'])
            if chave in vistos:
                raise ValueError('loja_duplicada_no_arquivo')
            vistos.add(chave)
            lojas.append(loja)
        except ValueError as exc:
            problemas.append(f'lojas[{indice}]: {exc}')
    if problemas:
        raise ErroIngestao('lojas_invalidas: ' + '; '.join(problemas))
    return lojas


def carregar_lojas(lojas, *, dsn, permitir_banco_app=False):
    import psycopg
    config = validar_dsn(dsn, permitir_banco_app=permitir_banco_app)
    resumo = {'inseridas': 0, 'atualizadas': 0}
    with psycopg.connect(**config) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.loja') IS NOT NULL")
            if not cur.fetchone()[0]:
                raise ErroIngestao('tabela_loja_ausente_aplique_a_migration_06_lojas_por_cep')
            for loja in lojas:
                mercado_id = mercado_id_da_rede(loja['mercado'])
                cur.execute('SELECT 1 FROM mercado WHERE id=%s', (mercado_id,))
                if cur.fetchone() is None:
                    raise ErroIngestao(f"mercado_nao_cadastrado: {loja['mercado']} (id {mercado_id})")
                cur.execute(
                    'INSERT INTO loja(mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo) '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) '
                    'ON CONFLICT (mercado_id, codigo_externo) DO UPDATE SET '
                    'nome = EXCLUDED.nome, endereco = EXCLUDED.endereco, cidade = EXCLUDED.cidade, '
                    'uf = EXCLUDED.uf, cep = EXCLUDED.cep, '
                    'latitude = COALESCE(EXCLUDED.latitude, loja.latitude), '
                    'longitude = COALESCE(EXCLUDED.longitude, loja.longitude) '
                    'RETURNING (xmax = 0)',
                    (mercado_id, loja['nome'], loja['endereco'], loja['cidade'], loja['uf'], loja['cep'],
                     loja['latitude'], loja['longitude'], loja['codigo_externo']))
                resumo['inseridas' if cur.fetchone()[0] else 'atualizadas'] += 1
    return resumo


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--arquivo', type=Path, default=ARQUIVO_PADRAO)
    parser.add_argument('--allow-app-db', action='store_true', help='Permite gravar na base smartmarket da aplicação')
    args = parser.parse_args(argv)
    try:
        resumo = carregar_lojas(ler_lojas(args.arquivo), dsn=os.environ.get('SMARTMARKET_LOCAL_DSN', ''),
                                permitir_banco_app=args.allow_app_db)
        print(json.dumps(resumo, ensure_ascii=False))
        return 0
    except (OSError, ValueError) as exc:
        print(json.dumps({'status': 'falhou', 'motivo': str(exc)}, ensure_ascii=False))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
