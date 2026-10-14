from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from normalizacao import normalizar_produto, texto_normalizado
from pipeline import preparar, ErroIngestao


def registro(**changes):
    row = {'nome_bruto':'Arroz Exemplo 1kg', 'marca':'Exemplo', 'categoria':'Graos',
           'id_produto_origem':'sku-1', 'preco':Decimal('10.50'),
           'data_coleta':'2026-10-04T10:00:00-03:00'}
    row.update(changes)
    return row


class NormalizacaoTest(unittest.TestCase):
    def test_acentos_caixa_espacos(self):
        self.assertEqual(texto_normalizado('  FEIJÃO   Açúcar  '), 'feijao acucar')

    def test_medida_simples_preserva_unidade_sem_inferir_ean(self):
        p = normalizar_produto(registro())
        self.assertEqual((p['quantidade'],p['unidade']), (Decimal(1),'kg'))
        self.assertIsNone(p['codigo_barras'])
        self.assertFalse(p['pendencias'])

    def test_virgula_decimal(self):
        p = normalizar_produto(registro(nome_bruto='Leite 1,5 L'))
        self.assertEqual((p['quantidade'],p['unidade']), (Decimal('1.5'),'l'))

    def test_ambiguidade_nao_inventa_embalagem(self):
        for nome in ['Leite 6x1L', 'Kit arroz 1kg', 'Produto 1kg + 500g', 'Produto sem tamanho', 'Produto 0kg']:
            with self.subTest(nome=nome):
                p = normalizar_produto(registro(nome_bruto=nome))
                self.assertIsNone(p['quantidade'])
                self.assertTrue(p['pendencias'])

    def test_marca_ausente_sinalizada(self):
        self.assertIn('marca_ausente', normalizar_produto(registro(marca=None))['pendencias'])

    def test_embalagens_e_marcas_distintas_preservadas(self):
        a=normalizar_produto(registro(nome_bruto='Leite A 1L',marca='A'))
        b=normalizar_produto(registro(nome_bruto='Leite B 2L',marca='B'))
        self.assertNotEqual((a['nome_normalizado'],a['marca'],a['quantidade']),
                            (b['nome_normalizado'],b['marca'],b['quantidade']))


class ContratoCargaTest(unittest.TestCase):
    def test_decimal_e_tempo_utc(self):
        row = preparar([registro()])[0]
        self.assertEqual(row['valor'],Decimal('10.50'))
        self.assertEqual(row['instante'],datetime(2026,10,4,13,tzinfo=timezone.utc))

    def test_rejeita_arredondamento_implicito(self):
        with self.assertRaises(ErroIngestao): preparar([registro(preco='1.234')])

    def test_rejeita_entrada_incompativel(self):
        for changes in [{'id_produto_origem':None},{'preco':False},{'preco':0},
                        {'preco':'NaN'},{'preco':'100000000'},
                        {'data_coleta':'2026-10-04T10:00:00'},
                        {'nome_bruto':'a'*256},{'marca':123}]:
            with self.subTest(changes=changes), self.assertRaises(ErroIngestao): preparar([registro(**changes)])

    def test_lote_invalido_nao_chega_a_carga(self):
        with self.assertRaises(ErroIngestao): preparar([registro(),registro(preco=-1)])
