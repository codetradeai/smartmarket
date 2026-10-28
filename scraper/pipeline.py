"""Carga transacional restrita a PostgreSQL local descartável, sem coleta HTTP."""
import argparse
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import json
import os
from pathlib import Path

from normalizacao import normalizar_produto, texto_normalizado


class ErroIngestao(ValueError):
    pass


def hash_dados(dados):
    return hashlib.sha256(json.dumps(dados, sort_keys=True, ensure_ascii=False,
                                     default=str, separators=(',', ':')).encode()).hexdigest()


def chave_decimal(valor):
    """Representação exata, independente de zeros finais/contexto Decimal."""
    sinal, digitos, expoente = valor.as_tuple()
    digitos = list(digitos)
    while len(digitos) > 1 and digitos[-1] == 0:
        digitos.pop()
        expoente += 1
    return f'{sinal}:{"".join(map(str, digitos))}:{expoente}'


def validar_dsn(dsn, *, permitir_banco_app=False):
    from psycopg.conninfo import conninfo_to_dict
    config = conninfo_to_dict(dsn)
    # Exigir host/database explícitos impede fallback em variáveis PG* remotas.
    host = config.get('host', '')
    if config.get('service') or config.get('hostaddr') or os.environ.get('PGSERVICE') or os.environ.get('PGHOSTADDR'):
        raise ErroIngestao('service_e_hostaddr_nao_permitidos')
    if ',' in host or (host not in ('localhost', '127.0.0.1', '::1') and not (host.startswith('/') and Path(host).is_dir())):
        raise ErroIngestao('somente_host_local_explicito')
    dbname = config.get('dbname', '')
    eh_fixture = dbname.startswith('smartmarket_fixture_')
    eh_app = permitir_banco_app and dbname in ('smartmarket', 'smartmarket_dev', 'smartmarket_test')
    if not (eh_fixture or eh_app):
        raise ErroIngestao('somente_banco_descartavel_smartmarket_fixture_')
    config.setdefault('connect_timeout', '5')
    return config


def preparar(registros):
    if not isinstance(registros, list) or not registros:
        raise ErroIngestao('lista_de_registros_vazia_ou_invalida')
    preparados = []
    for indice, row in enumerate(registros):
        try:
            if not isinstance(row, dict):
                raise ValueError('registro_nao_objeto')
            externo = row.get('id_produto_origem')
            if isinstance(externo, bool) or not isinstance(externo, (str, int)) or not str(externo).strip():
                raise ValueError('id_produto_origem_obrigatorio')
            if isinstance(row.get('preco'), bool):
                raise ValueError('preco_invalido')
            valor = Decimal(str(row['preco']))
            if not valor.is_finite() or valor <= 0 or valor >= Decimal('100000000'):
                raise ValueError('preco_fora_numeric_10_2')
            if valor != valor.quantize(Decimal('0.01')):
                raise ValueError('preco_exige_arredondamento_nao_definido')
            if row.get('moeda', 'BRL') != 'BRL':
                raise ValueError('somente_moeda_BRL_sem_conversao')
            data_coleta = row['data_coleta']
            if isinstance(data_coleta, str) and data_coleta.endswith('Z'):
                data_coleta = data_coleta[:-1] + '+00:00'
            instante = datetime.fromisoformat(data_coleta)
            if instante.tzinfo is None or instante.utcoffset() is None:
                raise ValueError('timestamp_sem_fuso')
            produto = normalizar_produto(row)
            for campo in ['nome', 'nome_normalizado', 'marca', 'unidade', 'categoria']:
                value = produto[campo]
                if value is not None and (not isinstance(value, str) or len(value) > 255):
                    raise ValueError('campo_incompativel_com_ddl_' + campo)
            # Mesmo instante e valor devem identificar o mesmo evento, mesmo
            # quando JSON usa offset/zeros finais/tipo numérico diferentes.
            canonico = dict(row)
            canonico.update(id_produto_origem=str(externo), preco=chave_decimal(valor),
                            moeda='BRL', data_coleta=instante.astimezone(timezone.utc).isoformat())
            if row.get('preco_normal') is not None:
                normal = Decimal(str(row['preco_normal']))
                if not normal.is_finite() or normal <= 0:
                    raise ValueError('preco_normal_invalido')
                canonico['preco_normal'] = chave_decimal(normal)
            preparados.append({'external_id': str(externo), 'valor': valor,
                               'instante': instante.astimezone(timezone.utc),
                               'produto': produto, 'hash': hash_dados(canonico),
                               'source_signature': hash_dados({
                                   'nome': produto['nome_normalizado'],
                                   'marca': texto_normalizado(produto['marca']) if produto['marca'] else None,
                                   'quantidade': chave_decimal(produto['quantidade']) if produto['quantidade'] is not None else None,
                                   'unidade': produto['unidade'],
                               })})
        except (ValueError, TypeError, KeyError, InvalidOperation, OverflowError) as exc:
            raise ErroIngestao(f'registro_{indice}: {exc}') from exc
    return preparados


def carregar(registros, *, dsn, source, store, mercado_id, run_id, mapeamento=None, permitir_banco_app=False):
    import psycopg
    config = validar_dsn(dsn, permitir_banco_app=permitir_banco_app)
    for nome, valor in [('source', source), ('store', store), ('run_id', run_id)]:
        if not isinstance(valor, str) or not valor.strip() or valor != valor.strip() or len(valor) > 100:
            raise ErroIngestao(nome + '_invalido')
    if ':' in source or ':' in store:
        raise ErroIngestao('source_store_nao_podem_conter_separador')
    if isinstance(mercado_id, bool) or not isinstance(mercado_id, int) or mercado_id <= 0:
        raise ErroIngestao('mercado_id_deve_ser_inteiro_positivo')
    origem = f'{source}:{store}'
    if len(origem) > 255:
        raise ErroIngestao('origem_muito_longa')
    preparados = preparar(registros)
    mapeamento = {} if mapeamento is None else mapeamento
    if not isinstance(mapeamento, dict) or any(
        not isinstance(k, str) or not k.strip() or not isinstance(v, int) or isinstance(v, bool) or v <= 0
        for k, v in mapeamento.items()
    ):
        raise ErroIngestao('mapeamento_deve_conter_ids_positivos')
    fingerprint = hash_dados({'contrato': 'ingestao-v2',
                             'eventos': sorted(row['hash'] for row in preparados),
                             'mapeamento': mapeamento})
    resumo = {'run_id': run_id, 'produtos_criados': 0, 'precos_inseridos': 0,
              'eventos_repetidos': 0, 'reexecucao': False, 'moeda': 'BRL',
              'pendencias': [{'external_id': row['external_id'], 'motivos': row['produto']['pendencias']}
                            for row in preparados if row['produto']['pendencias']]}
    with psycopg.connect(**config) as conn:
        with conn.cursor() as cur:
            # Evita corrida em identidade/histórico mesmo entre runs diferentes.
            cur.execute('SELECT pg_advisory_xact_lock(%s)', (4042026,))
            cur.execute(Path(__file__).with_name('ingest_schema.sql').read_text())
            cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='smartmarket_ingest' AND table_name='source_product' AND column_name='source_signature')")
            if not cur.fetchone()[0]:
                raise ErroIngestao('schema_ingestao_antigo_use_nova_base_fixture_v2')
            cur.execute('SELECT mercado_id FROM smartmarket_ingest.source_store WHERE source=%s AND store=%s', (source, store))
            vinculo = cur.fetchone()
            if vinculo and vinculo[0] != mercado_id:
                raise ErroIngestao('loja_ja_vinculada_a_outro_mercado')
            cur.execute('SELECT source, store, mercado_id, payload_hash FROM smartmarket_ingest.run WHERE run_id=%s', (run_id,))
            anterior = cur.fetchone()
            if anterior:
                if anterior != (source, store, mercado_id, fingerprint):
                    raise ErroIngestao('run_id_reutilizado_com_conteudo_diferente')
                resumo['reexecucao'] = True
                return resumo
            cur.execute('SELECT id FROM mercado WHERE id=%s', (mercado_id,))
            if cur.fetchone() is None:
                raise ErroIngestao('mercado_nao_cadastrado')
            if not vinculo:
                cur.execute('INSERT INTO smartmarket_ingest.source_store(source,store,mercado_id) VALUES(%s,%s,%s)', (source,store,mercado_id))
            cur.execute('INSERT INTO smartmarket_ingest.run(run_id, source, store, mercado_id, payload_hash) VALUES(%s,%s,%s,%s,%s)',
                        (run_id, source, store, mercado_id, fingerprint))
            for row in preparados:
                externo = row['external_id']
                key = (source, store, externo)
                cur.execute('SELECT produto_id, source_signature FROM smartmarket_ingest.source_product WHERE source=%s AND store=%s AND external_id=%s', key)
                existente = cur.fetchone()
                if existente and existente[1] != row['source_signature']:
                    raise ErroIngestao('cadastro_origem_alterado_exige_revisao')
                aprovado = mapeamento.get(externo)
                if existente and aprovado and existente[0] != aprovado:
                    raise ErroIngestao('remapeamento_exige_revisao_explicita')
                if existente:
                    produto_id = existente[0]
                elif aprovado:
                    cur.execute('SELECT id FROM produto WHERE id=%s', (aprovado,))
                    if cur.fetchone() is None:
                        raise ErroIngestao('produto_mapeado_nao_existe')
                    produto_id = aprovado
                else:
                    p = row['produto']
                    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='produto'")
                    cols_produto = {r[0] for r in cur.fetchall()}
                    campos = ['nome', 'nome_normalizado', 'marca', 'quantidade', 'unidade', 'codigo_barras', 'categoria']
                    if 'imagem_url' in cols_produto and p.get('imagem_url') is not None:
                        campos.append('imagem_url')
                    if 'descricao' in cols_produto and p.get('descricao') is not None:
                        campos.append('descricao')
                    cols_str = ','.join(campos)
                    placeholders = ','.join(['%s'] * len(campos))
                    cur.execute(f'INSERT INTO produto({cols_str}) VALUES({placeholders}) RETURNING id',
                                tuple(p[k] for k in campos))
                    produto_id = cur.fetchone()[0]
                    resumo['produtos_criados'] += 1
                if not existente:
                    cur.execute('INSERT INTO smartmarket_ingest.source_product(source,store,external_id,produto_id,source_signature) VALUES(%s,%s,%s,%s,%s)', (*key, produto_id, row['source_signature']))
                cur.execute('SELECT payload_hash FROM smartmarket_ingest.event WHERE source=%s AND store=%s AND external_id=%s AND collected_at=%s', (*key,row['instante']))
                evento = cur.fetchone()
                if evento:
                    if evento[0] != row['hash']:
                        raise ErroIngestao('evento_mesmo_instante_com_conteudo_diferente')
                    resumo['eventos_repetidos'] += 1
                    continue
                # DDL da equipe usa TIMESTAMP sem fuso: armazenar UTC explícito
                # por convenção documentada; metadado de ingestão usa TIMESTAMPTZ.
                cur.execute('INSERT INTO preco(produto_id,mercado_id,valor,coletado_em,origem,nome_bruto,disponivel) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING id',
                            (produto_id,mercado_id,row['valor'],row['instante'].replace(tzinfo=None),origem,row['produto']['nome'],True))
                preco_id = cur.fetchone()[0]
                cur.execute('INSERT INTO smartmarket_ingest.event(source,store,external_id,collected_at,payload_hash,preco_id,run_id) VALUES(%s,%s,%s,%s,%s,%s,%s)',
                            (*key,row['instante'],row['hash'],preco_id,run_id))
                resumo['precos_inseridos'] += 1
    return resumo


def main(argv=None):
    import psycopg
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--source', required=True)
    parser.add_argument('--store', required=True)
    parser.add_argument('--mercado-id', required=True, type=int)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--mapping', type=Path, help='Objeto id externo -> produto_id aprovado')
    parser.add_argument('--allow-app-db', action='store_true', help='Permite carregar na base smartmarket da aplicacao')
    args = parser.parse_args(argv)
    dsn = os.environ.get('SMARTMARKET_LOCAL_DSN', '')
    try:
        registros = json.loads(args.input.read_text(), parse_float=Decimal)
        mapping = json.loads(args.mapping.read_text()) if args.mapping else None
        resultado = carregar(registros, dsn=dsn, source=args.source, store=args.store,
                             mercado_id=args.mercado_id, run_id=args.run_id, mapeamento=mapping,
                             permitir_banco_app=args.allow_app_db)
        print(json.dumps(resultado, ensure_ascii=False))
        return 0
    except (OSError, ValueError) as exc:
        print(json.dumps({'status':'falhou', 'motivo':str(exc)}, ensure_ascii=False))
        return 1
    except psycopg.Error as exc:
        print(json.dumps({'status': 'falhou', 'motivo': type(exc).__name__}))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
