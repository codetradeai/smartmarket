import unittest
from datetime import datetime, timezone
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from coleta_asun import transformar_item, preco_positivo, obter_url_imagem_alta_resolucao


class TestColetaAsun(unittest.TestCase):

    def test_transformar_item_valido(self):
        instante = datetime(2026, 10, 27, 12, 0, 0, tzinfo=timezone.utc)
        item_raw = {
            "id": "12345",
            "name": "Café Tradicional 500g",
            "brandName": "Melitta",
            "slug": "cafe-tradicional-500g",
            "pricing": {
                "price": 25.90,
                "promotionalPrice": 22.50,
                "promotion": True
            },
            "image": "https://edge.osuper.com.br/test.webp",
            "description": "Café torrado e moído de alta qualidade."
        }

        transformado = transformar_item(item_raw, "Cafes", instante)
        self.assertEqual(transformado["id_produto_origem"], "12345")
        self.assertEqual(transformado["nome_bruto"], "Café Tradicional 500g")
        self.assertEqual(transformado["preco"], 22.50)
        self.assertEqual(transformado["preco_normal"], 25.90)
        self.assertTrue(transformado["em_promocao"])
        self.assertEqual(transformado["marca"], "Melitta")
        self.assertEqual(transformado["imagem_url"], "https://edge.osuper.com.br/test.webp")
        self.assertEqual(transformado["descricao"], "Café torrado e moído de alta qualidade.")
        self.assertIn("https://www.asunonline.com.br/produto/cafe-tradicional-500g", transformado["url_produto"])

    def test_transformar_item_sem_promocao(self):
        instante = datetime(2026, 10, 27, 12, 0, 0, tzinfo=timezone.utc)
        item_raw = {
            "id": 999,
            "name": "Leite Integral 1L",
            "pricing": {
                "price": 4.89,
                "promotion": False
            }
        }
        transformado = transformar_item(item_raw, "Leites", instante)
        self.assertEqual(transformado["preco"], 4.89)
        self.assertEqual(transformado["preco_normal"], 4.89)
        self.assertFalse(transformado["em_promocao"])
        self.assertEqual(transformado["id_produto_origem"], "999")

    def test_preco_invalido(self):
        with self.assertRaises(ValueError):
            preco_positivo(0)
        with self.assertRaises(ValueError):
            preco_positivo(-10)
        with self.assertRaises(ValueError):
            preco_positivo("invalido")


    def test_transformar_item_com_360(self):
        instante = datetime(2026, 10, 27, 12, 0, 0, tzinfo=timezone.utc)
        item_raw = {
            "id": "7710331",
            "name": "Café Melitta 250g",
            "pricing": {"price": 17.99},
            "threeDimensionalImage": [
                "https://edge.osuper.com.br/f0.webp",
                "https://edge.osuper.com.br/f1.webp",
                "https://edge.osuper.com.br/f2.webp"
            ]
        }
        transformado = transformar_item(item_raw, "Cafes", instante)
        self.assertEqual(len(transformado["three_dimensional_images"]), 3)
        self.assertEqual(transformado["three_dimensional_images"][0], "https://edge.osuper.com.br/f0.webp")

    def test_transformar_item_com_360_insuficiente(self):
        instante = datetime(2026, 10, 27, 12, 0, 0, tzinfo=timezone.utc)
        item_raw = {
            "id": "7710331",
            "name": "Café Melitta 250g",
            "pricing": {"price": 17.99},
            "threeDimensionalImage": ["https://edge.osuper.com.br/apenas_um.webp"]
        }
        transformado = transformar_item(item_raw, "Cafes", instante)
        self.assertIsNone(transformado["three_dimensional_images"])


if __name__ == "__main__":
    unittest.main()
