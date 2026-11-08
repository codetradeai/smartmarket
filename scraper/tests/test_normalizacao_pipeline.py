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

    def test_preco_com_mais_de_2_casas_arredonda_half_up_para_centavos(self):
        # Regra explícita: ROUND_HALF_UP para centavos (ex.: preço por kg 12,345).
        for bruto, esperado in [('1.234', '1.23'), ('12.345', '12.35'), ('12.3449', '12.34'),
                                (Decimal('7.005'), '7.01'), ('10.500', '10.50')]:
            with self.subTest(preco=bruto):
                self.assertEqual(preparar([registro(preco=bruto)])[0]['valor'], Decimal(esperado))

    def test_preco_com_casas_excessivas_ou_que_zera_e_rejeitado(self):
        for bruto in ['1.23456', '0.004', '0.00001']:
            with self.subTest(preco=bruto), self.assertRaises(ErroIngestao):
                preparar([registro(preco=bruto)])

    def test_rejeita_entrada_incompativel(self):
        for changes in [{'id_produto_origem':None},{'preco':False},{'preco':0},
                        {'preco':'NaN'},{'preco':'100000000'},
                        {'data_coleta':'2026-10-04T10:00:00'},
                        {'nome_bruto':'a'*256},{'marca':123}]:
            with self.subTest(changes=changes), self.assertRaises(ErroIngestao): preparar([registro(**changes)])

    def test_lote_invalido_nao_chega_a_carga(self):
        with self.assertRaises(ErroIngestao): preparar([registro(),registro(preco=-1)])


class CodigoBarrasTest(unittest.TestCase):
    def test_ean_valido_e_persistido_no_produto_normalizado(self):
        p = normalizar_produto(registro(codigo_barras='7896011906881'))
        self.assertEqual(p['codigo_barras'], '7896011906881')
        self.assertNotIn('ean_invalido_descartado', p['pendencias'])

    def test_ean_invalido_ou_interno_e_descartado_com_pendencia(self):
        for ruim in ('364670001', '7896011906882', 'abc'):
            with self.subTest(ruim=ruim):
                p = normalizar_produto(registro(codigo_barras=ruim))
                self.assertIsNone(p['codigo_barras'])
                self.assertIn('ean_invalido_descartado', p['pendencias'])

    def test_sem_ean_continua_sem_inventar(self):
        for vazio in (None, ''):
            p = normalizar_produto(registro(codigo_barras=vazio))
            self.assertIsNone(p['codigo_barras'])
            self.assertNotIn('ean_invalido_descartado', p['pendencias'])

    def test_hash_de_carga_sem_ean_nao_muda(self):
        sem = preparar([registro()])[0]['hash']
        self.assertEqual(preparar([registro(codigo_barras=None)])[0]['hash'], sem)
        self.assertEqual(preparar([registro(codigo_barras='lixo')])[0]['hash'], sem)

    def test_hash_idempotente_e_sensivel_ao_ean_validado(self):
        a = preparar([registro(codigo_barras='7896011906881')])[0]['hash']
        b = preparar([registro(codigo_barras=' 7896011906881 ')])[0]['hash']
        self.assertEqual(a, b)
        self.assertNotEqual(a, preparar([registro()])[0]['hash'])


class FakeCursor:
    def __init__(self, atual):
        self.atual, self.sql = atual, []

    def execute(self, sql, params=()):
        self.sql.append((sql.split()[0], params))

    def fetchone(self):
        return (self.atual,)


class SincronizarCodigoBarrasTest(unittest.TestCase):
    def test_grava_quando_vazio(self):
        from pipeline import sincronizar_codigo_barras
        cur = FakeCursor(None)
        self.assertTrue(sincronizar_codigo_barras(cur, 7, '7896011906881'))
        self.assertEqual(cur.sql[-1], ('UPDATE', ('7896011906881', 7)))

    def test_idempotente_quando_igual(self):
        from pipeline import sincronizar_codigo_barras
        cur = FakeCursor('7896011906881')
        self.assertFalse(sincronizar_codigo_barras(cur, 7, '7896011906881'))
        self.assertTrue(all(s[0] != 'UPDATE' for s in cur.sql))

    def test_divergente_exige_revisao_e_nao_sobrescreve(self):
        from pipeline import sincronizar_codigo_barras
        cur = FakeCursor('7893500020158')
        with self.assertRaises(ErroIngestao):
            sincronizar_codigo_barras(cur, 7, '7896011906881')
        self.assertTrue(all(s[0] != 'UPDATE' for s in cur.sql))

    def test_sem_codigo_nao_consulta(self):
        from pipeline import sincronizar_codigo_barras
        cur = FakeCursor(None)
        self.assertFalse(sincronizar_codigo_barras(cur, 7, None))
        self.assertEqual(cur.sql, [])


