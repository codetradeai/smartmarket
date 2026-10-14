"""Só executa com DSN local explícito; cria outra base descartável, sem DROP."""
import json
import os
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch
import unittest
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pipeline import carregar, validar_dsn, ErroIngestao
from test_normalizacao_pipeline import registro

DSN = os.environ.get('SMARTMARKET_TEST_DSN')


@unittest.skipUnless(DSN, 'Defina SMARTMARKET_TEST_DSN para integração PostgreSQL local')
class PostgresTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import psycopg
        from psycopg import sql
        from psycopg.conninfo import make_conninfo
        cls.psycopg = psycopg
        config = validar_dsn(DSN)
        dbname = 'smartmarket_fixture_' + uuid4().hex[:12]
        with psycopg.connect(**config, autocommit=True) as conn:
            conn.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(dbname)))
        config['dbname'] = dbname
        cls.dsn = make_conninfo(**config)
        ddl = (Path(__file__).resolve().parents[2] / 'backend/smartmarket_ddl_updated.sql').read_text()
        # O script da equipe contém DROP. Aplicar SOMENTE CREATE na base nova.
        ddl = '\n'.join(line for line in ddl.splitlines() if not line.lstrip().upper().startswith('DROP '))
        with psycopg.connect(cls.dsn) as conn:
            conn.execute(ddl)
        print('Banco de evidência isolado:', dbname)

    def setUp(self):
        self.source = 'fixture_' + uuid4().hex[:10]
        self.run = 'run_' + uuid4().hex
        with self.psycopg.connect(self.dsn) as conn:
            self.market = conn.execute('INSERT INTO mercado(nome) VALUES(%s) RETURNING id', (self.source,)).fetchone()[0]

    def load(self, rows=None, **changes):
        args = dict(dsn=self.dsn,source=self.source,store='loja_teste',mercado_id=self.market,run_id=self.run)
        args.update(changes)
        return carregar(rows if rows is not None else [registro()], **args)

    def count_prices(self):
        with self.psycopg.connect(self.dsn) as conn:
            return conn.execute('SELECT count(*) FROM preco WHERE mercado_id=%s',(self.market,)).fetchone()[0]

    def test_01_carga_e_reexecucao_mesmo_run(self):
        first = self.load()
        self.assertEqual((first['produtos_criados'],first['precos_inseridos']),(1,1))
        self.assertTrue(self.load()['reexecucao'])
        self.assertEqual(self.count_prices(),1)

    def test_02_evento_repetido_em_outro_run_nao_duplica(self):
        self.load()
        result = self.load(run_id=self.run+'2')
        self.assertEqual(result['eventos_repetidos'],1)
        self.assertEqual(self.count_prices(),1)

    def test_03_mudanca_preco_preserva_historico(self):
        self.load()
        result = self.load([registro(preco=9,data_coleta='2026-10-05T13:00:00+00:00')],run_id=self.run+'2')
        self.assertEqual(result['produtos_criados'],0)
        self.assertEqual(self.count_prices(),2)

    def test_04_mesmo_run_conteudo_diferente_rejeitado(self):
        self.load()
        with self.assertRaises(ErroIngestao): self.load([registro(preco=9)])
        self.assertEqual(self.count_prices(),1)

    def test_05_conflito_tardio_reverte_lote_todo(self):
        self.load()
        with self.assertRaises(ErroIngestao):
            self.load([registro(id_produto_origem='novo'),registro(preco=9)],run_id=self.run+'2')
        self.assertEqual(self.count_prices(),1)
        with self.psycopg.connect(self.dsn) as conn:
            count=conn.execute('SELECT count(*) FROM smartmarket_ingest.source_product WHERE source=%s AND external_id=%s',(self.source,'novo')).fetchone()[0]
        self.assertEqual(count,0)

    def test_06_duas_fontes_sem_mapeamento_nao_fundem_produtos(self):
        self.load()
        result = self.load(source=self.source+'b',run_id=self.run+'2')
        self.assertEqual(result['produtos_criados'],1)

    def test_07_mapeamento_explicito_reusa_produto(self):
        self.load()
        with self.psycopg.connect(self.dsn) as conn:
            product=conn.execute('SELECT produto_id FROM smartmarket_ingest.source_product WHERE source=%s',(self.source,)).fetchone()[0]
        with self.psycopg.connect(self.dsn) as conn:
            market_b=conn.execute('INSERT INTO mercado(nome) VALUES(%s) RETURNING id',('Segunda fonte sintética',)).fetchone()[0]
        result=self.load(source=self.source+'b',mercado_id=market_b,run_id=self.run+'2',mapeamento={'sku-1':product})
        self.assertEqual(result['produtos_criados'],0)
        self.assertEqual(self.count_prices(),1)
        with self.psycopg.connect(self.dsn) as conn:
            self.assertEqual(conn.execute('SELECT count(DISTINCT mercado_id) FROM preco WHERE produto_id=%s',(product,)).fetchone()[0],2)

    def test_08_concorrencia_nao_duplica(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda _: self.load(), range(2)))
        self.assertEqual(sum(r['precos_inseridos'] for r in results),1)
        self.assertEqual(self.count_prices(),1)

    def test_09_mercado_inexistente_reverte_run(self):
        with self.assertRaises(ErroIngestao): self.load(mercado_id=99999999)
        self.assertEqual(self.count_prices(),0)

    def test_10_loja_nao_pode_mudar_de_mercado(self):
        self.load()
        with self.assertRaises(ErroIngestao): self.load(mercado_id=self.market+999,run_id=self.run+'2')
        self.assertEqual(self.count_prices(),1)

    def test_11_sql_em_nome_e_parametrizado(self):
        self.load([registro(nome_bruto="Arroz'); DROP TABLE produto; -- 1kg")])
        with self.psycopg.connect(self.dsn) as conn:
            self.assertIsNotNone(conn.execute("SELECT to_regclass('produto')").fetchone()[0])
        self.assertEqual(self.count_prices(),1)

    def test_12_preco_e_timestamp_no_ddl_da_equipe(self):
        self.load()
        with self.psycopg.connect(self.dsn) as conn:
            price, timestamp=conn.execute('SELECT valor,coletado_em FROM preco WHERE mercado_id=%s',(self.market,)).fetchone()
        self.assertEqual(str(price),'10.50')
        self.assertEqual(timestamp.isoformat(),'2026-10-04T13:00:00')

    def test_13_bloqueia_dsn_remoto_e_base_existente_padrao(self):
        for dsn in ['host=example.com dbname=smartmarket_fixture_x','host=localhost dbname=smartmarket',
                    'dbname=smartmarket_fixture_x','host=/tmp,example.com dbname=smartmarket_fixture_x']:
            with self.subTest(dsn=dsn), self.assertRaises(ErroIngestao): validar_dsn(dsn)

    def test_14_pipeline_automatico_reusa_checkpoint(self):
        from executar_pipeline import executar
        fixture = Path(__file__).parent / 'fixtures/fort_valido.json'
        with tempfile.TemporaryDirectory() as directory, patch('coleta_fort_atacadista.STORE_ID',self.source):
            first = executar(fixture=fixture,output_root=directory,run_id=self.run,dsn=self.dsn,mercado_id=self.market)
            self.assertEqual(first['precos_inseridos'],3)
            with patch('coleta_fort_atacadista.main',side_effect=AssertionError('nao_recoletar')):
                second = executar(fixture=fixture,output_root=directory,run_id=self.run,dsn=self.dsn,mercado_id=self.market)
            self.assertTrue(second['reexecucao'])
            self.assertEqual(self.count_prices(),3)

    def test_15_pipeline_parcial_nao_carrega(self):
        from executar_pipeline import executar
        fixture = Path(__file__).parent / 'fixtures/fort_parcial.json'
        with tempfile.TemporaryDirectory() as directory, patch('coleta_fort_atacadista.STORE_ID',self.source), self.assertRaises(ErroIngestao):
            executar(fixture=fixture,output_root=directory,run_id=self.run,dsn=self.dsn,mercado_id=self.market)
        self.assertEqual(self.count_prices(),0)

    def test_16_pipeline_checkpoint_adulterado_rejeitado(self):
        from executar_pipeline import executar
        fixture = Path(__file__).parent / 'fixtures/fort_valido.json'
        with tempfile.TemporaryDirectory() as directory, patch('coleta_fort_atacadista.STORE_ID',self.source):
            executar(fixture=fixture,output_root=directory,run_id=self.run,dsn=self.dsn,mercado_id=self.market)
            (Path(directory) / self.run / 'produtos_coletados.json').write_text('[]')
            with self.assertRaises(ErroIngestao):
                executar(fixture=fixture,output_root=directory,run_id=self.run,dsn=self.dsn,mercado_id=self.market)
        self.assertEqual(self.count_prices(),3)

    def test_17_pipeline_novo_run_nova_coleta(self):
        # Demonstra que tempo é preservado no replay, mas um novo instante
        # representa nova observação histórica, mesmo se o preço não mudou.
        self.load()
        self.load([registro(data_coleta='2026-10-06T13:00:00+00:00')],run_id=self.run+'2')
        self.assertEqual(self.count_prices(),2)

    def test_18_preparacao_cria_base_nova_sem_reinicializar_existente(self):
        from preparar_banco_fixture import preparar_banco
        from psycopg.conninfo import conninfo_to_dict, make_conninfo
        name = 'smartmarket_fixture_setup_' + uuid4().hex[:8]
        self.assertEqual(preparar_banco(self.dsn,name),name)
        cfg=conninfo_to_dict(self.dsn)
        cfg['dbname']=name
        with self.psycopg.connect(**cfg) as conn:
            self.assertEqual(conn.execute('SELECT count(*) FROM mercado').fetchone()[0],3)
        with self.assertRaises(self.psycopg.errors.DuplicateDatabase):
            preparar_banco(self.dsn,name)
        with self.psycopg.connect(**cfg) as conn:
            self.assertEqual(conn.execute('SELECT count(*) FROM mercado').fetchone()[0],3)
