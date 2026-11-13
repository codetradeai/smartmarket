"""Gera backend/deploy/08_lojas_filiais.sql a partir da lista curada (scraper/lojas/lojas.json).

O SQL é para aplicação MANUAL, por ordem do responsável (depois do 06 e do 07). Este script não
conecta em banco nenhum: só lê o JSON (com a mesma validação do carregador) e escreve o arquivo.
Saída determinística: a mesma lista e a mesma data geram sempre o mesmo texto.

Uso (da raiz do repositório):
    python scraper/gerar_sql_lojas.py [--arquivo scraper/lojas/lojas.json] [--saida backend/deploy/08_lojas_filiais.sql]
"""
import argparse
from collections import Counter
from datetime import date
from pathlib import Path

from carregar_lojas import ARQUIVO_PADRAO, ler_lojas, mercado_id_da_rede

SAIDA_PADRAO = Path(__file__).resolve().parent.parent / 'backend' / 'deploy' / '08_lojas_filiais.sql'


def literal(valor):
    """Valor SQL: NULL para vazio, número como está, texto entre aspas com o apóstrofo duplicado."""
    if valor is None:
        return 'NULL'
    if isinstance(valor, (int, float)):
        return repr(valor)
    return "'" + str(valor).replace("'", "''") + "'"


def _insert(loja):
    valores = ', '.join(literal(v) for v in (
        mercado_id_da_rede(loja['mercado']), loja['nome'], loja['endereco'], loja['cidade'], loja['uf'],
        loja['cep'], loja['latitude'], loja['longitude'], loja['codigo_externo']))
    return (f"-- {loja['nome']}\n"
            "INSERT INTO loja (mercado_id, nome, endereco, cidade, uf, cep, latitude, longitude, codigo_externo)\n"
            "VALUES\n"
            f"    ({valores})\n"
            "ON CONFLICT (mercado_id, codigo_externo) DO UPDATE\n"
            "    SET nome      = EXCLUDED.nome,\n"
            "        endereco  = EXCLUDED.endereco,\n"
            "        cidade    = EXCLUDED.cidade,\n"
            "        uf        = EXCLUDED.uf,\n"
            "        cep       = EXCLUDED.cep,\n"
            "        latitude  = EXCLUDED.latitude,\n"
            "        longitude = EXCLUDED.longitude;\n")


def _pre_conferencia(redes):
    """Aborta antes de inserir qualquer coisa se o mercado_id não existir ou não for a rede esperada."""
    blocos = []
    for rede in sorted(redes, key=mercado_id_da_rede):
        mid = mercado_id_da_rede(rede)
        blocos.append(
            f"    IF NOT EXISTS (SELECT 1 FROM mercado WHERE id = {mid} AND nome ILIKE {literal('%' + rede + '%')}) THEN\n"
            f"        RAISE EXCEPTION 'mercado {mid} nao existe ou nao e {rede}: nada foi inserido';\n"
            "    END IF;")
    return "DO $$\nBEGIN\n" + '\n'.join(blocos) + "\nEND $$;\n"


def gerar_sql(lojas, *, data):
    por_rede = Counter(l['mercado'] for l in lojas)
    resumo = ', '.join(f"{rede} {n}" for rede, n in sorted(por_rede.items(), key=lambda kv: mercado_id_da_rede(kv[0])))
    cabecalho = (
        "-- ============================================================\n"
        "-- SmartMarket - Deploy Script 08: lojas (filiais) reais de Fort, Asun e Zaffari/Bourbon no RS\n"
        "-- ============================================================\n"
        f"-- Gerado por scraper/gerar_sql_lojas.py em {data} a partir de scraper/lojas/lojas.json.\n"
        "-- NAO edite a mao: altere o JSON e gere de novo.\n"
        f"-- Lojas: {len(lojas)} ({resumo}).\n"
        "--\n"
        "-- Ordem: depois do 06 e do 07 (precisa das tabelas loja e preco_loja e da loja padrao).\n"
        "-- Antes: branch do banco no Neon (ver backend/DEPLOY.md).\n"
        "-- Idempotente: cada loja entra por ON CONFLICT (mercado_id, codigo_externo) e so atualiza\n"
        "-- nome, endereco, cidade, uf, cep, latitude e longitude. Nunca apaga linha, nunca toca a loja\n"
        "-- padrao (codigo_externo = 'padrao') e nunca muda o campo ativa de uma loja existente.\n"
        "-- A pre-conferencia aborta tudo (RAISE EXCEPTION) se algum mercado_id usado nao existir ou\n"
        "-- nao for a rede esperada.\n"
        "-- Uso: execute manualmente no banco (console SQL do Neon), por ordem do responsavel.\n"
        "-- ============================================================\n")
    conferencia = (
        "-- Conferencia: lojas reais por mercado (a loja padrao fica de fora)\n"
        "SELECT m.id AS mercado_id, m.nome AS mercado,\n"
        "       COUNT(l.id) AS lojas,\n"
        "       COUNT(l.id) FILTER (WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL) AS com_coordenadas,\n"
        "       COUNT(l.id) FILTER (WHERE l.latitude IS NULL OR l.longitude IS NULL) AS sem_coordenadas\n"
        "FROM mercado m\n"
        "LEFT JOIN loja l ON l.mercado_id = m.id AND l.codigo_externo <> 'padrao'\n"
        f"WHERE m.id IN ({', '.join(str(mercado_id_da_rede(r)) for r in sorted(por_rede, key=mercado_id_da_rede))})\n"
        "GROUP BY m.id, m.nome\n"
        "ORDER BY m.id;\n")
    return (cabecalho + "\nBEGIN;\n\n" + _pre_conferencia(por_rede) + "\n"
            + '\n'.join(_insert(l) for l in lojas) + "\nCOMMIT;\n\n" + conferencia)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--arquivo', type=Path, default=ARQUIVO_PADRAO)
    parser.add_argument('--saida', type=Path, default=SAIDA_PADRAO)
    parser.add_argument('--data', default=date.today().isoformat(), help='data do cabeçalho (AAAA-MM-DD)')
    args = parser.parse_args(argv)
    lojas = ler_lojas(args.arquivo)
    args.saida.write_text(gerar_sql(lojas, data=args.data), encoding='utf-8', newline='\n')
    print(f'{len(lojas)} lojas escritas em {args.saida}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
