"""Regressões identificadas na revisão; sem rede e com PostgreSQL descartável."""
from datetime import datetime, timezone
from decimal import Decimal
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import coleta_fort_atacadista as fort
from normalizacao import normalizar_produto
from pipeline import preparar, ErroIngestao
import test_pipeline_postgres as base
from test_normalizacao_pipeline import registro

FIXTURES = Path(__file__).parent / 'fixtures'
INSTANTE = datetime(2026, 10, 4, 13, tzinfo=timezone.utc)


class RevisaoOfflineTest(unittest.TestCase):
    def test_decimal_nao_pode_ser_arredondado_antes_do_json(self):
        for valor in ['1.0000000000000001', '9007199254740993', '0.10000000000000001']:
            with self.subTest(valor=valor), self.assertRaisesRegex(ValueError, 'perde_precisao'):
                fort.preco_positivo(Decimal(valor))
        self.assertEqual(fort.preco_positivo(Decimal('0.10')), 0.1)

    def test_fixture_preserva_token_decimal_antes_de_validar(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'precisao.json'
            path.write_text('{"1815215":[{"hits":[{"name":"Arroz", "pricing":{"price":1.0000000000000001}}]}]}')
            pagina = fort.carregar_fixture(path)('https://example.invalid/1815215', headers={}, params={'from':0}, timeout=10)
            item = pagina['hits'][0]
            self.assertEqual(item['pricing']['price'], Decimal('1.0000000000000001'))
            with self.assertRaisesRegex(ValueError, 'perde_precisao'):
                fort.transformar_item(item, 'Graos', INSTANTE)

    def test_http_simulado_preserva_token_decimal(self):
        class RequestError(Exception): pass
        response = Mock()
        response.json.side_effect = lambda **kwargs: json.loads('{"price":1.0000000000000001}', **kwargs)
        requests = types.SimpleNamespace(RequestException=RequestError, get=Mock(return_value=response))
        with patch.dict(sys.modules, {'requests':requests}):
            payload = fort.buscar_pagina('https://example.invalid', headers={},params={},timeout=10)
        self.assertEqual(payload['price'], Decimal('1.0000000000000001'))
        response.json.assert_called_once_with(parse_float=Decimal)

    def test_metadados_invalidos_rejeitados_por_item(self):
        for campo,valor in [('brandName',Decimal('1.1')),('slug',[]),('id',Decimal('1.2'))]:
            item={'name':'Arroz','pricing':{'price':10},campo:valor}
            with self.subTest(campo=campo), self.assertRaises(ValueError):
                fort.transformar_item(item,'Graos',INSTANTE)

    def test_moeda_declarada_nao_pode_ser_descartada(self):
        for local in ['item','pricing']:
            item={'name':'Arroz','pricing':{'price':10}}
            (item if local == 'item' else item['pricing'])['currency']='USD'
            with self.subTest(local=local), self.assertRaisesRegex(ValueError,'moeda'):
                fort.transformar_item(item,'Graos',INSTANTE)
        falhas=[]
        buscar=Mock(return_value={'currency':'USD','hits':[{'name':'Arroz','pricing':{'price':10}}]})
        with self.assertLogs(fort.LOGGER,level='WARNING'):
            result=fort.coletar_categoria('Graos','1815215',buscar=buscar,falhas=falhas,dormir=lambda _:None)
        self.assertFalse(result)
        self.assertIn('moeda',falhas[0]['motivo'])

    def test_carga_rejeita_moeda_incompativel(self):
        for moeda in ['USD','EUR',None,'R$']:
            with self.subTest(moeda=moeda), self.assertRaisesRegex(ErroIngestao,'moeda'):
                preparar([registro(moeda=moeda)])

    def test_medidas_ambiguas_nao_sao_adivinhadas(self):
        for nome in ['Farinha Exemplo 1.000 g','Farinha Exemplo 1,000 g',
                     'Leite Exemplo 6 unidades de 1 L','Leite 6 garrafas de 1L',
                     'Arroz -1kg','Arroz +1kg','Arroz - 1kg','Arroz −1kg']:
            with self.subTest(nome=nome):
                normal=normalizar_produto(registro(nome_bruto=nome))
                self.assertIsNone(normal['quantidade'])
                self.assertIsNone(normal['unidade'])
                self.assertTrue(normal['pendencias'])

    def test_hash_canonico_de_valor_id_e_instante(self):
        a=preparar([registro(id_produto_origem=1,preco='10.50',preco_normal='12.00')])[0]
        b=preparar([registro(id_produto_origem='1',preco=Decimal('10.500'),preco_normal=12,
                            moeda='BRL',data_coleta='2026-10-04T13:00:00Z')])[0]
        self.assertEqual(a['hash'],b['hash'])
        self.assertEqual(a['instante'],b['instante'])


@unittest.skipUnless(base.DSN, 'Defina SMARTMARKET_TEST_DSN para revisão PostgreSQL local')
class RevisaoPostgresTest(unittest.TestCase):
    # Reusa somente helpers; não herda/duplica os casos da suite original.
    setUpClass = classmethod(base.PostgresTest.setUpClass.__func__)
    setUp = base.PostgresTest.setUp
    load = base.PostgresTest.load
    count_prices = base.PostgresTest.count_prices

    def test_01_replay_semantico_e_ordem_do_lote(self):
        rows=[registro(id_produto_origem=1),registro(id_produto_origem=2)]
        self.load(rows)
        equivalente=[registro(id_produto_origem='2',preco='10.500',data_coleta='2026-10-04T13:00:00Z'),
                     registro(id_produto_origem='1',preco=10.5,data_coleta='2026-10-04T13:00:00+00:00')]
        self.assertTrue(self.load(equivalente)['reexecucao'])
        outra_execucao=self.load(equivalente,run_id=self.run+'2')
        self.assertEqual(outra_execucao['eventos_repetidos'],2)
        self.assertEqual(self.count_prices(),2)

    def test_02_replay_preserva_pendencias(self):
        first=self.load([registro(marca=None)])
        second=self.load([registro(marca=None)])
        self.assertTrue(first['pendencias'])
        self.assertEqual(first['pendencias'],second['pendencias'])
        self.assertTrue(second['reexecucao'])

    def test_03_falha_antes_da_carga_reusa_checkpoint(self):
        from executar_pipeline import executar
        with tempfile.TemporaryDirectory() as directory, patch.object(fort,'STORE_ID',self.source):
            args=dict(fixture=FIXTURES/'fort_valido.json',output_root=directory,
                      run_id=self.run,dsn=self.dsn,mercado_id=self.market)
            with patch('executar_pipeline.carregar',side_effect=ErroIngestao('falha_simulada')), self.assertRaises(ErroIngestao):
                executar(**args)
            self.assertEqual(self.count_prices(),0)
            checkpoint=Path(directory)/self.run/'extracao_concluida.json'
            self.assertTrue(checkpoint.exists())
            with patch.object(fort,'main',side_effect=AssertionError('recoleta_proibida')):
                result=executar(**args)
            self.assertEqual(result['precos_inseridos'],3)

    def test_04_falha_de_relatorio_apos_commit_nao_duplica(self):
        from executar_pipeline import executar
        original=fort.salvar_atomico
        def escrita(caminho,escrever):
            if Path(caminho).name=='resultado_carga.json':
                raise OSError('interrupcao_simulada_apos_commit')
            return original(caminho,escrever)
        with tempfile.TemporaryDirectory() as directory, patch.object(fort,'STORE_ID',self.source):
            args=dict(fixture=FIXTURES/'fort_valido.json',output_root=directory,
                      run_id=self.run,dsn=self.dsn,mercado_id=self.market)
            with patch.object(fort,'salvar_atomico',side_effect=escrita),self.assertRaises(OSError):
                executar(**args)
            self.assertEqual(self.count_prices(),3)
            with patch.object(fort,'main',side_effect=AssertionError('recoleta_proibida')):
                replay=executar(**args)
            self.assertTrue(replay['reexecucao'])
            self.assertTrue(replay['pendencias'])
            self.assertEqual(self.count_prices(),3)
            self.assertTrue((Path(directory)/self.run/'resultado_carga.json').exists())

    def test_05_parcial_repetido_nao_confirma_checkpoint(self):
        from executar_pipeline import executar
        with tempfile.TemporaryDirectory() as directory,patch.object(fort,'STORE_ID',self.source):
            args=dict(fixture=FIXTURES/'fort_parcial.json',output_root=directory,
                      run_id=self.run,dsn=self.dsn,mercado_id=self.market)
            for _ in range(2):
                with self.assertRaisesRegex(ErroIngestao,'parcial'):
                    executar(**args)
            self.assertFalse((Path(directory)/self.run/'extracao_concluida.json').exists())
            self.assertEqual(self.count_prices(),0)
            args['fixture']=FIXTURES/'fort_valido.json'
            with self.assertRaisesRegex(ErroIngestao,'configuracao_diferente'):
                executar(**args)

    def test_06_parametros_invalidos_nao_criam_carga(self):
        for changes in [{'mapeamento':[]},{'mapeamento':{1:1}},
                        {'mercado_id':True},{'mercado_id':0},
                        {'source':'a:b'},{'store':'b:c'},{'source':' espaco '}]:
            with self.subTest(changes=changes),self.assertRaises(ErroIngestao):
                self.load(**changes)
        self.assertEqual(self.count_prices(),0)

    def test_07_id_reutilizado_com_embalagem_ou_marca_diferente_bloqueado(self):
        self.load()
        for changes in [{'nome_bruto':'Arroz Exemplo 2kg'},{'marca':'Outra marca'},
                        {'nome_bruto':'Descricao diferente 1kg'}]:
            with self.subTest(changes=changes),self.assertRaisesRegex(ErroIngestao,'cadastro_origem'):
                self.load([registro(data_coleta='2026-10-05T13:00:00+00:00',**changes)],run_id=self.run+'2')
        self.assertEqual(self.count_prices(),1)
        with self.psycopg.connect(self.dsn) as conn:
            cadastro = conn.execute(
                'SELECT p.nome,p.nome_normalizado FROM produto p '
                'JOIN smartmarket_ingest.source_product s ON s.produto_id=p.id '
                'WHERE s.source=%s', (self.source,)).fetchall()
        self.assertEqual(cadastro, [('Arroz Exemplo 1kg', 'arroz exemplo 1kg')])

    def test_08_mesmo_id_externo_em_lojas_distintas_nao_funde(self):
        self.load()
        with self.psycopg.connect(self.dsn) as conn:
            market=conn.execute('INSERT INTO mercado(nome) VALUES(%s) RETURNING id',('Outra loja sintética',)).fetchone()[0]
        result=self.load(store='outra_loja',mercado_id=market,run_id=self.run+'2')
        self.assertEqual(result['produtos_criados'],1)
        with self.psycopg.connect(self.dsn) as conn:
            count=conn.execute('SELECT count(DISTINCT produto_id) FROM smartmarket_ingest.source_product WHERE source=%s',(self.source,)).fetchone()[0]
        self.assertEqual(count,2)

    def test_09_base_fixture_antiga_rejeitada_sem_migrar(self):
        from preparar_banco_fixture import preparar_banco
        from psycopg.conninfo import conninfo_to_dict, make_conninfo
        from uuid import uuid4
        name='smartmarket_fixture_antiga_'+uuid4().hex[:8]
        preparar_banco(self.dsn,name)
        config=conninfo_to_dict(self.dsn)
        config['dbname']=name
        antigo=make_conninfo(**config)
        ddl=(Path(__file__).resolve().parents[1]/'ingest_schema.sql').read_text()
        ddl=ddl.replace('    source_signature TEXT NOT NULL,\n','')
        with self.psycopg.connect(antigo) as conn:
            conn.execute(ddl)
        with self.assertRaisesRegex(ErroIngestao,'schema_ingestao_antigo'):
            self.load(dsn=antigo,mercado_id=1)
        with self.psycopg.connect(antigo) as conn:
            self.assertEqual(conn.execute('SELECT count(*) FROM preco').fetchone()[0],0)
            self.assertFalse(conn.execute("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='smartmarket_ingest' AND table_name='source_product' AND column_name='source_signature')").fetchone()[0])
