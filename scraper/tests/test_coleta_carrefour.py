import importlib.util
import json
import logging
import sys
import tempfile
import types
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock, patch

SCRAPER = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("carrefour", SCRAPER / "coleta_carrefour.py")
carrefour = importlib.util.module_from_spec(spec)
spec.loader.exec_module(carrefour)

FIXTURES = Path(__file__).parent / "fixtures"
INSTANTE = datetime(2026, 10, 14, 15, 30, tzinfo=timezone(timedelta(hours=-3)))


def item_carrefour(name="Arroz Namorado 5Kg", price=20.19, list_price=25.19, brand="Namorado", product_id="5852"):
    return {
        "productName": name,
        "productId": product_id,
        "brand": brand,
        "link": f"/{name.lower().replace(' ', '-')}/p",
        "items": [
            {
                "sellers": [
                    {
                        "commertialOffer": {
                            "Price": price,
                            "ListPrice": list_price,
                            "spotPrice": price,
                            "AvailableQuantity": 100,
                        }
                    }
                ]
            }
        ]
    }


class TransformacaoCarrefourTest(unittest.TestCase):
    def transformar(self, value):
        return carrefour.transformar_item(value, "Graos", INSTANTE)

    def test_item_valido_e_contrato_compativel(self):
        row = self.transformar(item_carrefour())
        self.assertEqual(tuple(row), carrefour.CAMPOS)
        self.assertEqual(row["preco"], 20.19)
        self.assertEqual(row["preco_normal"], 25.19)
        self.assertTrue(row["em_promocao"])
        self.assertEqual(row["nome_bruto"], "Arroz Namorado 5Kg")
        self.assertEqual(row["marca"], "Namorado")
        self.assertEqual(row["id_produto_origem"], "5852")
        self.assertEqual(row["supermercado"], "Carrefour")

    def test_sem_promocao_quando_preco_igual_ou_menor(self):
        row = self.transformar(item_carrefour(price=20.0, list_price=20.0))
        self.assertFalse(row["em_promocao"])

    def test_promocao_sem_preco_normal(self):
        raw = item_carrefour()
        raw["items"][0]["sellers"][0]["commertialOffer"]["ListPrice"] = None
        row = self.transformar(raw)
        self.assertEqual(row["preco"], 20.19)
        self.assertIsNone(row["preco_normal"])
        self.assertFalse(row["em_promocao"])

    def test_precos_invalidos_rejeitados(self):
        for value in [None, 0, -1, True, False, "", "R$ 5,00", "NaN", "Infinity", {}, []]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.transformar(item_carrefour(price=value))

    def test_preco_normal_invalido_rejeita(self):
        with self.assertRaises(ValueError):
            self.transformar(item_carrefour(price=20.0, list_price=-5))

    def test_decimal_string_aceita_sem_perda(self):
        row = self.transformar(item_carrefour(price="20.19", list_price="25.19"))
        self.assertEqual(row["preco"], 20.19)
        self.assertEqual(row["preco_normal"], 25.19)

    def test_item_ou_campos_obrigatorios_invalidos(self):
        for val in [None, [], {}, {"productName": "  "}, {"productName": 123}]:
            with self.subTest(val=val), self.assertRaises(ValueError):
                self.transformar(val)

    def test_timestamp_utc_com_fuso(self):
        text = self.transformar(item_carrefour())["data_coleta"]
        self.assertEqual(text, "2026-10-14T18:30:00+00:00")
        self.assertEqual(datetime.fromisoformat(text), INSTANTE)

    def test_rejeita_instante_sem_fuso(self):
        with self.assertRaises(ValueError):
            carrefour.transformar_item(item_carrefour(), "Graos", datetime(2026, 10, 14))


class StreamCarrefourTest(unittest.TestCase):
    def test_extrair_produtos_de_html_sem_stream_lanca_erro(self):
        with self.assertRaises(carrefour.ErroColeta):
            carrefour.extrair_produtos_html("<html><body>Sem stream</body></html>")

    def test_extrair_produtos_de_stream_valido(self):
        data = [
            {"_1": 2},
            "products",
            [3],
            {"_4": 5, "_6": 7, "_8": 9, "_10": 11, "_12": 13},
            "productName",
            "Feijao Carioca Camil 1kg",
            "productId",
            "2925",
            "brand",
            "Camil",
            "link",
            "/feijao-carioca/p",
            "items",
            [14],
            {"_15": 16},
            "sellers",
            [17],
            {"_18": 19},
            "commertialOffer",
            {"_20": 21, "_22": 23, "_24": 25},
            "Price",
            7.59,
            "ListPrice",
            9.49,
            "spotPrice",
            7.59
        ]
        stream_content = json.dumps(json.dumps(data))
        html = f"""
        <!DOCTYPE html><html><head>
        <script>window.__reactRouterContext.streamController.enqueue({stream_content});</script>
        </head><body></body></html>
        """
        prods = carrefour.extrair_produtos_html(html)
        self.assertEqual(len(prods), 1)
        self.assertEqual(prods[0]["productName"], "Feijao Carioca Camil 1kg")
        self.assertEqual(prods[0]["brand"], "Camil")


class ColetaCarrefourTest(unittest.TestCase):
    def test_item_invalido_nao_interrompe_lote(self):
        falhas = []
        bom = item_carrefour(name="Arroz Bom", price=15.0)
        ruim = item_carrefour(name="Arroz Ruim", price=-10.0)

        def fake_buscar(url, headers, timeout):
            return "<html>mock</html>"

        with unittest.mock.patch.object(carrefour, "extrair_produtos_html", side_effect=[[ruim, bom], []]):
            with self.assertLogs(carrefour.LOGGER, level="WARNING"):
                rows = carrefour.coletar_categoria(
                    "Graos", "https://mock.url",
                    buscar=fake_buscar, falhas=falhas,
                    dormir=lambda _: None, agora=lambda: INSTANTE
                )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["nome_bruto"], "Arroz Bom")
        self.assertEqual(len(falhas), 1)
        self.assertEqual(falhas[0]["indice"], 0)

    def test_cliente_http_converte_erros_sem_vazar_resposta(self):
        class RequestError(Exception): pass
        requests_mock = types.SimpleNamespace(RequestException=RequestError, get=Mock())
        requests_mock.get.side_effect = RequestError("conteudo_privado")
        with patch.dict(sys.modules, {"requests": requests_mock}), self.assertRaises(carrefour.ErroColeta) as exc:
            carrefour.buscar_pagina_html("https://example.invalid", headers={}, timeout=10)
        self.assertNotIn("conteudo_privado", str(exc.exception))


class ExecucaoOfflineCarrefourTest(unittest.TestCase):
    def test_fixture_valida_gera_json_csv_relatorio_sem_rede(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(carrefour, "buscar_pagina_html", side_effect=AssertionError("rede proibida")):
            code = carrefour.main(["--fixture", str(FIXTURES / "carrefour_valido.json"), "--output-dir", directory])
            output = Path(directory)
            rows = json.loads((output / "produtos_coletados.json").read_text(encoding="utf-8"))
            report = json.loads((output / "relatorio_coleta.json").read_text(encoding="utf-8"))
            self.assertEqual(code, 0)
            self.assertEqual(len(rows), 2)
            self.assertEqual(report["status"], "concluido")
            self.assertEqual(report["modo"], "fixture")
            self.assertEqual(report["supermercado"], "Carrefour")
            self.assertEqual((output / "produtos_coletados.csv").read_text(encoding="utf-8").splitlines()[0], ",".join(carrefour.CAMPOS))

    def test_fixture_parcial_preserva_itens_e_sinaliza_status(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(carrefour, "buscar_pagina_html", side_effect=AssertionError("rede proibida")):
            code = carrefour.main(["--fixture", str(FIXTURES / "carrefour_parcial.json"), "--output-dir", directory])
            report = json.loads((Path(directory) / "relatorio_coleta.json").read_text(encoding="utf-8"))
            self.assertEqual(code, 2)
            self.assertEqual(report["aceitos"], 1)
            self.assertEqual(len(report["falhas"]), 2)
            self.assertEqual(report["status"], "parcial")

    def test_falha_total_preserva_saida_anterior(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            (output / "fixture.json").write_text("{}", encoding="utf-8")
            (output / "produtos_coletados.json").write_text('["anterior"]', encoding="utf-8")
            (output / "produtos_coletados.csv").write_text("anterior", encoding="utf-8")
            self.assertEqual(carrefour.main(["--fixture", str(output / "fixture.json"), "--output-dir", directory]), 1)
            self.assertEqual((output / "produtos_coletados.json").read_text(encoding="utf-8"), '["anterior"]')
            self.assertEqual((output / "produtos_coletados.csv").read_text(encoding="utf-8"), "anterior")
            report = json.loads((output / "relatorio_coleta.json").read_text(encoding="utf-8"))
            self.assertFalse(report["saida_atualizada"])
            self.assertEqual(report["status"], "falhou")

    def test_escrita_interrompida_preserva_arquivo(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "saida.json"
            path.write_text("anterior", encoding="utf-8")
            def falhar(arquivo):
                arquivo.write("incompleto")
                raise OSError("falha simulada")
            with self.assertRaises(OSError):
                carrefour.salvar_atomico(path, falhar)
            self.assertEqual(path.read_text(encoding="utf-8"), "anterior")


if __name__ == "__main__":
    unittest.main()
