import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from casamento import casar, chave_nome_identica, embalagens_compativeis


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


BOMBRIL = "7891022868036"


class EmbalagemDivergenteTest(unittest.TestCase):
    """Mesmo EAN com embalagem diferente (caso Bombril) => 'revisar', fora do comparador."""

    def _bombril(self):
        return casar({
            "atacadao": [reg("A", "Lã de Aço Bombril 45g", marca="Bombril", ean=BOMBRIL)],
            "master": [reg("M", "Esponja Aço Bombril Eco Com 6 Unidade", marca="Bombril", ean=BOMBRIL)],
            "stok": [reg("S", "Esponja Bombril Aço Eco 45g Com 6 Unidades", marca="Bombril", ean=BOMBRIL)],
        })

    def _status(self, res):
        return {frozenset((p["a"]["rede"], p["b"]["rede"])): p for p in res["pares"]}

    def test_45g_contra_6_unidades_vai_para_revisao(self):
        s = self._status(self._bombril())
        # stok tem "45g" → embalagem_diferente (mesmo EAN, pack diferente)
        par_stok = s[frozenset(("atacadao", "stok"))]
        self.assertEqual(par_stok["status"], "revisar")
        self.assertEqual(par_stok["motivo"], "embalagem_diferente")
        self.assertEqual(par_stok["origem"], "ean")
        # master não tem medida em g/ml → medida_ausente
        par_master = s[frozenset(("atacadao", "master"))]
        self.assertEqual(par_master["status"], "revisar")
        self.assertEqual(par_master["motivo"], "medida_ausente")
        self.assertEqual(par_master["origem"], "ean")

    def test_par_sem_medida_vai_para_revisao(self):
        # "Esponja Aço Bombril Eco Com 6 Unidade" (master) não tem medida em g/ml →
        # par master/stok deve ser "revisar", não "confirmado"
        par = self._status(self._bombril())[frozenset(("master", "stok"))]
        self.assertEqual(par["status"], "revisar")
        self.assertEqual(par["motivo"], "medida_ausente")

    def test_produto_com_par_em_revisao_e_sinalizado(self):
        res = self._bombril()
        self.assertTrue(res["produtos"][0]["revisar"])

    def test_wording_diferente_com_mesma_embalagem_e_confirmado(self):
        res = casar({"a": [reg("1", "Arroz Bco Blue Ville Tp1 1kg", marca="Blue Ville", ean="7896011906881")],
                     "b": [reg("2", "Arroz Blue Ville Branco Tipo 1 1kg", marca="Blue Ville", ean="7896011906881")]})
        self.assertEqual(res["pares"][0]["status"], "confirmado")
        self.assertFalse(res["produtos"][0]["revisar"])

    def test_quantidade_diferente_com_mesmo_ean_vai_para_revisao(self):
        res = casar({"a": [reg("1", "Arroz Camil 1kg", ean="7896011906881")],
                     "b": [reg("2", "Arroz Camil 5kg", ean="7896011906881")]})
        self.assertEqual((res["pares"][0]["status"], res["pares"][0]["motivo"]), ("revisar", "quantidade_diferente"))

    def test_compatibilidade_casos_gerais(self):
        self.assertTrue(embalagens_compativeis("Arroz 1kg", "Arroz 1000g")[0])
        # "Litro" não é reconhecido pela regex de medida → medida_ausente (revisar)
        ok, motivo = embalagens_compativeis("Leite 1L", "Leite Longa Vida 1 Litro")
        self.assertFalse(ok)
        self.assertEqual(motivo, "medida_ausente")
        self.assertFalse(embalagens_compativeis("Cerveja 12 Latas 350ml", "Cerveja Lata 350ml")[0])
        self.assertFalse(embalagens_compativeis("Cerveja 6x350ml", "Cerveja 350ml")[0])

    def test_nome_sem_medida_resulta_em_medida_ausente(self):
        ok, motivo = embalagens_compativeis("Esponja Aço Bombril Eco Com 6 Unidade", "Esponja Bombril Aço 45g")
        self.assertFalse(ok)
        self.assertEqual(motivo, "medida_ausente")

    def test_ambos_sem_medida_resulta_em_medida_ausente(self):
        ok, motivo = embalagens_compativeis("Esponja Aço Bombril", "Esponja Bombril Eco")
        self.assertFalse(ok)
        self.assertEqual(motivo, "medida_ausente")

    def test_mesma_rede_nao_gera_par(self):
        res = casar({"a": [reg("1", "Arroz Camil 1kg", ean="7896011906881"), reg("2", "Arroz Camil 1kg", ean="7896011906881")]})
        self.assertEqual(res["pares"], [])

    def test_par_com_item_de_nome_tem_origem_nome(self):
        res = casar({"a": [reg("1", "Arroz Branco Camil 1kg", ean="7896011906881")],
                     "b": [reg("2", "Arroz Branco Camil 1kg")]})
        self.assertEqual(res["pares"][0]["origem"], "nome")


if __name__ == "__main__":
    unittest.main()
