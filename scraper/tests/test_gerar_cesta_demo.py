"""Gerador da cesta de demonstração: filtros, fuso de Brasília e o arquivo versionado no frontend."""
import json
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import gerar_cesta_demo as g

BRASILIA_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$")


def preco(rede, valor, quando="2026-11-04T01:37:24+00:00", nome=None):
    return {"rede": rede, "nome": nome or f"Produto {rede}", "preco": valor, "coletado_em": quando}


def resultado(pid, origem, precos, pares):
    return {"id": pid, "rede_origem": origem, "nome_catalogo": f"Catálogo {pid}", "ean": "07896011906881",
            "precos": precos, "pares": [{"rede_a": origem, "rede_b": b, "status": s, "motivo": None} for b, s in pares]}


BRUTO = {
    "meta": {"inicio": "2026-11-04T01:37:17+00:00", "fim": "2026-11-04T01:52:23+00:00"},
    "resultados": [
        resultado("p12", "master", {"master": preco("master", 4.89), "stok": preco("stok", 4.35)}, [("stok", "confirmado")]),
        resultado("p9", "stok", {"stok": preco("stok", 3.0), "atacadao": preco("atacadao", 2.8)}, [("atacadao", "confirmado")]),
        resultado("p40", "master", {"master": preco("master", 14.39), "stok": preco("stok", 13.49)}, [("stok", "revisar")]),
        resultado("p100", "stok", {"stok": preco("stok", 5.0), "master": preco("master", 5.5), "atacadao": preco("atacadao", 4.9)},
                  [("master", "confirmado"), ("atacadao", "confirmado")]),
        resultado("p2", "stok", {"stok": preco("stok", 1.0)}, []),
    ],
}


class MontarTest(unittest.TestCase):
    def setUp(self):
        self.cesta = g.montar(BRUTO, "cesta_x.json")
        self.por_id = {p["id"]: p for p in self.cesta["produtos"]}

    def test_so_pares_confirmados_e_sem_atacadao(self):
        self.assertEqual(list(self.por_id), ["p12", "p100"])  # p9 só tem par com Atacadão; p40 é revisar; p2 sem par
        self.assertEqual(sorted(self.por_id["p100"]["precos"]), ["master", "stok"])

    def test_data_em_horario_de_brasilia(self):
        quando = self.por_id["p12"]["precos"]["stok"]["coletado_em"]
        self.assertEqual(quando, "2026-11-03T22:37:24-03:00")
        self.assertEqual(self.cesta["meta"]["coleta_inicio"], "2026-11-03T22:37:17-03:00")

    def test_origem_do_vinculo_e_preco_copiado_sem_calculo(self):
        p = self.por_id["p100"]["precos"]
        self.assertEqual((p["stok"]["origem_vinculo"], p["master"]["origem_vinculo"]), ("proprio", "ean"))
        self.assertEqual((p["stok"]["preco"], p["master"]["preco"]), (5.0, 5.5))

    def test_meta(self):
        self.assertEqual(self.cesta["meta"]["total_produtos"], 2)
        self.assertEqual(self.cesta["meta"]["rotulo"], "Cesta de demonstração")


class ArquivoVersionadoTest(unittest.TestCase):
    """O cesta-demo.json do frontend é a geração da saída mais recente, com 77 produtos e todas as datas."""

    def setUp(self):
        self.arquivo = json.loads(g.DESTINO.read_text(encoding="utf-8"))

    def test_tem_77_produtos(self):
        # 83 com par confirmado na coleta de 04/11/2026, menos 6 cujo único par confirmado era com o Atacadão.
        self.assertEqual(len(self.arquivo["produtos"]), 77)
        self.assertEqual(self.arquivo["meta"]["total_produtos"], 77)

    def test_nenhum_preco_sem_data_e_todas_em_brasilia(self):
        precos = [p for prod in self.arquivo["produtos"] for p in prod["precos"].values()]
        self.assertGreaterEqual(len(precos), 2 * 77)
        self.assertEqual([p for p in precos if not BRASILIA_ISO.match(p.get("coletado_em") or "")], [])

    def test_sem_atacadao_e_cada_produto_em_2_ou_mais_redes(self):
        for prod in self.arquivo["produtos"]:
            self.assertNotIn("atacadao", prod["precos"], prod["id"])
            self.assertGreaterEqual(len(prod["precos"]), 2, prod["id"])

    def test_igual_ao_que_o_gerador_produz_da_saida_mais_recente(self):
        entrada = g.saida_mais_recente()
        esperado = g.montar(json.loads(entrada.read_text(encoding="utf-8")), entrada.name)
        self.assertEqual(self.arquivo, esperado)


if __name__ == "__main__":
    unittest.main()
