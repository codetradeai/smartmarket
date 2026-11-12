"""
Quarentena: um registro inválido não pode derrubar a carga da rede inteira.

Os válidos são carregados, os rejeitados ganham relatório (quarentena.json) com o motivo
e o lote só falha acima de um limiar de rejeição. O banco é simulado (FakeBanco) para
cobrir também os conflitos detectados durante a carga, com savepoint por registro.
"""
import json
import shutil
import sys
import tempfile
import unittest
from contextlib import contextmanager
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from pipeline import (ErroIngestao, LIMITE_REJEICAO_PADRAO, carregar,  # noqa: E402
                      preparar_com_quarentena)
from test_normalizacao_pipeline import registro  # noqa: E402

DSN = "host=localhost dbname=smartmarket_fixture_quarentena"
INSTANTE = datetime(2026, 10, 4, 13, tzinfo=timezone.utc)


class FakeBanco:
    """Banco em memória que entende só as consultas de pipeline.carregar.

    O vínculo preço x loja é simulado como "sem vínculo vigente" (toda coleta cria preco): estes
    testes cobrem quarentena e savepoints; a semântica dos vínculos (confirmar, fechar antes de
    abrir, reaproveitar) é coberta em test_lojas_postgres.py com PostgreSQL real."""

    def __init__(self, source_products=None, eventos=None):
        self.estado = {'source_products': dict(source_products or {}), 'eventos': dict(eventos or {}),
                       'produtos': [], 'precos': []}
        self.conexoes = 0

    # --- API do psycopg usada por carregar ---
    def connect(self, **_config):
        self.conexoes += 1
        return FakeConn(self)


class FakeConn:
    def __init__(self, banco):
        self.banco = banco
        self.inicial = deepcopy(banco.estado)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is not None:  # rollback da transação inteira
            self.banco.estado = self.inicial
        return False

    def cursor(self):
        return FakeCursor(self.banco)

    @contextmanager
    def transaction(self):  # savepoint
        antes = deepcopy(self.banco.estado)
        try:
            yield
        except BaseException:
            self.banco.estado = antes
            raise


class FakeCursor:
    def __init__(self, banco):
        self.banco = banco
        self._um = None
        self._todos = []

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def fetchone(self):
        return self._um

    def fetchall(self):
        return self._todos

    def execute(self, sql, params=None):
        e = self.banco.estado
        s = ' '.join(sql.split())
        self._um, self._todos = None, []
        if s.upper().startswith('SELECT EXISTS'):
            self._um = (True,)
        elif s.startswith('SELECT to_regclass'):
            self._um = (True,)  # tabelas loja e preco_loja existem
        elif s.startswith('SELECT id FROM mercado'):
            self._um = (1,)
        elif s.startswith('SELECT id FROM loja'):
            self._um = (1,)  # loja padrao do mercado
        elif s.startswith('SELECT pl.id, pl.preco_id'):
            self._um = None  # sem vinculo vigente
        elif s.startswith('SELECT p.id FROM preco_loja'):
            self._um = None  # nenhum preco vigente em outra loja para reaproveitar
        elif s.startswith('SELECT produto_id, source_signature FROM smartmarket_ingest.source_product'):
            self._um = e['source_products'].get(tuple(params))
        elif "information_schema.columns WHERE table_name='produto'" in s:
            self._todos = [('nome',), ('imagem_url',), ('descricao',)]
        elif s.startswith('INSERT INTO produto'):
            e['produtos'].append(params)
            self._um = (len(e['produtos']),)
        elif s.startswith('INSERT INTO smartmarket_ingest.source_product'):
            *key, produto_id, assinatura = params
            e['source_products'][tuple(key)] = (produto_id, assinatura)
        elif s.startswith('SELECT payload_hash FROM smartmarket_ingest.event'):
            h = e['eventos'].get(tuple(params))
            self._um = (h,) if h else None
        elif s.startswith('INSERT INTO preco('):
            e['precos'].append(params)
            self._um = (len(e['precos']),)
        elif s.startswith('INSERT INTO preco_loja'):
            e.setdefault('vinculos', []).append(params)
        elif s.startswith('INSERT INTO smartmarket_ingest.event'):
            *chave, instante, h, _preco_id, _run = params
            e['eventos'][(*chave, instante)] = h
        # demais comandos (advisory lock, DDL, run/source_store) não mudam o estado simulado


def lote(n=10, **por_indice):
    """n registros válidos; por_indice={'3': {...}} altera o registro 3."""
    rows = [registro(id_produto_origem=f'sku-{i}', nome_bruto=f'Produto {i} 1kg', marca='Marca')
            for i in range(n)]
    for i, mud in por_indice.items():
        rows[int(i)] = registro(**{'id_produto_origem': f'sku-{i}', 'nome_bruto': f'Produto {i} 1kg',
                                   'marca': 'Marca', **mud})
    return rows


class PreparoComQuarentenaTest(unittest.TestCase):
    def test_separa_validos_e_rejeitados_com_motivo(self):
        rows = lote(4, **{'1': {'id_produto_origem': None}, '2': {'preco': '1.23456'}})
        preparados, rejeitados = preparar_com_quarentena(rows)
        self.assertEqual([p['external_id'] for p in preparados], ['sku-0', 'sku-3'])
        self.assertEqual([(r['indice'], r['motivo']) for r in rejeitados],
                         [(1, 'id_produto_origem_obrigatorio'), (2, 'preco_casas_decimais_excessivas')])
        self.assertEqual(rejeitados[1]['id_produto_origem'], 'sku-2')
        self.assertEqual(rejeitados[0]['nome_bruto'], 'Produto 1 1kg')

    def test_registro_que_nao_e_objeto_e_rejeitado_sem_quebrar(self):
        preparados, rejeitados = preparar_com_quarentena([registro(), 'lixo', None])
        self.assertEqual(len(preparados), 1)
        self.assertEqual([r['motivo'] for r in rejeitados], ['registro_nao_objeto', 'registro_nao_objeto'])

    def test_campo_ausente_vira_motivo_legivel(self):
        row = registro()
        del row['data_coleta']
        _, rejeitados = preparar_com_quarentena([row, registro(id_produto_origem='b')])
        self.assertEqual(rejeitados[0]['motivo'], 'campo_ausente_data_coleta')

    def test_lista_vazia_continua_erro(self):
        with self.assertRaises(ErroIngestao):
            preparar_com_quarentena([])


class CargaComQuarentenaTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='smartmarket_test_quarentena_'))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def carregar(self, banco, rows, **extra):
        with mock.patch('psycopg.connect', banco.connect):
            return carregar(rows, dsn=DSN, source='fortx', store='loja', mercado_id=1,
                            run_id='run-1', diretorio_quarentena=self.tmp, **extra)

    def relatorio(self):
        return json.loads((self.tmp / 'quarentena.json').read_text(encoding='utf-8'))

    def test_um_invalido_nao_derruba_os_outros_nove(self):
        banco = FakeBanco()
        resumo = self.carregar(banco, lote(10, **{'4': {'id_produto_origem': None}}))
        self.assertEqual(resumo['precos_inseridos'], 9)
        self.assertEqual(resumo['produtos_criados'], 9)
        self.assertEqual(len(banco.estado['precos']), 9)
        self.assertEqual([r['motivo'] for r in resumo['rejeitados']], ['id_produto_origem_obrigatorio'])
        rel = self.relatorio()
        self.assertEqual(rel['total_registros'], 10)
        self.assertEqual(rel['total_rejeitados'], 1)
        self.assertEqual(rel['rejeitados'][0]['motivo'], 'id_produto_origem_obrigatorio')
        self.assertEqual(rel['rejeitados'][0]['indice'], 4)
        self.assertEqual(rel['run_id'], 'run-1')

    def test_lote_limpo_nao_gera_arquivo_de_quarentena(self):
        resumo = self.carregar(FakeBanco(), lote(3))
        self.assertEqual(resumo['rejeitados'], [])
        self.assertFalse((self.tmp / 'quarentena.json').exists())

    def test_preco_com_3_casas_e_carregado_arredondado(self):
        banco = FakeBanco()
        self.carregar(banco, lote(2, **{'0': {'preco': '12.345'}}))
        from decimal import Decimal
        self.assertIn(Decimal('12.35'), [p[2] for p in banco.estado['precos']])

    def test_acima_do_limiar_falha_o_lote_sem_tocar_no_banco_mas_grava_o_relatorio(self):
        banco = FakeBanco()
        rows = lote(10, **{'1': {'id_produto_origem': None}, '2': {'preco': 0}, '3': {'preco': -1}})
        with self.assertRaises(ErroIngestao) as ctx:
            self.carregar(banco, rows)
        self.assertIn('taxa_rejeicao_acima_do_limite', str(ctx.exception))
        self.assertIn('3/10', str(ctx.exception))
        self.assertEqual(banco.conexoes, 0, 'falha rápida: antes de abrir o banco')
        self.assertEqual(self.relatorio()['total_rejeitados'], 3)

    def test_limiar_exato_ainda_passa_e_o_padrao_e_20_por_cento(self):
        self.assertEqual(LIMITE_REJEICAO_PADRAO, __import__('decimal').Decimal('0.2'))
        banco = FakeBanco()
        rows = lote(10, **{'1': {'id_produto_origem': None}, '2': {'preco': 0}})  # 20%
        resumo = self.carregar(banco, rows)
        self.assertEqual(resumo['precos_inseridos'], 8)

    def test_limiar_configuravel(self):
        rows = lote(10, **{'1': {'id_produto_origem': None}, '2': {'preco': 0}, '3': {'preco': -1}})
        resumo = self.carregar(FakeBanco(), rows, limite_rejeicao='0.5')
        self.assertEqual(resumo['precos_inseridos'], 7)
        with self.assertRaises(ErroIngestao):
            self.carregar(FakeBanco(), rows, limite_rejeicao='0.1')

    def test_nenhum_registro_valido_falha(self):
        with self.assertRaises(ErroIngestao) as ctx:
            self.carregar(FakeBanco(), [registro(preco=0), registro(preco=-1)], limite_rejeicao=1)
        self.assertIn('taxa_rejeicao_acima_do_limite', str(ctx.exception))

    def test_cadastro_origem_alterado_vai_para_revisao_e_o_resto_segue(self):
        # sku-5 já existe vinculado ao produto 77 com outra assinatura (renomeado na origem)
        banco = FakeBanco(source_products={('fortx', 'loja', 'sku-5'): (77, 'assinatura-antiga')})
        resumo = self.carregar(banco, lote(10))
        self.assertEqual(resumo['precos_inseridos'], 9)
        self.assertEqual(len(resumo['rejeitados']), 1)
        rej = resumo['rejeitados'][0]
        self.assertEqual((rej['id_produto_origem'], rej['motivo'], rej['etapa']),
                         ('sku-5', 'cadastro_origem_alterado_exige_revisao', 'banco'))
        self.assertEqual(resumo['pendencias_revisao'], [rej])
        self.assertEqual(self.relatorio()['rejeitados'][0]['motivo'], 'cadastro_origem_alterado_exige_revisao')
        # o produto já vinculado não recebe preço de um cadastro que mudou
        self.assertNotIn(77, [p[0] for p in banco.estado['precos']])

    def test_conflito_de_evento_reverte_so_o_registro_via_savepoint(self):
        banco = FakeBanco(eventos={('fortx', 'loja', 'sku-2', INSTANTE): 'hash-diferente'})
        resumo = self.carregar(banco, lote(10))
        self.assertEqual(resumo['precos_inseridos'], 9)
        self.assertEqual(resumo['produtos_criados'], 9, 'o produto criado antes do conflito foi desfeito')
        self.assertEqual(len(banco.estado['produtos']), 9)
        self.assertNotIn(('fortx', 'loja', 'sku-2'), banco.estado['source_products'])
        self.assertEqual(resumo['rejeitados'][0]['motivo'], 'evento_mesmo_instante_com_conteudo_diferente')

    def test_rejeicao_tardia_acima_do_limiar_reverte_o_lote_todo(self):
        antigos = {('fortx', 'loja', f'sku-{i}'): (900 + i, 'assinatura-antiga') for i in range(5)}
        banco = FakeBanco(source_products=antigos)
        with self.assertRaises(ErroIngestao) as ctx:
            self.carregar(banco, lote(10))
        self.assertIn('cadastro_origem_alterado_exige_revisao=5', str(ctx.exception))
        self.assertEqual(banco.estado['precos'], [])
        self.assertEqual(banco.estado['produtos'], [])
        self.assertEqual(self.relatorio()['total_rejeitados'], 5)

    def test_erro_de_banco_fora_da_lista_continua_abortando(self):
        from pipeline import _preparar_registro
        rows = lote(2)
        assinatura = _preparar_registro(rows[0])['source_signature']
        banco = FakeBanco(source_products={('fortx', 'loja', 'sku-0'): (1, assinatura)})
        with mock.patch('pipeline.sincronizar_codigo_barras', side_effect=ErroIngestao('outro_erro_grave')):
            with self.assertRaisesRegex(ErroIngestao, 'outro_erro_grave'):
                self.carregar(banco, rows)


if __name__ == '__main__':
    unittest.main()
