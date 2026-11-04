"""Garante que nenhum preço é simulado por fator fixo (Fase B do diagnóstico)."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import gerar_catalogo_e_sql as gerador
import sincronizar_catalogo_completo as sincronizador
import verificar_e_atualizar_precos as verificador

REDES = {"zaffari", "rissul", "asun", "stok", "atacadao", "master", "fort", "carrefour"}


class TestGeradorSemFatores(unittest.TestCase):
    def test_montar_precos_so_rede_de_origem(self):
        self.assertEqual(gerador.montar_precos("rissul", 10.0), {"rissul": 10.0})

    def _gerar(self, itens):
        with tempfile.TemporaryDirectory() as tmp:
            sql = Path(tmp) / "carga.sql"
            data_js = Path(tmp) / "data.js"
            with mock.patch.object(gerador, "carregar_todos_produtos", return_value=itens), \
                 mock.patch.object(gerador, "SQL_DESTINO", sql), \
                 mock.patch.object(gerador, "DATA_JS_DESTINO", data_js), \
                 mock.patch("builtins.print"):
                gerador.gerar_sql_e_data()
            texto = data_js.read_text(encoding="utf-8")
            produtos = json.loads(texto[texto.index("export const PRODUCTS = ") + len("export const PRODUCTS = "):].rstrip().rstrip(";"))
            return produtos, sql.read_text(encoding="utf-8")

    def test_catalogo_gerado_nao_inventa_precos_de_outras_redes(self):
        itens = [
            {"nome_bruto": "Arroz Tipo 1 1kg", "preco": 5.0, "preco_normal": 5.0,
             "supermercado": "Zaffari", "id_produto_origem": "1"},
            {"nome_bruto": "Feijao Preto 1kg", "preco": 8.0, "preco_normal": 8.0,
             "supermercado": "Asun Supermercados", "id_produto_origem": "2"},
        ]
        produtos, _ = self._gerar(itens)
        self.assertEqual(produtos[0]["prices"], {"zaffari": 5.0})
        self.assertEqual(produtos[1]["prices"], {"asun": 8.0})
        for p in produtos:
            self.assertLess(len(p["prices"]), len(REDES))

    def test_promocao_sem_validade_grava_null(self):
        sql = gerador.sql_promocao(1, 3, 10.0, 8.0)
        self.assertIn("CURRENT_TIMESTAMP, NULL, TRUE", sql)
        self.assertNotIn("INTERVAL", sql)

    def test_promocao_com_validade_informada_pela_rede(self):
        sql = gerador.sql_promocao(1, 3, 10.0, 8.0, "2026-12-31")
        self.assertIn("'2026-12-31'", sql)

    def test_sql_gerado_nao_contem_validade_fixa(self):
        itens = [{"nome_bruto": "Arroz Tipo 1 1kg", "preco": 5.0, "preco_normal": 6.0,
                  "em_promocao": True, "supermercado": "Zaffari", "id_produto_origem": "1"}]
        _, sql = self._gerar(itens)
        self.assertIn("INSERT INTO promocao", sql)
        self.assertNotIn("INTERVAL '7 days'", sql)


class TestSincronizadorSemFatores(unittest.TestCase):
    def test_produto_novo_tem_preco_apenas_da_rede_coletada(self):
        online = [{
            "idOrigem": "99", "nome": "Cafe Teste 500g", "marca": "Teste", "descricao": "",
            "categorias_api": [], "supermercado": "Fort Atacadista", "rede_key": "fort",
            "preco": 20.0, "precoNormal": None, "promo": False, "is_clube": False,
            "clube_nome": None, "imagem": "", "slug": "cafe-teste", "frames_3d": [], "has_3d": False,
        }]
        salvo = {}
        with mock.patch.object(sincronizador, "carregar_catalogo", return_value=("", [])), \
             mock.patch.object(sincronizador, "coletar_produtos_3d_e_precos", return_value=online), \
             mock.patch.object(sincronizador, "salvar_catalogo", side_effect=lambda c, p: salvo.update(p=p)), \
             mock.patch("builtins.print"):
            sincronizador.sincronizar()
        self.assertEqual(salvo["p"][0]["prices"], {"fort": 20.0})
        self.assertEqual(salvo["p"][0]["menorPreco"], 20.0)
        self.assertEqual(salvo["p"][0]["mercadoMenorPreco"], "fort")


class TestVerificadorMercadoId(unittest.TestCase):
    def test_asun_usa_mercado_id_do_mapa(self):
        sql = verificador.sql_atualizacao_preco("p1", "Cafe Teste", "asun", 24.9)
        self.assertEqual(gerador.MERCADOS_MAP["asun"]["id"], 3)
        self.assertIn("), 3, 24.90, NOW()", sql)
        self.assertNotIn("), 1, ", sql)

    def test_fort_usa_mercado_id_do_mapa(self):
        sql = verificador.sql_atualizacao_preco("p1", "Cafe Teste", "fort", 20.0)
        self.assertIn("), 1, 20.00, NOW()", sql)

    def test_nome_com_aspas_e_escapado(self):
        sql = verificador.sql_atualizacao_preco("p1", "Leite d'Ouro", "asun", 5.0)
        self.assertIn("nome = 'Leite d''Ouro'", sql)

    def test_todo_mercado_do_mapa_gera_sql_valido(self):
        for chave, dados in gerador.MERCADOS_MAP.items():
            sql = verificador.sql_atualizacao_preco("p1", "X", chave, 1.0)
            self.assertIn(f", {dados['id']}, 1.00,", sql)


class TestSincronizadorEducado(unittest.TestCase):
    def test_user_agent_identificavel_e_sem_origin_forjado(self):
        sessao = mock.Mock()
        sessao.headers = {}
        sessao.get.return_value = mock.Mock(status_code=200, json=lambda: {"total": 0, "hits": [], "hasNext": False})
        with mock.patch.dict(os.environ, {"SMARTMARKET_CONTATO": "github.com/codetradeai/smartmarket"}),              mock.patch.object(sincronizador.requests, "Session", return_value=sessao),              mock.patch.object(sincronizador.LIMITADOR, "aguardar"):
            sincronizador.paginar_endpoint_osuper("http://x", {}, "Asun", "asun")
        ua = sessao.headers["User-Agent"]
        self.assertIn("SmartMarketBot", ua)
        self.assertIn("contato", ua)
        self.assertNotIn("Origin", sessao.headers)
        self.assertNotIn("Referer", sessao.headers)

    def test_pausa_minima_de_2_segundos(self):
        self.assertGreaterEqual(sincronizador.PAUSA_MINIMA_S, 2.0)
        self.assertGreaterEqual(sincronizador.LIMITADOR.intervalo, 2.0)

    def test_limitador_dorme_o_que_falta_para_o_intervalo(self):
        agora = [100.0]
        pausas = []

        def dormir(s):
            pausas.append(s)
            agora[0] += s

        lim = sincronizador.Limitador(2.0, relogio=lambda: agora[0], dormir=dormir)
        lim.aguardar()            # primeira chamada não espera
        agora[0] += 0.5
        lim.aguardar()            # passaram 0,5 s: falta 1,5 s
        agora[0] += 5.0
        lim.aguardar()            # passaram 5 s: não espera
        self.assertEqual(len(pausas), 1)
        self.assertAlmostEqual(pausas[0], 1.5)

    def test_coleta_e_sequencial_e_respeita_o_limitador(self):
        ativas = []
        maximo = [0]
        chamadas_limitador = []

        def falso_paginar(url, params, nome, rede):
            ativas.append(1)
            maximo[0] = max(maximo[0], len(ativas))
            ativas.pop()
            return []

        with mock.patch.object(sincronizador, "paginar_endpoint_osuper", side_effect=falso_paginar) as pag:
            sincronizador.coletar_produtos_3d_e_precos()
        self.assertEqual(maximo[0], 1)
        self.assertGreater(pag.call_count, 7)
        self.assertFalse(hasattr(sincronizador, "ThreadPoolExecutor"))

    @mock.patch.dict(os.environ, {"SMARTMARKET_CONTATO": "github.com/codetradeai/smartmarket"})
    def test_paginar_aguarda_limitador_antes_de_cada_requisicao(self):
        eventos = []

        class Resp:
            status_code = 200

            def __init__(self, n):
                self.n = n

            def json(self):
                return {"total": 10, "hits": [], "hasNext": False} if self.n else {
                    "total": 10, "hasNext": True,
                    "hits": [{"id": 1, "name": "Arroz 1kg", "pricing": {"price": 5.0}}]}

        class Sessao:
            headers = {}
            n = 0

            def get(self, url, params=None, timeout=None):
                eventos.append("get")
                r = Resp(Sessao.n)
                Sessao.n += 1
                return r

        with mock.patch.object(sincronizador.requests, "Session", return_value=Sessao()),              mock.patch.object(sincronizador.LIMITADOR, "aguardar", side_effect=lambda: eventos.append("espera")):
            itens = sincronizador.paginar_endpoint_osuper("http://x", {}, "Asun", "asun")
        self.assertEqual(len(itens), 1)
        self.assertEqual(eventos, ["espera", "get", "espera", "get"])


if __name__ == "__main__":
    unittest.main()
