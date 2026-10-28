import json
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from coleta_master import (
    processar_item,
    extrair_imagem_hd,
    preco_positivo,
    coletar_categoria,
    executar,
)


class TestColetaMaster(unittest.TestCase):

    def setUp(self):
        self.data_coleta = "2026-10-27T18:00:00Z"
        fixture_path = Path(__file__).resolve().parent / "fixtures" / "master_valido.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            self.fixture_data = json.load(f)

    def test_processar_item_com_oferta(self):
        item_raw = self.fixture_data["arroz"]["data"]["produtos"][0]
        res = processar_item(item_raw, "Arroz", self.data_coleta)

        self.assertIsNotNone(res)
        self.assertEqual(res["nome_bruto"], "Arroz Parboilizado Tio João Tipo 1 5kg")
        self.assertEqual(res["id_produto_origem"], "20524")
        self.assertEqual(res["preco"], 25.99)
        self.assertEqual(res["preco_normal"], 28.99)
        self.assertTrue(res["em_promocao"])
        self.assertEqual(res["marca"], "Tio João")
        self.assertEqual(res["categoria"], "Arroz")
        self.assertEqual(res["supermercado"], "Master")
        self.assertIn("1000x1000/150eedde-5151-40e6-bd63-083568710beb.jpg", res["imagem_url"])
        self.assertEqual(res["url_produto"], "https://www.lojaonline.mastersupermercados.com.br/produtos/arroz-parboilizado-tio-joao-tp1-5kg")

    def test_processar_item_sem_oferta(self):
        item_raw = self.fixture_data["arroz"]["data"]["produtos"][1]
        res = processar_item(item_raw, "Arroz", self.data_coleta)

        self.assertIsNotNone(res)
        self.assertEqual(res["nome_bruto"], "Arroz Branco Camil Tipo 1 5kg")
        self.assertEqual(res["id_produto_origem"], "20525")
        self.assertEqual(res["preco"], 27.50)
        self.assertEqual(res["preco_normal"], 27.50)
        self.assertFalse(res["em_promocao"])
        self.assertEqual(res["marca"], "Camil")

    def test_processar_item_indisponivel(self):
        item_raw = {
            "produto_id": 999,
            "descricao": "Produto Esgotado",
            "disponivel": False,
            "preco": "10.00",
        }
        res = processar_item(item_raw, "Geral", self.data_coleta)
        self.assertIsNone(res)

    def test_processar_item_preco_invalido(self):
        item_raw = {
            "produto_id": 998,
            "descricao": "Produto Sem Preco",
            "disponivel": True,
            "preco": "0.00",
        }
        res = processar_item(item_raw, "Geral", self.data_coleta)
        self.assertIsNone(res)

    def test_extrair_imagem_hd(self):
        self.assertIsNone(extrair_imagem_hd(None))
        self.assertIsNone(extrair_imagem_hd(""))
        self.assertEqual(
            extrair_imagem_hd("foto123.jpg"),
            "https://produto-assets-vipcommerce-com-br.br-se1.magaluobjects.com/1000x1000/foto123.jpg",
        )
        self.assertEqual(
            extrair_imagem_hd("https://custom.cdn/img.jpg"),
            "https://custom.cdn/img.jpg",
        )

    def test_preco_positivo(self):
        self.assertEqual(preco_positivo("19.99"), 19.99)
        self.assertEqual(preco_positivo(10), 10.0)
        with self.assertRaises(ValueError):
            preco_positivo(0)
        with self.assertRaises(ValueError):
            preco_positivo(-5)
        with self.assertRaises(ValueError):
            preco_positivo("abc")
        with self.assertRaises(ValueError):
            preco_positivo(None)

    def test_coletar_categoria_com_mock(self):
        def mock_buscar(termo, pagina=1):
            return self.fixture_data.get(termo, {"data": {"produtos": []}})

        produtos = coletar_categoria(
            "Arroz",
            "arroz",
            limite=10,
            data_coleta=self.data_coleta,
            buscar_fn=mock_buscar,
            pausa=0,
        )
        self.assertEqual(len(produtos), 2)
        self.assertEqual(produtos[0]["nome_bruto"], "Arroz Parboilizado Tio João Tipo 1 5kg")
        self.assertEqual(produtos[1]["nome_bruto"], "Arroz Branco Camil Tipo 1 5kg")

    def test_executar_com_mock(self):
        def mock_buscar(termo, pagina=1):
            return self.fixture_data.get(termo, {"data": {"produtos": []}})

        produtos = executar(
            categorias={"Arroz": "arroz"},
            limite_por_categoria=10,
            buscar_fn=mock_buscar,
            pausa=0,
            data_coleta=self.data_coleta,
        )
        self.assertEqual(len(produtos), 2)


if __name__ == "__main__":
    unittest.main()
