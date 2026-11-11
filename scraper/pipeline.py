"""Carga transacional restrita a PostgreSQL local descartável, sem coleta HTTP."""
import argparse
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import hashlib
import json
import os
from pathlib import Path

from normalizacao import normalizar_produto, texto_normalizado


class ErroIngestao(ValueError):
    pass


# Registros rejeitados vão para quarentena (relatório com o motivo) e os válidos são
# carregados. O lote só falha quando a fração rejeitada passa deste limiar.
LIMITE_REJEICAO_PADRAO = Decimal('0.2')

# Regra de preço com mais de 2 casas (ex.: 12,345 por kg): arredonda para centavos
# (ROUND_HALF_UP, a convenção comercial). Mais de 4 casas é suspeito demais para
# arredondar em silêncio e o registro vai para a quarentena.
CASAS_DECIMAIS_MAXIMAS_PRECO = 4

# Conflitos de dados POR REGISTRO detectados durante a carga. Cada um exige revisão
# humana daquele item, mas não deve impedir os demais preços da rede de entrar.
MOTIVOS_QUARENTENA_BANCO = frozenset({
    'cadastro_origem_alterado_exige_revisao',
    'remapeamento_exige_revisao_explicita',
    'ean_divergente_exige_revisao',
    'evento_mesmo_instante_com_conteudo_diferente',
    'produto_mapeado_nao_existe',
    # Coleta anterior ao vinculo vigente da loja: fecha-lo com data menor que a abertura
    # violaria a vigencia; o registro vai para revisao em vez de reescrever o passado.
    'coleta_mais_antiga_que_vinculo_vigente',
})

# Preco continua por rede: cada coleta e gravada na loja "padrao" do mercado (a mesma que a
# migration 06 cria). Filiais reais (tabela loja) entram por lista curada, nao por coleta.
CODIGO_LOJA_PADRAO = 'padrao'


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


def _preparar_registro(row):
    """Valida e normaliza um registro; levanta ValueError/TypeError/KeyError... se inválido."""
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
        if valor.as_tuple().exponent < -CASAS_DECIMAIS_MAXIMAS_PRECO:
            raise ValueError('preco_casas_decimais_excessivas')
        valor = valor.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if valor <= 0:
            raise ValueError('preco_arredondado_para_zero')
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
    # O hash usa o EAN validado (não o texto bruto). Sem EAN, o campo some do
    # payload canônico e o hash de cargas antigas continua idêntico.
    canonico.pop('codigo_barras', None)
    if produto['codigo_barras']:
        canonico['codigo_barras'] = produto['codigo_barras']
    return {'external_id': str(externo), 'valor': valor,
            'instante': instante.astimezone(timezone.utc),
            'produto': produto, 'hash': hash_dados(canonico),
            'source_signature': hash_dados({
                'nome': produto['nome_normalizado'],
                'marca': texto_normalizado(produto['marca']) if produto['marca'] else None,
                'quantidade': chave_decimal(produto['quantidade']) if produto['quantidade'] is not None else None,
                'unidade': produto['unidade'],
            })}


_ERROS_DE_REGISTRO = (ValueError, TypeError, KeyError, InvalidOperation, OverflowError)


def _motivo(exc):
    return f'campo_ausente_{exc.args[0]}' if isinstance(exc, KeyError) and exc.args else str(exc)


def preparar(registros):
    """Estrito: o primeiro registro inválido aborta o lote (ErroIngestao)."""
    if not isinstance(registros, list) or not registros:
        raise ErroIngestao('lista_de_registros_vazia_ou_invalida')
    preparados = []
    for indice, row in enumerate(registros):
        try:
            preparados.append(_preparar_registro(row))
        except _ERROS_DE_REGISTRO as exc:
            raise ErroIngestao(f'registro_{indice}: {_motivo(exc)}') from exc
    return preparados


def _identificar(row):
    row = row if isinstance(row, dict) else {}
    return {'id_produto_origem': row.get('id_produto_origem'),
            'nome_bruto': row.get('nome_bruto') or row.get('nome')}


def preparar_com_quarentena(registros):
    """Tolerante: separa (preparados, rejeitados) em vez de abortar no primeiro inválido.

    Cada rejeitado traz indice, id_produto_origem, nome_bruto, motivo e etapa.
    """
    if not isinstance(registros, list) or not registros:
        raise ErroIngestao('lista_de_registros_vazia_ou_invalida')
    preparados, rejeitados = [], []
    for indice, row in enumerate(registros):
        try:
            item = _preparar_registro(row)
            item['indice'] = indice
            preparados.append(item)
        except _ERROS_DE_REGISTRO as exc:
            rejeitados.append({'indice': indice, **_identificar(row),
                               'motivo': _motivo(exc), 'etapa': 'validacao'})
    return preparados, rejeitados


def gravar_quarentena(diretorio, *, run_id, source, store, total, rejeitados, limite):
    """Relatório de quarentena (gravação atômica) com o motivo de cada rejeição."""
    destino = Path(diretorio)
    destino.mkdir(parents=True, exist_ok=True)
    relatorio = {'run_id': run_id, 'source': source, 'store': store,
                 'total_registros': total, 'total_rejeitados': len(rejeitados),
                 'limite_rejeicao': str(limite), 'rejeitados': rejeitados}
    temporario = destino / ('.quarentena.json.tmp')
    temporario.write_text(json.dumps(relatorio, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
    arquivo = destino / 'quarentena.json'
    temporario.replace(arquivo)
    return arquivo


def _resumo_motivos(rejeitados):
    contagem = {}
    for r in rejeitados:
        contagem[r['motivo']] = contagem.get(r['motivo'], 0) + 1
    return ', '.join(f'{m}={n}' for m, n in sorted(contagem.items()))


def loja_padrao_id(cur, mercado_id):
    """id da loja padrão do mercado; cria a loja se o mercado ainda não tem (idempotente)."""
    cur.execute('INSERT INTO loja(mercado_id, nome, codigo_externo) '
                'SELECT m.id, m.nome, %s FROM mercado m WHERE m.id=%s '
                'ON CONFLICT (mercado_id, codigo_externo) DO NOTHING', (CODIGO_LOJA_PADRAO, mercado_id))
    cur.execute('SELECT id FROM loja WHERE mercado_id=%s AND codigo_externo=%s', (mercado_id, CODIGO_LOJA_PADRAO))
    return cur.fetchone()[0]


def gravar_preco_na_loja(cur, *, loja_id, produto_id, mercado_id, valor, instante, origem, nome_bruto):
    """Grava o preço coletado como vínculo preco_loja da loja; retorna (preco_id, desfecho).

    - mesmo valor do vínculo vigente (e disponível): só avança confirmado_em, sem linha nova;
    - valor mudou (ou não havia vínculo): reaproveita um preco já vigente em outra loja do mesmo
      mercado com o mesmo valor, ou cria a linha em preco; o vínculo antigo é FECHADO antes de
      abrir o novo, na mesma transação (o índice único parcial do 07 recusa dois vigentes);
    - voltou a ficar disponível com o mesmo valor: fecha o vínculo indisponível e abre outro
      disponível sobre o mesmo preco.
    desfecho é a chave do contador no resumo: precos_inseridos, precos_confirmados ou
    precos_reaproveitados. ``instante`` é naive em UTC (convenção do DDL).
    """
    cur.execute('SELECT pl.id, pl.preco_id, p.valor, pl.disponivel, pl.vigente_desde '
                'FROM preco_loja pl JOIN preco p ON p.id = pl.preco_id '
                'WHERE pl.loja_id=%s AND pl.produto_id=%s AND pl.vigente_ate IS NULL', (loja_id, produto_id))
    atual = cur.fetchone()
    if atual and instante < atual[4]:
        raise ErroIngestao('coleta_mais_antiga_que_vinculo_vigente')
    if atual and atual[2] == valor and atual[3]:
        cur.execute('UPDATE preco_loja SET confirmado_em = GREATEST(confirmado_em, %s) WHERE id=%s',
                    (instante, atual[0]))
        return atual[1], 'precos_confirmados'
    if atual and atual[2] == valor:
        preco_id, desfecho = atual[1], 'precos_reaproveitados'
    else:
        cur.execute('SELECT p.id FROM preco_loja pl JOIN preco p ON p.id = pl.preco_id '
                    'WHERE p.produto_id=%s AND p.mercado_id=%s AND p.valor=%s '
                    'AND pl.vigente_ate IS NULL AND pl.disponivel ORDER BY p.id LIMIT 1',
                    (produto_id, mercado_id, valor))
        achado = cur.fetchone()
        if achado:
            preco_id, desfecho = achado[0], 'precos_reaproveitados'
        else:
            cur.execute('INSERT INTO preco(produto_id,mercado_id,valor,coletado_em,origem,nome_bruto,disponivel) '
                        'VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING id',
                        (produto_id, mercado_id, valor, instante, origem, nome_bruto, True))
            preco_id, desfecho = cur.fetchone()[0], 'precos_inseridos'
    if atual:
        cur.execute('UPDATE preco_loja SET vigente_ate=%s WHERE id=%s', (instante, atual[0]))
    cur.execute('INSERT INTO preco_loja(preco_id, produto_id, loja_id, disponivel, vigente_desde, confirmado_em) '
                'VALUES(%s,%s,%s,%s,%s,%s)', (preco_id, produto_id, loja_id, True, instante, instante))
    return preco_id, desfecho


def sincronizar_codigo_barras(cur, produto_id, codigo):
    """Grava o EAN em produto.codigo_barras quando ainda está vazio.

    Divergência com um EAN já gravado exige revisão humana (nunca sobrescreve).
    Retorna True se gravou.
    """
    if not codigo:
        return False
    cur.execute('SELECT codigo_barras FROM produto WHERE id=%s', (produto_id,))
    linha = cur.fetchone()
    atual = linha[0] if linha else None
    if atual in (None, ''):
        cur.execute('UPDATE produto SET codigo_barras=%s WHERE id=%s', (codigo, produto_id))
        return True
    if atual != codigo:
        raise ErroIngestao('ean_divergente_exige_revisao')
    return False


def carregar(registros, *, dsn, source, store, mercado_id, run_id, mapeamento=None, permitir_banco_app=False,
             limite_rejeicao=LIMITE_REJEICAO_PADRAO, diretorio_quarentena=None):
    """Carrega os registros válidos; os inválidos vão para a quarentena com o motivo.

    O lote só falha (ErroIngestao, sem gravar nada) quando a fração de rejeitados passa de
    ``limite_rejeicao`` ou quando nenhum registro é válido. Com ``diretorio_quarentena``,
    grava ``quarentena.json`` ali, inclusive quando o lote falha pelo limiar.
    """
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
    preparados, rejeitados = preparar_com_quarentena(registros)
    total = len(registros)
    limite_rejeicao = Decimal(str(limite_rejeicao))

    def verificar_limiar():
        """Grava a quarentena e aborta o lote se a rejeição passou do limiar."""
        if rejeitados and diretorio_quarentena is not None:
            gravar_quarentena(diretorio_quarentena, run_id=run_id, source=source, store=store,
                              total=total, rejeitados=rejeitados, limite=limite_rejeicao)
        if rejeitados and (not preparados or Decimal(len(rejeitados)) / Decimal(total) > limite_rejeicao):
            raise ErroIngestao(
                f'taxa_rejeicao_acima_do_limite: {len(rejeitados)}/{total} registros rejeitados '
                f'(limite {limite_rejeicao:.0%}); motivos: {_resumo_motivos(rejeitados)}')

    verificar_limiar()  # falha rápido, antes de abrir o banco
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
              'precos_confirmados': 0, 'precos_reaproveitados': 0,
              'eventos_repetidos': 0, 'eans_gravados': 0, 'reexecucao': False, 'moeda': 'BRL',
              'rejeitados': rejeitados,
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
            cur.execute("SELECT to_regclass('public.loja') IS NOT NULL AND to_regclass('public.preco_loja') IS NOT NULL")
            if not cur.fetchone()[0]:
                raise ErroIngestao('tabelas_loja_ausentes_aplique_a_migration_06_lojas_por_cep')
            # (source, store) -> loja padrao do mercado: o preco continua por rede.
            loja_id = loja_padrao_id(cur, mercado_id)
            if not vinculo:
                cur.execute('INSERT INTO smartmarket_ingest.source_store(source,store,mercado_id) VALUES(%s,%s,%s)', (source,store,mercado_id))
            cur.execute('INSERT INTO smartmarket_ingest.run(run_id, source, store, mercado_id, payload_hash) VALUES(%s,%s,%s,%s,%s)',
                        (run_id, source, store, mercado_id, fingerprint))
            for row in preparados:
                contadores = {k: resumo[k] for k in ('produtos_criados', 'precos_inseridos', 'precos_confirmados',
                                                     'precos_reaproveitados', 'eventos_repetidos', 'eans_gravados')}
                try:
                    # Savepoint por registro: um conflito não desfaz os demais preços da rede.
                    with conn.transaction():
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
                        if existente or aprovado:
                            if sincronizar_codigo_barras(cur, produto_id, row['produto']['codigo_barras']):
                                resumo['eans_gravados'] += 1
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
                        preco_id, desfecho = gravar_preco_na_loja(
                            cur, loja_id=loja_id, produto_id=produto_id, mercado_id=mercado_id,
                            valor=row['valor'], instante=row['instante'].replace(tzinfo=None),
                            origem=origem, nome_bruto=row['produto']['nome'])
                        cur.execute('INSERT INTO smartmarket_ingest.event(source,store,external_id,collected_at,payload_hash,preco_id,run_id) VALUES(%s,%s,%s,%s,%s,%s,%s)',
                                    (*key,row['instante'],row['hash'],preco_id,run_id))
                        resumo[desfecho] += 1
                except ErroIngestao as exc:
                    if str(exc) not in MOTIVOS_QUARENTENA_BANCO:
                        raise
                    resumo.update(contadores)
                    rejeitados.append({'indice': row['indice'], 'id_produto_origem': row['external_id'],
                                       'nome_bruto': row['produto']['nome'], 'motivo': str(exc), 'etapa': 'banco'})
            verificar_limiar()  # rejeição tardia acima do limiar: sai e reverte o lote todo
    resumo['rejeitados'] = rejeitados
    if rejeitados:
        resumo['pendencias_revisao'] = [r for r in rejeitados if r['motivo'] in MOTIVOS_QUARENTENA_BANCO]
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
