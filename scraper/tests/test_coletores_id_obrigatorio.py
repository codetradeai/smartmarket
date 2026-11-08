"""
Coletores descartam na origem os itens sem id de origem.

Sem id_produto_origem o pipeline rejeita o registro; descartar já no coletor (com a falha
registrada) evita levar lixo até a quarentena e mantém a coleta limpa.
"""
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import coleta_asun  # noqa: E402
import coleta_atacadao  # noqa: E402
import coleta_carrefour  # noqa: E402
import coleta_fort_atacadista as coleta_fort  # noqa: E402

AGORA = datetime(2026, 10, 14, 12, 0, tzinfo=timezone.utc)
OFERTA = {"sellers": [{"commertialOffer": {"Price": 10, "ListPrice": 10}}]}


def item_osuper(**extra):  # Fort e Asun (API OSuper)
    return {"name": "Arroz 1kg", "pricing": {"price": 10}, **extra}


def item_vtex(**extra):  # Carrefour e Atacadão (VTEX)
    return {"productName": "Arroz 1kg", "items": [OFERTA], "link": "/arroz/p", **extra}


CASOS = [
    ("fort", coleta_fort.transformar_item, item_osuper, "id"),
    ("asun", coleta_asun.transformar_item, item_osuper, "id"),
    ("carrefour", coleta_carrefour.transformar_item, item_vtex, "productId"),
    ("atacadao", coleta_atacadao.transformar_produto, item_vtex, "productId"),
]


class TestIdObrigatorioNosColetores(unittest.TestCase):
    def test_item_com_id_e_aceito_e_id_vira_texto(self):
        for rede, transformar, montar, campo in CASOS:
            with self.subTest(rede=rede):
                registro = transformar(montar(**{campo: 123}), "Cat", AGORA)
                self.assertEqual(str(registro["id_produto_origem"]), "123")

    def test_item_sem_id_e_descartado_com_motivo_explicito(self):
        for rede, transformar, montar, campo in CASOS:
            for rotulo, extra in (("ausente", {}), ("nulo", {campo: None}),
                                  ("vazio", {campo: ""}), ("so_espacos", {campo: "   "})):
                with self.subTest(rede=rede, id=rotulo), self.assertRaisesRegex(ValueError, "id_produto_origem_ausente"):
                    transformar(montar(**extra), "Cat", AGORA)

    def test_coleta_da_categoria_segue_sem_o_item_sem_id_e_registra_a_falha(self):
        pagina = {"hits": [item_osuper(), item_osuper(id="ok-1", name="Feijao 1kg")], "hasNext": False}
        for rede, coletar in (("fort", coleta_fort.coletar_categoria), ("asun", coleta_asun.coletar_categoria)):
            with self.subTest(rede=rede):
                falhas = []
                produtos = coletar("Cat", "123", buscar=lambda *a, **k: pagina, falhas=falhas,
                                   dormir=lambda _: None)
                self.assertEqual([p["id_produto_origem"] for p in produtos], ["ok-1"])
                self.assertEqual(len(falhas), 1)
                self.assertIn("id_produto_origem_ausente", falhas[0]["motivo"])


if __name__ == "__main__":
    unittest.main()
