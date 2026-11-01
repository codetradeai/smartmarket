import json
import unittest
from datetime import datetime, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from coleta_rissul import (
    transformar_produto,
    limpar_html,
    preco_positivo,
    obter_url_imagem_alta_resolucao,
    coletar_categoria,
    carregar_fixture,
)


class TestColetaRissul(unittest.TestCase):

    def setUp(self):
        self.instante = datetime(2026, 10, 27, 18, 0, 0, tzinfo=timezone.utc)
        self.fixture_path = Path(__file__).resolve().parent / "fixtures" / "rissul_valido.json"
        with open(self.fixture_path, "r", encoding="utf-8") as f:
            self.fixture_data = json.load(f)

    def test_transformar_produto_valido(self):
        item_raw = self.fixture_data["C:7"][0]
        res = transformar_produto(item_raw, "Mercearia", self.instante)

        self.assertIsNotNone(res)
        self.assertEqual(res["nome_bruto"], "Arroz Branco Tipo 1 Blue Ville 5kg")
        self.assertEqual(res["id_produto_origem"], "887766")
        self.assertEqual(res["preco"], 26.90)
        self.assertEqual(res["preco_normal"], 29.90)
        self.assertTrue(res["em_promocao"])
        self.assertEqual(res["marca"], "Blue Ville")
        self.assertEqual(res["categoria"], "Mercearia")
        self.assertEqual(res["supermercado"], "Rissul")
        self.assertEqual(res["imagem_url"], "https://rissul.vteximg.com.br/arquivos/ids/554433/arroz-blueville.jpg")
        self.assertEqual(res["descricao"], "Arroz Branco Blue Ville tradicional do Rio Grande do Sul.")

    def test_limpar_html(self):
        html = "<div><p>Tradicional do <b>Rio Grande do Sul</b>.</p></div>"
        self.assertEqual(limpar_html(html), "Tradicional do Rio Grande do Sul.")
        self.assertIsNone(limpar_html(None))

    def test_obter_url_imagem_alta_resolucao(self):
        url_thumb = "https://rissul.vteximg.com.br/arquivos/ids/554433-250-250/foto.jpg"
        self.assertEqual(
            obter_url_imagem_alta_resolucao(url_thumb),
            "https://rissul.vteximg.com.br/arquivos/ids/554433/foto.jpg",
        )

    def test_preco_positivo(self):
        self.assertEqual(preco_positivo(25.9), 25.9)
        with self.assertRaises(ValueError):
            preco_positivo(0)

    def test_coletar_categoria_com_fixture(self):
        buscar_fn = carregar_fixture(self.fixture_path)
        produtos, falhas = coletar_categoria("Mercearia", "C:7", limite=5, buscar_fn=buscar_fn, pausa=0)
        self.assertEqual(len(produtos), 1)
        self.assertEqual(len(falhas), 0)
        self.assertEqual(produtos[0]["nome_bruto"], "Arroz Branco Tipo 1 Blue Ville 5kg")


if __name__ == "__main__":
    unittest.main()
