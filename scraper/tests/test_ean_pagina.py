import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import ean_pagina
from ean_pagina import BloqueioDetectado, enriquecer_com_ean, extrair_ean_html


class ExtrairEanHtmlTest(unittest.TestCase):
    def test_vtex_io_chave_ean(self):
        html = '..."nameComplete":"Óleo Coamo 900ml","complementName":"","ean":"7896279600538","variations":[]...'
        self.assertEqual(extrair_ean_html(html), "7896279600538")

    def test_json_ld_gtin_do_carrefour(self):
        html = '"availability":"http://schema.org/InStock"},"gtin":"7893500020134","category":"/Mercearia"'
        self.assertEqual(extrair_ean_html(html), "7893500020134")

    def test_ignora_codigo_interno_e_pega_o_primeiro_valido(self):
        html = '"ean":"01097696","x":1,"ean":"7896279600538"'
        self.assertEqual(extrair_ean_html(html), "7896279600538")

    def test_sem_ean_ou_invalido(self):
        for html in ('<html></html>', '"ean":""', '"ean":"7896279600539"', None, 123):
            with self.subTest(html=html):
                self.assertIsNone(extrair_ean_html(html))


class EnriquecerTest(unittest.TestCase):
    def test_pausa_minima_de_2s_e_uma_requisicao_por_vez(self):
        pausas, urls = [], []
        paginas = {"u1": '"ean":"7896279600538"', "u2": '"gtin":"7893500020134"', "u3": "sem ean"}

        def buscar(url):
            urls.append(url)
            return paginas[url]

        prods = [{"u": "u1"}, {"u": "u2"}, {"u": "u3"}]
        resumo = enriquecer_com_ean(prods, url_de=lambda p: p["u"], buscar=buscar,
                                    dormir=pausas.append, pausa=2.0)
        self.assertEqual([p["codigo_barras"] for p in prods], ["7896279600538", "7893500020134", None])
        self.assertEqual(pausas, [2.0, 2.0])  # entre requisições, nunca antes da primeira
        self.assertEqual(resumo["com_ean"], 2)
        self.assertEqual(urls, ["u1", "u2", "u3"])

    def test_pausa_pedida_menor_que_2s_e_elevada_para_2s(self):
        pausas = []
        enriquecer_com_ean([{"u": "a"}, {"u": "b"}], url_de=lambda p: p["u"],
                           buscar=lambda url: "", dormir=pausas.append, pausa=0.1)
        self.assertEqual(pausas, [2.0])
        self.assertEqual(ean_pagina.PAUSA_MINIMA_S, 2.0)

    def test_para_no_primeiro_bloqueio_sem_insistir(self):
        chamadas = []

        def buscar(url):
            chamadas.append(url)
            if url == "u2":
                raise BloqueioDetectado("429")
            return '"ean":"7896279600538"'

        prods = [{"u": "u1"}, {"u": "u2"}, {"u": "u3"}]
        resumo = enriquecer_com_ean(prods, url_de=lambda p: p["u"], buscar=buscar, dormir=lambda s: None)
        self.assertTrue(resumo["interrompido_por_bloqueio"])
        self.assertEqual(chamadas, ["u1", "u2"])
        self.assertNotIn("codigo_barras", prods[2])

    def test_falha_isolada_nao_derruba_os_demais(self):
        def buscar(url):
            if url == "u1":
                raise OSError("timeout")
            return '"ean":"7896279600538"'

        prods = [{"u": "u1"}, {"u": "u2"}]
        resumo = enriquecer_com_ean(prods, url_de=lambda p: p["u"], buscar=buscar, dormir=lambda s: None)
        self.assertEqual(resumo["falhas"], 1)
        self.assertEqual(prods[1]["codigo_barras"], "7896279600538")

    def test_user_agent_identificavel(self):
        import os
        from unittest import mock
        with mock.patch.dict(os.environ, {"SMARTMARKET_CONTATO": "github.com/codetradeai/smartmarket"}),              mock.patch("requests.get", return_value=mock.Mock(status_code=200, text="")) as get:
            ean_pagina.buscar_html("https://exemplo/p")
        ua = get.call_args.kwargs["headers"]["User-Agent"]
        self.assertIn("SmartMarketBot", ua)
        self.assertIn("contato", ua)
        self.assertNotIn("Mozilla", ua)


if __name__ == "__main__":
    unittest.main()
