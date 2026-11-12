"""User-Agent identificável com contato de SMARTMARKET_CONTATO e nenhum e-mail literal no scraper."""
import os
import re
import sys
import unittest
from pathlib import Path
from unittest import mock

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

import coleta_asun
import coleta_fort_atacadista as fort
import coleta_master
import coleta_stok
import ean_pagina
import identificacao
import sincronizar_catalogo_completo as sinc

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]{2,}")
IGNORAR = {"__pycache__", ".venv", "output", ".pg-local", "htmlcov"}
CONTATO = {"SMARTMARKET_CONTATO": "github.com/codetradeai/smartmarket"}
UA = "SmartMarketBot/0.1 (projeto academico Codifica/+praTI; contato: github.com/codetradeai/smartmarket)"


def resposta(status=200, corpo=None, texto=""):
    r = mock.Mock(status_code=status, text=texto)
    r.json.return_value = corpo if corpo is not None else {}
    r.raise_for_status.return_value = None
    return r


class SemEmailNoCodigoTest(unittest.TestCase):
    def test_nenhum_arquivo_do_scraper_tem_email_literal(self):
        achados = []
        for arq in RAIZ.rglob("*"):
            if not arq.is_file() or IGNORAR & set(arq.relative_to(RAIZ).parts):
                continue
            try:
                texto = arq.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            achados += [f"{arq.relative_to(RAIZ)}:{n}" for n, linha in enumerate(texto.splitlines(), 1)
                        if EMAIL.search(linha)]
        self.assertEqual(achados, [])


class UserAgentTest(unittest.TestCase):
    def test_contato_da_variavel(self):
        self.assertEqual(identificacao.user_agent(CONTATO), UA)

    def test_sem_variavel_falha_com_mensagem_clara(self):
        with self.assertRaisesRegex(identificacao.ErroConfiguracao, "SMARTMARKET_CONTATO"):
            identificacao.user_agent({})


class ModulosUsamOUserAgentTest(unittest.TestCase):
    """Cada módulo monta o User-Agent só na hora da requisição real."""

    def test_master_e_stok_login_e_busca(self):
        for mod in (coleta_master, coleta_stok):
            with self.subTest(mod.__name__), mock.patch.dict(os.environ, CONTATO), \
                 mock.patch("requests.post", return_value=resposta(corpo={"data": "tk", "success": True})) as post, \
                 mock.patch("requests.get", return_value=resposta(corpo={"data": [], "paginator": {}})) as get:
                mod.obter_token_autenticacao(timeout=1, forcar_renovacao=True)
                mod.buscar_pagina_termo("arroz", 1, token="tk")
                self.assertEqual(post.call_args.kwargs["headers"]["User-Agent"], UA)
                self.assertEqual(get.call_args.kwargs["headers"]["User-Agent"], UA)
                self.assertNotIn("User-Agent", mod.HEADERS_BASE)

    def test_master_sem_variavel_nao_faz_requisicao(self):
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch("requests.post") as post:
            with self.assertRaises(identificacao.ErroConfiguracao):
                # forcar_renovacao: o token em cache de outro teste não pode pular a requisição
                coleta_master.obter_token_autenticacao(timeout=1, forcar_renovacao=True)
        post.assert_not_called()

    def test_fort_preenche_o_user_agent_quando_falta(self):
        with mock.patch.dict(os.environ, CONTATO), mock.patch("requests.get", return_value=resposta(corpo={})) as get:
            fort.buscar_pagina("https://x/a", headers=fort.HEADERS, params={}, timeout=1)
        self.assertEqual(get.call_args.kwargs["headers"]["User-Agent"], UA)
        self.assertNotIn("User-Agent", fort.HEADERS)

    def test_asun_identifica_o_bot_sem_origin_nem_referer_da_loja(self):
        with mock.patch.dict(os.environ, CONTATO), mock.patch("requests.get", return_value=resposta(corpo={})) as get:
            coleta_asun.buscar_pagina("https://x/a", headers=coleta_asun.HEADERS, params={}, timeout=1)
        enviados = get.call_args.kwargs["headers"]
        self.assertEqual(enviados["User-Agent"], UA)
        for navegador in ("Mozilla", "Chrome", "Safari", "AppleWebKit"):
            self.assertNotIn(navegador, enviados["User-Agent"])
        self.assertNotIn("Origin", enviados)
        self.assertNotIn("Referer", enviados)
        self.assertNotIn("User-Agent", coleta_asun.HEADERS)

    def test_asun_sem_variavel_nao_faz_requisicao(self):
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch("requests.get") as get:
            with self.assertRaises(identificacao.ErroConfiguracao):
                coleta_asun.buscar_pagina("https://x/a", headers=coleta_asun.HEADERS, params={}, timeout=1)
        get.assert_not_called()

    def test_ean_pagina(self):
        with mock.patch.dict(os.environ, CONTATO), \
             mock.patch("requests.get", return_value=resposta(texto="<html></html>")) as get:
            ean_pagina.buscar_html("https://x/p")
        self.assertEqual(get.call_args.kwargs["headers"]["User-Agent"], UA)

    def test_sincronizador_poe_o_user_agent_na_sessao(self):
        sessao = mock.Mock()
        sessao.headers = {}
        sessao.get.return_value = resposta(corpo={"hits": []})
        with mock.patch.dict(os.environ, CONTATO), mock.patch("requests.Session", return_value=sessao), \
             mock.patch("time.sleep"):
            sinc.paginar_endpoint_osuper("https://x/search", {}, "Asun", "asun")
        self.assertEqual(sessao.headers["User-Agent"], UA)
        self.assertNotIn("User-Agent", sinc.HEADERS)




class FortSemLimitesTest(unittest.TestCase):
    def test_busca_sem_limites_usa_user_agent_identificavel(self):
        r = resposta(corpo={"hits": []})
        with mock.patch.dict(os.environ, CONTATO), mock.patch("requests.get", return_value=r) as get:
            fort.coletar_termo_busca("Mercearia", "arroz", dormir=lambda s: None, max_paginas=1)
        ua = get.call_args.kwargs["headers"]["User-Agent"]
        self.assertEqual(ua, UA)
        for navegador in ("Mozilla", "Chrome", "Safari", "AppleWebKit"):
            self.assertNotIn(navegador, ua)


if __name__ == "__main__":
    unittest.main()
