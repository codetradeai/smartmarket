import json
import unittest
from datetime import datetime, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from coleta_zaffari import (
    transformar_produto,
    limpar_html,
    preco_positivo,
    obter_url_imagem_alta_resolucao,
    coletar_categoria,
    executar_coleta,
    carregar_fixture,
)


class TestColetaZaffari(unittest.TestCase):

    def setUp(self):
        self.instante = datetime(2026, 10, 27, 18, 0, 0, tzinfo=timezone.utc)
        self.fixture_path = Path(__file__).resolve().parent / "fixtures" / "zaffari_valido.json"
        with open(self.fixture_path, "r", encoding="utf-8") as f:
            self.fixture_data = json.load(f)

    def test_transformar_produto_valido(self):
        item_raw = self.fixture_data["C:1001"][0]
        res = transformar_produto(item_raw, "Mercearia", self.instante)

        self.assertIsNotNone(res)
        self.assertEqual(res["nome_bruto"], "Arroz Parboilizado Capellini 1kg")
        self.assertEqual(res["id_produto_origem"], "1103813")
        self.assertEqual(res["preco"], 5.49)
        self.assertEqual(res["preco_normal"], 5.99)
        self.assertTrue(res["em_promocao"])
        self.assertEqual(res["marca"], "Capellini")
        self.assertEqual(res["categoria"], "Mercearia")
        self.assertEqual(res["supermercado"], "Zaffari")
        self.assertEqual(res["imagem_url"], "https://zaffari.vteximg.com.br/arquivos/ids/12345/arroz-capellini.jpg")
        self.assertEqual(res["descricao"], "Arroz Parboilizado Capellini com grãos nobres e selecionados.")

    def test_limpar_html(self):
        html = "<div><p>Grãos <b>nobres</b> e selecionados.</p></div>"
        self.assertEqual(limpar_html(html), "Grãos nobres e selecionados.")
        self.assertIsNone(limpar_html(None))
        self.assertIsNone(limpar_html(""))

    def test_obter_url_imagem_alta_resolucao(self):
        url_thumb = "https://zaffari.vteximg.com.br/arquivos/ids/12345-200-200/foto.jpg"
        self.assertEqual(
            obter_url_imagem_alta_resolucao(url_thumb),
            "https://zaffari.vteximg.com.br/arquivos/ids/12345/foto.jpg",
        )

    def test_preco_positivo(self):
        self.assertEqual(preco_positivo(12.5), 12.5)
        with self.assertRaises(ValueError):
            preco_positivo(0)
        with self.assertRaises(ValueError):
            preco_positivo(-1)

    def test_coletar_categoria_com_fixture(self):
        buscar_fn = carregar_fixture(self.fixture_path)
        produtos, falhas = coletar_categoria("Mercearia", "C:1001", limite=5, buscar_fn=buscar_fn, pausa=0)
        self.assertEqual(len(produtos), 1)
        self.assertEqual(len(falhas), 0)
        self.assertEqual(produtos[0]["nome_bruto"], "Arroz Parboilizado Capellini 1kg")


if __name__ == "__main__":
    unittest.main()
