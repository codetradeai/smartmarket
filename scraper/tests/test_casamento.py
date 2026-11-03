import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from casamento import casar, chave_nome_identica


def reg(id_, nome, marca="Camil", ean=None, **kw):
    r = {"id_produto_origem": id_, "nome_bruto": nome, "marca": marca, "codigo_barras": ean}
    r.update(kw)
    return r


def vinculos(res):
    return {(v["rede"], v["id_origem"]): (p["produto"], v["origem"])
            for p in res["produtos"] for v in p["vinculos"]}


class CasamentoPorEanTest(unittest.TestCase):
    def test_mesmo_ean_em_duas_redes_vincula_com_origem_ean(self):
        res = casar({"atacadao": [reg("1", "Arroz Camil Tipo 1 1kg", ean="7896011906881")],
                     "master": [reg("9", "Arroz Bco Camil Tp1 1kg", ean="7896011906881")]})
        v = vinculos(res)
        self.assertEqual(v[("atacadao", "1")][1], "ean")
        self.assertEqual(v[("master", "9")][1], "ean")
        self.assertEqual(v[("atacadao", "1")][0], v[("master", "9")][0])
        self.assertEqual(res["produtos"][0]["redes"], ["atacadao", "master"])

    def test_ean_upc_e_ean13_com_zero_sao_o_mesmo_produto(self):
        res = casar({"a": [reg("1", "Cafe X 500g", ean="036000291452")],
                     "b": [reg("2", "Cafe X 500g", ean="0036000291452")]})
        self.assertEqual(len(res["produtos"]), 1)

    def test_ean_invalido_nao_vincula_por_ean(self):
        res = casar({"a": [reg("1", "Arroz Camil 1kg", ean="7896011906882")],
                     "b": [reg("2", "Arroz Camil 1kg", ean="7896011906882")]})
        # sem EAN válido, só a chave de nome idêntica pode casar
        self.assertTrue(all(o == "nome" for _, o in vinculos(res).values()))

    def test_eans_diferentes_nunca_se_fundem_mesmo_com_nome_igual(self):
        res = casar({"a": [reg("1", "Arroz Camil Tipo 1 1kg", ean="7896011906881")],
                     "b": [reg("2", "Arroz Camil Tipo 1 1kg", ean="7893500020158")]})
        v = vinculos(res)
        self.assertNotEqual(v[("a", "1")][0], v[("b", "2")][0])


class CasamentoPorNomeTest(unittest.TestCase):
    def test_chave_identica_sem_ean_vincula_com_origem_nome(self):
        res = casar({"asun": [reg("A", "Arroz Branco Camil 1kg")],
                     "fort": [reg("F", "Arroz Branco Camil 1000g")]})
        v = vinculos(res)
        self.assertEqual(v[("asun", "A")][1], "nome")
        self.assertEqual(v[("asun", "A")][0], v[("fort", "F")][0])

    def test_item_sem_ean_entra_no_produto_do_ean_com_origem_nome(self):
        res = casar({"master": [reg("M", "Arroz Branco Camil 1kg", ean="7896011906881")],
                     "asun": [reg("A", "Arroz Branco Camil 1kg")]})
        v = vinculos(res)
        self.assertEqual(v[("master", "M")][1], "ean")
        self.assertEqual(v[("asun", "A")][1], "nome")
        self.assertEqual(v[("master", "M")][0], v[("asun", "A")][0])

    def test_chave_tolerante_nao_e_usada_variante_diferente(self):
        res = casar({"a": [reg("1", "Leite Integral UHT Italac 1l", marca="Italac")],
                     "b": [reg("2", "Leite sem Lactose Integral UHT Italac 1l", marca="Italac")]})
        self.assertEqual(res["produtos"], [])
        self.assertEqual(len(res["sem_vinculo"]), 2)

    def test_abreviacao_nao_casa(self):
        res = casar({"a": [reg("1", "Arroz Bco Blue Ville Tp1 1kg", marca="Blue Ville")],
                     "b": [reg("2", "Arroz Blue Ville Branco Tipo 1 1kg", marca="Blue Ville")]})
        self.assertEqual(res["produtos"], [])

    def test_quantidade_diferente_nao_casa(self):
        res = casar({"a": [reg("1", "Arroz Branco Camil 1kg")], "b": [reg("2", "Arroz Branco Camil 5kg")]})
        self.assertEqual(res["produtos"], [])

    def test_sem_marca_ou_sem_medida_ou_multipack_nao_tem_chave(self):
        self.assertIsNone(chave_nome_identica(reg("1", "Arroz 1kg", marca=None)))
        self.assertIsNone(chave_nome_identica(reg("1", "Arroz Camil")))
        self.assertIsNone(chave_nome_identica(reg("1", "Leite Italac 6x1l", marca="Italac")))

    def test_chave_que_aponta_para_dois_eans_e_ambigua(self):
        res = casar({"m": [reg("1", "Arroz Branco Camil 1kg", ean="7896011906881")],
                     "s": [reg("2", "Arroz Branco Camil 1kg", ean="7893500020158")],
                     "a": [reg("3", "Arroz Branco Camil 1kg")]})
        self.assertEqual([i["id_origem"] for i in res["ambiguos"]], ["3"])
        self.assertNotIn(("a", "3"), vinculos(res))

    def test_toda_vinculacao_registra_origem(self):
        res = casar({"a": [reg("1", "Arroz Branco Camil 1kg", ean="7896011906881")],
                     "b": [reg("2", "Arroz Branco Camil 1kg")]})
        self.assertTrue(res["produtos"])
        for p in res["produtos"]:
            for v in p["vinculos"]:
                self.assertIn(v["origem"], ("ean", "nome"))


if __name__ == "__main__":
    unittest.main()
