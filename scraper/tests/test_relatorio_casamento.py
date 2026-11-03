import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import relatorio_casamento as rc
from casamento import casar


def reg(rede, id_, nome, ean=None, marca="Camil"):
    return {"supermercado": rede, "id_produto_origem": id_, "nome_bruto": nome, "marca": marca, "codigo_barras": ean}


DADOS = [
    reg("Atacadão", "1", "Arroz Camil Tipo 1 1kg", "7896011906881"),
    reg("Master", "2", "Arroz Bco Camil Tp1 1kg", "7896011906881"),
    reg("Stok Center", "3", "Feijão Preto Camil 1kg", "7893500020158"),
    reg("Fort Atacadista", "4", "Feijão Preto Camil 1kg"),
    reg("Zaffari", "5", "Pão Francês", None, marca=None),
]


class RelatorioCasamentoTest(unittest.TestCase):
    def setUp(self):
        self.por_rede = rc.agrupar_por_rede(DADOS)

    def test_chave_rede_distingue_fort_de_atacadao(self):
        self.assertEqual(rc.chave_rede("Fort Atacadista"), "fort")
        self.assertEqual(rc.chave_rede("Atacadão"), "atacadao")
        self.assertEqual(rc.chave_rede("Stok Center"), "stok")
        self.assertEqual(rc.chave_rede("Asun Supermercados"), "asun")

    def test_resumo_por_rede_conta_so_ean_valido(self):
        r = rc.resumo_por_rede(self.por_rede)
        self.assertEqual(r["atacadao"], {"produtos": 1, "com_ean": 1})
        self.assertEqual(r["fort"], {"produtos": 1, "com_ean": 0})
        self.assertEqual(r["zaffari"], {"produtos": 1, "com_ean": 0})

    def test_ean_em_duas_redes_e_matriz(self):
        pres = rc.presencas(self.por_rede)
        self.assertEqual(rc.eans_em_2_ou_mais(pres), 1)
        self.assertEqual(rc.matriz_pares(pres)[("atacadao", "master")], 1)

    def test_consulta_cruzada_amplia_presencas_sem_duplicar(self):
        consulta = {"stok": {"07896011906881": "Arroz Camil T1 1kg", "07893500020158": False}}
        pres = rc.presencas(self.por_rede, consulta)
        self.assertEqual(set(pres["07896011906881"]), {"atacadao", "master", "stok"})
        self.assertEqual(set(pres["07893500020158"]), {"stok"})

    def test_nomes_muito_diferentes_listados_com_limite(self):
        pres = {"07896011906881": {"a": "Arroz Branco Camil", "b": "Fórmula Infantil Nestlé"},
                "07893500020158": {"a": "Feijão Preto Camil 1kg", "b": "Feijão Preto Camil 1kg"}}
        div = rc.pares_nomes_divergentes(pres, limite=20)
        self.assertEqual([d["ean"] for d in div], ["07896011906881"])
        self.assertEqual(rc.pares_nomes_divergentes(pres, limite=0), [])

    def test_similaridade_ignora_medida_e_acento(self):
        self.assertEqual(rc.similaridade("Café Melitta 500g", "CAFE MELITTA 250 g"), 1.0)

    def test_termo_de_consulta(self):
        self.assertEqual(rc.termo_de_consulta("07896011906881"), "7896011906881")
        self.assertEqual(rc.termo_de_consulta("00036000291452"), "0036000291452")

    def test_pausa_de_2s_entre_consultas(self):
        agora, pausas = [0.0], []
        p = rc._Pausa(2.0, relogio=lambda: agora[0], dormir=lambda s: (pausas.append(s), agora.__setitem__(0, agora[0] + s)))
        p.aguardar()
        agora[0] += 0.5
        p.aguardar()
        self.assertEqual(len(pausas), 1)
        self.assertAlmostEqual(pausas[0], 1.5)
        self.assertGreaterEqual(rc.PAUSA_S, 2.0)
        self.assertIn("contato", rc.USER_AGENT)

    def test_markdown_tem_as_secoes_pedidas(self):
        pres = rc.presencas(self.por_rede)
        md = rc.renderizar(self.por_rede, casar(self.por_rede), pres, None,
                           rc.pares_nomes_divergentes(pres), data="2026-11-03")
        for titulo in ("## 1. Produtos por rede", "## 2. EANs em 2 ou mais redes", "## 3. Matriz de sobreposição",
                       "## 4. Casamento", "## 5. Pares com o mesmo EAN"):
            self.assertIn(titulo, md)
        self.assertIn("| Atacadão | 1 | 1 | 100% |", md)
        self.assertIn("ean = 3", md)
        self.assertIn("nome = 1", md)
        self.assertIn("Pares entre redes", md)

    def test_relatorio_lista_pares_em_revisao_e_status_da_embalagem(self):
        dados = [reg("Atacadão", "1", "Lã de Aço Bombril 45g", "7891022868036", marca="Bombril"),
                 reg("Master", "2", "Esponja Aço Bombril Eco Com 6 Unidade", "7891022868036", marca="Bombril")]
        por_rede = rc.agrupar_por_rede(dados)
        pres = rc.presencas(por_rede)
        md = rc.renderizar(por_rede, casar(por_rede), pres, None, rc.pares_nomes_divergentes(pres), data="2026-11-03")
        self.assertIn("### 4.1 Pares em revisão", md)
        self.assertIn("embalagem_diferente", md)
        self.assertIn("revisar (embalagem_diferente)", md)


if __name__ == "__main__":
    unittest.main()
