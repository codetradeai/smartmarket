import json
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from coleta_stok import (
    processar_item,
    extrair_imagem_hd,
    preco_positivo,
    coletar_categoria,
    carregar_fixture,
)


class TestColetaStok(unittest.TestCase):

    def setUp(self):
        self.data_coleta = "2026-10-27T18:00:00Z"
        fixture_path = Path(__file__).resolve().parent / "fixtures" / "stok_valido.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            self.fixture_data = json.load(f)

    def test_processar_item_valido(self):
        item_raw = self.fixture_data["arroz"]["data"]["produtos"][0]
        res = processar_item(item_raw, "Arroz", self.data_coleta)

        self.assertIsNotNone(res)
        self.assertEqual(res["nome_bruto"], "Arroz Branco Tipo 1 Emoções 5kg")
        self.assertEqual(res["id_produto_origem"], "55123")
        self.assertEqual(res["preco"], 23.90)
        self.assertEqual(res["preco_normal"], 26.90)
        self.assertTrue(res["em_promocao"])
        self.assertEqual(res["marca"], "Emoções")
        self.assertEqual(res["categoria"], "Arroz")
        self.assertEqual(res["supermercado"], "Stok Center")
        self.assertIn("1000x1000/e14f112d-1a31-4c8d-8cae-f0fb233ff3ae.jpg", res["imagem_url"])

    def test_extrair_imagem_hd(self):
        self.assertIsNone(extrair_imagem_hd(None))
        self.assertEqual(
            extrair_imagem_hd("foto.jpg"),
            "https://produto-assets-vipcommerce-com-br.br-se1.magaluobjects.com/1000x1000/foto.jpg",
        )

    def test_preco_positivo(self):
        self.assertEqual(preco_positivo("29.9"), 29.9)
        with self.assertRaises(ValueError):
            preco_positivo(0)

    def test_coletar_categoria_com_fixture(self):
        buscar_fn = carregar_fixture(Path(__file__).resolve().parent / "fixtures" / "stok_valido.json")
        produtos = coletar_categoria("Arroz", "arroz", limite=5, data_coleta=self.data_coleta, buscar_fn=buscar_fn, pausa=0)
        self.assertEqual(len(produtos), 1)
        self.assertEqual(produtos[0]["nome_bruto"], "Arroz Branco Tipo 1 Emoções 5kg")


if __name__ == "__main__":
    unittest.main()
