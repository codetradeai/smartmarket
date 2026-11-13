"""Vínculo preço x loja e carga de lojas em PostgreSQL local descartável (nunca o Neon).

Só executa com SMARTMARKET_TEST_DSN apontando para um PostgreSQL local cujo banco se chama
``smartmarket_fixture_*``; cada classe cria a própria base nova e aplica só os CREATE do DDL da equipe
(que já inclui loja, preco_loja e as travas do 07). Ver backend/deploy/test_lojas_postgres.sh para
o fluxo com a migration 06/07 sobre o schema de deploy.
"""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from carregar_lojas import carregar_lojas
from pipeline import ErroIngestao, carregar, validar_dsn
from rotina_carga import atualizar_indisponibilidade_produtos
from test_normalizacao_pipeline import registro

DSN = os.environ.get('SMARTMARKET_TEST_DSN')
T1 = '2026-10-04T10:00:00-03:00'  # 13:00 UTC
T2 = '2026-10-05T10:00:00-03:00'
T3 = '2026-10-06T10:00:00-03:00'
T0 = '2026-10-03T10:00:00-03:00'


def criar_banco_descartavel():
    import psycopg
    from psycopg import sql
    from psycopg.conninfo import make_conninfo
    config = validar_dsn(DSN)
    dbname = 'smartmarket_fixture_' + uuid4().hex[:12]
    with psycopg.connect(**config, autocommit=True) as conn:
        conn.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(dbname)))
    config['dbname'] = dbname
    dsn = make_conninfo(**config)
    ddl = (Path(__file__).resolve().parents[2] / 'backend/database/smartmarket_ddl_finalizado.sql').read_text(encoding='utf-8')
    ddl = '\n'.join(line for line in ddl.splitlines() if not line.lstrip().upper().startswith('DROP '))
    with psycopg.connect(dsn) as conn:
        conn.execute(ddl)
    return dsn


@unittest.skipUnless(DSN, 'Defina SMARTMARKET_TEST_DSN para integração PostgreSQL local')
class VinculoPrecoLojaTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import psycopg
        cls.psycopg = psycopg
        cls.dsn = criar_banco_descartavel()

    def setUp(self):
        self.source = 'fixture_' + uuid4().hex[:10]
        self.n = 0
        with self.psycopg.connect(self.dsn) as conn:
            self.market = conn.execute('INSERT INTO mercado(nome) VALUES(%s) RETURNING id', (self.source,)).fetchone()[0]

    def load(self, rows, **changes):
        self.n += 1
        args = dict(dsn=self.dsn, source=self.source, store='loja_teste', mercado_id=self.market,
                    run_id=f'run_{uuid4().hex}')
        args.update(changes)
        return carregar(rows, **args)

    def consulta(self, sql, *params):
        with self.psycopg.connect(self.dsn) as conn:
            return conn.execute(sql, params).fetchall()

    def vinculos(self):
        return self.consulta(
            'SELECT pl.preco_id, pl.produto_id, pl.disponivel, pl.vigente_desde, pl.vigente_ate, pl.confirmado_em, p.valor '
            'FROM preco_loja pl JOIN preco p ON p.id = pl.preco_id WHERE p.mercado_id=%s ORDER BY pl.id', self.market)

    def n_precos(self):
        return self.consulta('SELECT count(*) FROM preco WHERE mercado_id=%s', self.market)[0][0]

    def abertos(self):
        return [v for v in self.vinculos() if v[4] is None]

    def test_01_primeira_carga_cria_loja_padrao_preco_e_vinculo_com_produto_id(self):
        resumo = self.load([registro(data_coleta=T1)])

        self.assertEqual((resumo['precos_inseridos'], resumo['precos_confirmados']), (1, 0))
        lojas = self.consulta('SELECT codigo_externo, nome FROM loja WHERE mercado_id=%s', self.market)
        self.assertEqual(lojas, [('padrao', self.source)])
        (preco_id, produto_id, disponivel, desde, ate, confirmado, valor), = self.vinculos()
        self.assertEqual(self.consulta('SELECT produto_id FROM preco WHERE id=%s', preco_id)[0][0], produto_id)
        self.assertTrue(disponivel)
        self.assertIsNone(ate)
        self.assertEqual((desde, confirmado), (desde, desde))
        self.assertEqual(valor, Decimal('10.50'))

    def test_02_mesmo_valor_so_confirma_sem_linha_nova(self):
        self.load([registro(data_coleta=T1)])
        antes = self.vinculos()[0]

        resumo = self.load([registro(data_coleta=T2)])

        self.assertEqual((resumo['precos_inseridos'], resumo['precos_confirmados']), (0, 1))
        self.assertEqual(self.n_precos(), 1)
        (preco_id, _, _, desde, ate, confirmado, _), = self.vinculos()
        self.assertEqual((preco_id, desde, ate), (antes[0], antes[3], None))
        self.assertGreater(confirmado, antes[5])
        eventos = self.consulta('SELECT count(DISTINCT preco_id), count(*) FROM smartmarket_ingest.event WHERE source=%s',
                                self.source)
        self.assertEqual(eventos, [(1, 2)])  # dois eventos, os dois apontam para o mesmo preco

    def test_03_valor_mudou_fecha_o_vinculo_antigo_e_abre_o_novo(self):
        self.load([registro(data_coleta=T1)])

        resumo = self.load([registro(preco=9, data_coleta=T2)])

        self.assertEqual(resumo['precos_inseridos'], 1)
        self.assertEqual(self.n_precos(), 2)
        antigo, novo = self.vinculos()
        self.assertEqual((antigo[6], novo[6]), (Decimal('10.50'), Decimal('9.00')))
        self.assertEqual(antigo[4], novo[3])  # vigente_ate do antigo == vigente_desde do novo
        self.assertIsNone(novo[4])
        self.assertEqual(len(self.abertos()), 1)

    def test_04_valor_que_volta_gera_nova_linha_no_historico(self):
        self.load([registro(data_coleta=T1)])
        self.load([registro(preco=9, data_coleta=T2)])

        self.load([registro(data_coleta=T3)])

        self.assertEqual(self.n_precos(), 3)
        self.assertEqual(len(self.vinculos()), 3)
        self.assertEqual([v[6] for v in self.abertos()], [Decimal('10.50')])

    def test_05_coleta_anterior_ao_vinculo_vigente_vai_para_quarentena(self):
        self.load([registro(data_coleta=T2)])
        linhas = [registro(preco=7, data_coleta=T0)] + [
            registro(id_produto_origem=f'sku-{i}', nome_bruto=f'Produto {i} 1kg', data_coleta=T3) for i in range(2, 7)]

        resumo = self.load(linhas)

        self.assertEqual([r['motivo'] for r in resumo['rejeitados']], ['coleta_mais_antiga_que_vinculo_vigente'])
        self.assertEqual(resumo['precos_inseridos'], 5)
        self.assertEqual(len(self.abertos()), 6)
        self.assertEqual(self.consulta(
            "SELECT valor FROM preco p JOIN preco_loja pl ON pl.preco_id = p.id JOIN smartmarket_ingest.source_product sp "
            "ON sp.produto_id = pl.produto_id WHERE sp.source=%s AND sp.external_id='sku-1'", self.source),
            [(Decimal('10.50'),)])

    def test_06_indisponivel_por_loja_e_volta_disponivel_com_o_mesmo_valor(self):
        self.load([registro(data_coleta=T1), registro(id_produto_origem='sku-2', nome_bruto='Produto 2 1kg', data_coleta=T1)])
        agora = self.psycopg.connect(self.dsn)
        with agora as conn:
            atualizar_indisponibilidade_produtos(conn, self.source, 'loja_teste', self.market, {'sku-2'})

        indisponiveis = [v for v in self.abertos() if not v[2]]
        self.assertEqual(len(indisponiveis), 1)  # so o sku-1, que nao veio na coleta
        self.assertEqual(len(self.abertos()), 2)
        self.assertEqual(len(self.vinculos()), 3)  # o vinculo antigo ficou fechado como historico
        precos_antes = self.n_precos()

        # A indisponibilidade carimba o relogio real: a recoleta so pode ser posterior a ela.
        depois = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        resumo = self.load([registro(data_coleta=depois)])

        self.assertEqual((resumo['precos_reaproveitados'], resumo['precos_inseridos']), (1, 0))
        self.assertEqual(self.n_precos(), precos_antes)
        self.assertEqual(len([v for v in self.abertos() if not v[2]]), 0)
        self.assertEqual(len(self.vinculos()), 4)

    def test_07_indisponibilidade_de_uma_loja_nao_afeta_outra_loja_do_mesmo_mercado(self):
        self.load([registro(data_coleta=T1)])
        (preco_id, produto_id, *_), = self.vinculos()
        with self.psycopg.connect(self.dsn) as conn:
            loja2 = conn.execute("INSERT INTO loja(mercado_id, nome, codigo_externo) VALUES(%s,'Filial 2','f2') RETURNING id",
                                 (self.market,)).fetchone()[0]
            conn.execute('INSERT INTO preco_loja(preco_id, produto_id, loja_id, vigente_desde, confirmado_em) '
                         'VALUES(%s,%s,%s,now(),now())', (preco_id, produto_id, loja2))
        with self.psycopg.connect(self.dsn) as conn:
            atualizar_indisponibilidade_produtos(conn, self.source, 'loja_teste', self.market, set())

        por_loja = dict(self.consulta('SELECT loja_id, disponivel FROM preco_loja WHERE vigente_ate IS NULL '
                                      'AND produto_id=%s', produto_id))
        self.assertEqual(por_loja[loja2], True)
        self.assertEqual(sorted(por_loja.values()), [False, True])

    def test_08_reaproveita_preco_vigente_em_outra_loja_do_mesmo_mercado(self):
        self.load([registro(data_coleta=T1)])
        (p1, produto_id, *_), = self.vinculos()
        with self.psycopg.connect(self.dsn) as conn:
            loja2 = conn.execute("INSERT INTO loja(mercado_id, nome, codigo_externo) VALUES(%s,'Filial 2','f2') RETURNING id",
                                 (self.market,)).fetchone()[0]
            conn.execute('INSERT INTO preco_loja(preco_id, produto_id, loja_id, vigente_desde, confirmado_em) '
                         'VALUES(%s,%s,%s,now(),now())', (p1, produto_id, loja2))
        self.load([registro(preco=9, data_coleta=T2)])
        self.assertEqual(self.n_precos(), 2)

        resumo = self.load([registro(data_coleta=T3)])  # volta a 10,50: a Filial 2 ainda o pratica

        self.assertEqual((resumo['precos_reaproveitados'], resumo['precos_inseridos']), (1, 0))
        self.assertEqual(self.n_precos(), 2)

    def test_09_travas_do_ddl_recusam_dois_vigentes_e_produto_id_divergente(self):
        self.load([registro(data_coleta=T1)])
        (preco_id, produto_id, *_), = self.vinculos()
        loja = self.consulta('SELECT id FROM loja WHERE mercado_id=%s', self.market)[0][0]
        with self.psycopg.connect(self.dsn) as conn:
            outro = conn.execute("INSERT INTO produto(nome) VALUES('outro') RETURNING id").fetchone()[0]
        with self.assertRaises(self.psycopg.errors.UniqueViolation), self.psycopg.connect(self.dsn) as conn:
            conn.execute('INSERT INTO preco_loja(preco_id, produto_id, loja_id, vigente_desde, confirmado_em) '
                         'VALUES(%s,%s,%s,now(),now())', (preco_id, produto_id, loja))
        with self.assertRaises(self.psycopg.errors.ForeignKeyViolation), self.psycopg.connect(self.dsn) as conn:
            conn.execute('INSERT INTO preco_loja(preco_id, produto_id, loja_id, vigente_desde, vigente_ate, confirmado_em) '
                         'VALUES(%s,%s,%s,now(),now(),now())', (preco_id, outro, loja))

    def test_10_reexecucao_do_mesmo_run_nao_muda_vinculos(self):
        rows = [registro(data_coleta=T1)]
        self.load(rows, run_id='run_fixo')
        antes = self.vinculos()

        self.assertTrue(self.load(rows, run_id='run_fixo')['reexecucao'])

        self.assertEqual(self.vinculos(), antes)

    def test_11_apagar_preco_apaga_o_vinculo(self):
        self.load([registro(data_coleta=T1)])
        (preco_id, *_), = self.vinculos()
        with self.psycopg.connect(self.dsn) as conn:
            conn.execute('DELETE FROM smartmarket_ingest.event WHERE preco_id=%s', (preco_id,))
            conn.execute('DELETE FROM preco WHERE id=%s', (preco_id,))
        self.assertEqual(self.vinculos(), [])


@unittest.skipUnless(DSN, 'Defina SMARTMARKET_TEST_DSN para integração PostgreSQL local')
class CarregarLojasPostgresTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import psycopg
        cls.psycopg = psycopg
        cls.dsn = criar_banco_descartavel()
        with psycopg.connect(cls.dsn) as conn:  # ids da rotina: asun = 3, atacadao = 4
            conn.execute("INSERT INTO mercado(id, nome) VALUES (3, 'Asun'), (4, 'Atacadao')")

    LOJA = {'mercado': 'asun', 'nome': 'Asun Cavalhada', 'endereco': 'Av. Cavalhada, 2985', 'cidade': 'Porto Alegre',
            'uf': 'RS', 'cep': '91740001', 'codigo_externo': '1540', 'latitude': -30.1026, 'longitude': -51.2312}

    def lojas(self):
        with self.psycopg.connect(self.dsn) as conn:
            return conn.execute('SELECT mercado_id, codigo_externo, nome, latitude, ativa FROM loja ORDER BY id').fetchall()

    def test_01_upsert_idempotente_e_nao_cria_loja_padrao(self):
        primeira = carregar_lojas([self.LOJA], dsn=self.dsn)
        segunda = carregar_lojas([self.LOJA], dsn=self.dsn)

        self.assertEqual(primeira, {'inseridas': 1, 'atualizadas': 0})
        self.assertEqual(segunda, {'inseridas': 0, 'atualizadas': 1})
        self.assertEqual([l for l in self.lojas() if l[1] == '1540'], [(3, '1540', 'Asun Cavalhada', -30.1026, True)])
        self.assertEqual([l for l in self.lojas() if l[1] == 'padrao'], [])

    def test_02_atualiza_dados_sem_apagar_coordenada_nem_reativar_loja(self):
        carregar_lojas([self.LOJA], dsn=self.dsn)
        with self.psycopg.connect(self.dsn) as conn:
            conn.execute("UPDATE loja SET ativa=FALSE WHERE codigo_externo='1540'")

        carregar_lojas([{**self.LOJA, 'nome': 'Asun Cavalhada (renomeada)', 'latitude': None, 'longitude': None}],
                       dsn=self.dsn)

        (_, _, nome, latitude, ativa), = [l for l in self.lojas() if l[1] == '1540']
        self.assertEqual((nome, latitude, ativa), ('Asun Cavalhada (renomeada)', -30.1026, False))

    def test_03_mercado_nao_cadastrado_e_recusado_e_nada_e_gravado(self):
        antes = self.lojas()
        with self.assertRaisesRegex(ErroIngestao, 'mercado_nao_cadastrado'):
            carregar_lojas([{**self.LOJA, 'codigo_externo': '9', 'mercado': 'master'}], dsn=self.dsn)
        self.assertEqual(self.lojas(), antes)

    def test_04_dois_mercados_podem_ter_o_mesmo_codigo_externo(self):
        carregar_lojas([{**self.LOJA, 'codigo_externo': '77'}, {**self.LOJA, 'mercado': 'atacadao', 'codigo_externo': '77'}],
                       dsn=self.dsn)
        self.assertEqual(sorted(l[0] for l in self.lojas() if l[1] == '77'), [3, 4])

    def test_05_recusa_dsn_de_banco_que_nao_e_descartavel(self):
        with self.assertRaises(ErroIngestao):
            carregar_lojas([self.LOJA], dsn='host=localhost dbname=smartmarket')


@unittest.skipUnless(DSN, 'Defina SMARTMARKET_TEST_DSN para integração PostgreSQL local')
class SqlFiliais08Test(unittest.TestCase):
    """O 08_lojas_filiais.sql gerado, aplicado como o responsável o aplicaria (mas num banco descartável)."""

    MERCADOS = ((1, 'Fort Atacadista'), (3, 'Asun Supermercados'), (6, 'Zaffari / Bourbon'))

    @classmethod
    def setUpClass(cls):
        import psycopg
        import gerar_sql_lojas
        from carregar_lojas import ler_lojas
        cls.psycopg = psycopg
        cls.sql = gerar_sql_lojas.gerar_sql(ler_lojas(), data='2026-11-12')
        cls.dsn = criar_banco_descartavel()

    def setUp(self):
        with self.psycopg.connect(self.dsn) as conn:
            conn.execute('TRUNCATE loja, mercado CASCADE')
            for mid, nome in self.MERCADOS:
                conn.execute('INSERT INTO mercado(id, nome) VALUES(%s,%s)', (mid, nome))
                conn.execute("INSERT INTO loja(mercado_id, nome, codigo_externo) VALUES(%s,%s,'padrao')", (mid, nome))

    def aplicar(self):
        with self.psycopg.connect(self.dsn, autocommit=True) as conn:
            conn.execute(self.sql)

    def lojas(self):
        with self.psycopg.connect(self.dsn) as conn:
            return conn.execute('SELECT mercado_id, codigo_externo, nome, endereco, cidade, uf, cep, latitude, longitude, ativa '
                                'FROM loja ORDER BY mercado_id, codigo_externo').fetchall()

    def test_01_aplicar_duas_vezes_deixa_as_mesmas_82_lojas_e_a_padrao_intacta(self):
        self.aplicar()
        primeira = self.lojas()
        self.aplicar()

        self.assertEqual(self.lojas(), primeira)
        reais = [l for l in primeira if l[1] != 'padrao']
        self.assertEqual(len(reais), 82)
        self.assertEqual(sorted(l[0] for l in primeira if l[1] == 'padrao'), [1, 3, 6])

    def test_02_nao_reativa_loja_desativada_e_atualiza_so_os_dados(self):
        self.aplicar()
        with self.psycopg.connect(self.dsn) as conn:
            conn.execute("UPDATE loja SET ativa=FALSE, nome='nome velho' WHERE codigo_externo='zaffari-anita-garibaldi'")
        self.aplicar()
        (loja,) = [l for l in self.lojas() if l[1] == 'zaffari-anita-garibaldi']
        self.assertEqual((loja[2], loja[9]), ('Zaffari Anita Garibaldi', False))

    def test_03_apostrofo_chega_ao_banco_intacto_e_loja_sem_cep_fica_null(self):
        self.aplicar()
        por_codigo = {l[1]: l for l in self.lojas()}
        self.assertEqual(por_codigo['zaffari-anita-garibaldi'][3], "Rua Anita Garibaldi, 536 - Mont'Serrat")
        self.assertIsNone(por_codigo['asun-guaiba'][6])
        self.assertIsNone(por_codigo['asun-guaiba'][7])

    def test_04_mercado_com_nome_errado_aborta_sem_inserir_nada(self):
        with self.psycopg.connect(self.dsn) as conn:
            conn.execute("UPDATE mercado SET nome='Outra Rede' WHERE id=3")
        antes = self.lojas()
        with self.assertRaisesRegex(self.psycopg.errors.RaiseException, 'mercado 3'):
            self.aplicar()
        self.assertEqual(self.lojas(), antes)

    def test_05_mercado_inexistente_aborta_sem_inserir_nada(self):
        with self.psycopg.connect(self.dsn) as conn:
            conn.execute('TRUNCATE loja, mercado CASCADE')
            for mid, nome in self.MERCADOS[:2]:
                conn.execute('INSERT INTO mercado(id, nome) VALUES(%s,%s)', (mid, nome))
        antes = self.lojas()
        with self.assertRaisesRegex(self.psycopg.errors.RaiseException, 'mercado 6'):
            self.aplicar()
        self.assertEqual(self.lojas(), antes)


if __name__ == '__main__':
    unittest.main()
