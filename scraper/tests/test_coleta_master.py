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

    def test_processar_item_clube_master(self):
        item_raw = {
            "produto_id": 30120,
            "descricao": "Café Melitta Tradicional 500g",
            "preco": "24.90",
            "em_oferta": False,
            "oferta": {
                "nome": "Clube Master",
                "preco_oferta": "19.90",
                "preco_antigo": "24.90"
            }
        }
        res = processar_item(item_raw, "Café", self.data_coleta)
        self.assertIsNotNone(res)
        self.assertEqual(res["preco"], 19.90)
        self.assertEqual(res["preco_normal"], 24.90)
        self.assertTrue(res["em_promocao"])
        self.assertTrue(res["is_clube"])
        self.assertEqual(res["clube_nome"], "Clube Master")

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




class TestCsvComClube(unittest.TestCase):
    """Regressão: o CSV falhava com exit 1 por is_clube/clube_nome fora de CAMPOS."""

    def test_salvar_arquivos_gera_csv_com_campos_de_clube(self):
        import csv
        import tempfile
        from coleta_master import salvar_arquivos, processar_item

        item = {"produto_id": 1, "descricao": "Arroz Teste 1kg", "preco": "5.00", "imagem": "a.jpg",
                "em_oferta": True, "oferta": {"nome": "Clube", "preco_antigo": "6.00", "preco_oferta": "4.50"}}
        prod = processar_item(item, "Arroz", "2026-11-02T00:00:00Z")
        self.assertTrue(prod["is_clube"])
        with tempfile.TemporaryDirectory() as tmp:
            salvar_arquivos([prod], Path(tmp))
            with open(Path(tmp) / "produtos_coletados.csv", encoding="utf-8", newline="") as f:
                linhas = list(csv.DictReader(f))
        self.assertEqual(linhas[0]["is_clube"], "True")
        self.assertEqual(linhas[0]["clube_nome"], "Clube Master")


class TestCodigoBarras(unittest.TestCase):
    def _item(self, codigo):
        return {"produto_id": 9, "descricao": "Arroz Teste 1kg", "preco": "5.00", "imagem": "a.jpg",
                "em_oferta": False, "oferta": None, "codigo_barras": codigo}

    def test_captura_ean_valido(self):
        from coleta_master import processar_item
        res = processar_item(self._item("7896011906881"), "Arroz", "2026-11-03T00:00:00Z")
        self.assertEqual(res["codigo_barras"], "7896011906881")

    def test_descarta_codigos_internos(self):
        from coleta_master import processar_item
        for interno in ("364670001", "49072", "39870001", "", None):
            with self.subTest(interno=interno):
                res = processar_item(self._item(interno), "Arroz", "2026-11-03T00:00:00Z")
                self.assertIsNone(res["codigo_barras"])

    def test_campo_no_contrato_csv(self):
        from coleta_master import CAMPOS
        self.assertIn("codigo_barras", CAMPOS)


class TestUserAgentIdentificavel(unittest.TestCase):
    def test_user_agent_e_identificavel_e_nao_finge_ser_navegador(self):
        import os
        from unittest import mock
        import coleta_master
        resp = mock.Mock(status_code=200)
        resp.json.return_value = {"data": "tk"}
        with mock.patch.dict(os.environ, {"SMARTMARKET_CONTATO": "github.com/codetradeai/smartmarket"}), mock.patch("requests.post", return_value=resp) as post:
            coleta_master.obter_token_autenticacao(timeout=1, forcar_renovacao=True)
        ua = post.call_args.kwargs["headers"]["User-Agent"]
        self.assertIn("SmartMarketBot", ua)
        self.assertIn("contato", ua)
        self.assertNotIn("Mozilla", ua)


if __name__ == "__main__":
    unittest.main()
