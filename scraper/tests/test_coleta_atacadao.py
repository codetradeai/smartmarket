import unittest
from datetime import datetime, timezone
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from coleta_atacadao import transformar_produto, preco_positivo, limpar_html, obter_url_imagem_alta_resolucao


class TestColetaAtacadao(unittest.TestCase):

    def test_transformar_produto_valido(self):
        instante = datetime(2026, 10, 27, 15, 0, 0, tzinfo=timezone.utc)
        produto_raw = {
            "productId": "998877",
            "productName": "Arroz Integral Tipo 1 1kg",
            "brand": "Camil",
            "linkText": "arroz-integral-camil-1kg",
            "link": "https://secure.atacadao.com.br/arroz-integral-camil-1kg/p",
            "description": "<p>Arroz integral rico em fibras.</p>",
            "items": [
                {
                    "name": "Arroz Integral Tipo 1 1kg",
                    "images": [
                        {"imageUrl": "https://atacadaobr.vteximg.com.br/arquivos/ids/12345/foto.jpg"}
                    ],
                    "sellers": [
                        {
                            "commertialOffer": {
                                "Price": 7.99,
                                "ListPrice": 8.99,
                            }
                        }
                    ]
                }
            ]
        }

        res = transformar_produto(produto_raw, "Mercearia", instante)
        self.assertEqual(res["nome_bruto"], "Arroz Integral Tipo 1 1kg")
        self.assertEqual(res["id_produto_origem"], "998877")
        self.assertEqual(res["preco"], 7.99)
        self.assertEqual(res["preco_normal"], 8.99)
        self.assertTrue(res["em_promocao"])
        self.assertEqual(res["marca"], "Camil")
        self.assertEqual(res["categoria"], "Mercearia")
        self.assertEqual(res["imagem_url"], "https://atacadaobr.vteximg.com.br/arquivos/ids/12345/foto.jpg")
        self.assertEqual(res["descricao"], "Arroz integral rico em fibras.")
        self.assertEqual(res["url_produto"], "https://secure.atacadao.com.br/arroz-integral-camil-1kg/p")

    def test_limpar_html(self):
        html = "<div><h2>Titulo</h2><p>Texto com <b>negrito</b> e   espacos  extras.</p></div>"
        limpo = limpar_html(html)
        self.assertEqual(limpo, "Titulo Texto com negrito e espacos extras.")

    def test_preco_invalido(self):
        with self.assertRaises(ValueError):
            preco_positivo(0)
        with self.assertRaises(ValueError):
            preco_positivo(-1)
        with self.assertRaises(ValueError):
            preco_positivo("invalido")


if __name__ == "__main__":
    unittest.main()
