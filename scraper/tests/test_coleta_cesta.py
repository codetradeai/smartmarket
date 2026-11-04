"""Coleta da cesta: robots.txt, fluxo por candidato, parada no bloqueio e resumo (tudo offline)."""
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import coleta_cesta as cc
import relatorio_casamento as rc

UA = "SmartMarketBot/0.1 (teste)"


class RobotsTest(unittest.TestCase):
    URL = "https://www.atacadao.com.br/api/catalog_system/pub/products/search"

    def test_404_e_sem_restricoes(self):
        self.assertEqual(cc.decidir_robots(404, "", self.URL, UA), (True, "robots.txt 404: sem restrições"))

    def test_5xx_ou_falha_bloqueia(self):
        self.assertFalse(cc.decidir_robots(503, "", self.URL, UA)[0])
        self.assertFalse(cc.decidir_robots(None, "", self.URL, UA)[0])

    def test_disallow_api_bloqueia_o_endpoint(self):
        texto = "User-agent: *\nDisallow: /api/\n"
        self.assertEqual(cc.decidir_robots(200, texto, self.URL, UA), (False, "bloqueado pelo robots.txt"))

    def test_regras_que_nao_cobrem_o_endpoint_permitem(self):
        texto = "User-agent: *\nDisallow: /checkout\nDisallow: /api/io/login\n"
        self.assertTrue(cc.decidir_robots(200, texto, self.URL, UA)[0])

    def test_endpoints_cobrem_as_tres_redes_e_um_robots_por_host(self):
        sessao = rc.Sessao(rc.LimitadorPorHost(dormir=lambda s: None), ua=UA)
        pedidos = []

        def buscar(url):
            pedidos.append(url)
            return mock.Mock(status_code=404, text="")

        resultado = cc.verificar_robots(sessao, buscar=buscar)
        self.assertEqual({r["rede"] for r in resultado}, {"atacadao", "master", "stok"})
        self.assertEqual(sorted(pedidos), ["https://services.vipcommerce.com.br/robots.txt",
                                           "https://www.atacadao.com.br/robots.txt"])
        self.assertTrue(all(r["permitido"] for r in resultado))


def reg(rede, nome, ean, preco, id_origem="1"):
    return {"rede": rede, "id_origem": id_origem, "nome": nome, "ean": ean, "preco": preco,
            "preco_normal": preco, "em_promocao": False, "coletado_em": "2026-11-03T22:00:00+00:00"}


class ConsultasFalsas:
    """origem: {id: registro|False}; ean: {(rede, ean): registro|False}; bloqueia_em: id que dispara 429."""

    def __init__(self, sessao, origem, ean, bloqueia_em=None):
        self.sessao, self.origem, self.ean, self.bloqueia_em = sessao, origem, ean, bloqueia_em
        self.chamadas = 0

    def na_origem(self, cand):
        self.chamadas += 1
        if cand["id"] == self.bloqueia_em:
            self.sessao.depois("https://services.vipcommerce.com.br/x", 429)
            return None
        return self.origem.get(cand["id"], False)

    def por_ean(self, rede, ean):
        self.chamadas += 1
        return self.ean.get((rede, ean), False)


def cand(id_, rede="stok", nome="Produto"):
    return {"id": id_, "rede": rede, "idOrigem": "1", "nome": nome}


class ColetaTest(unittest.TestCase):
    EAN = "07896005800010"

    def setUp(self):
        self.sessao = rc.Sessao(rc.LimitadorPorHost(dormir=lambda s: None), ua=UA)

    def test_preco_em_tres_redes_com_status_por_par(self):
        origem = {"p1": reg("stok", "Arroz Camil Tipo 1 5kg", self.EAN, 25.9)}
        ean = {("atacadao", self.EAN): reg("atacadao", "Arroz Branco Camil T1 5kg", self.EAN, 24.5),
               ("master", self.EAN): reg("master", "Arroz Camil Tipo 1 1kg", self.EAN, 6.2)}
        (r,) = cc.coletar([cand("p1")], self.sessao, ConsultasFalsas(self.sessao, origem, ean))

        self.assertEqual(sorted(r["precos"]), ["atacadao", "master", "stok"])
        status = {p["rede_b"]: (p["status"], p["motivo"]) for p in r["pares"]}
        self.assertEqual(status["atacadao"], ("confirmado", None))
        self.assertEqual(status["master"], ("revisar", "quantidade_diferente"))
        self.assertTrue(all(p["coletado_em"] for p in r["precos"].values()))

    def test_situacoes_sem_origem_e_sem_ean(self):
        origem = {"p2": reg("master", "Sal 1kg", None, 2.0)}
        rs = cc.coletar([cand("p1"), cand("p2", "master")], self.sessao, ConsultasFalsas(self.sessao, origem, {}))
        self.assertEqual([r["situacao"] for r in rs], ["nao_encontrado_na_origem", "sem_ean_valido"])
        self.assertEqual(rs[1]["pares"], [])

    def test_para_no_primeiro_bloqueio_e_nao_segue_para_os_proximos(self):
        origem = {"p1": reg("stok", "Café 500g", self.EAN, 18.0)}
        consultas = ConsultasFalsas(self.sessao, origem, {}, bloqueia_em="p2")
        rs = cc.coletar([cand("p1"), cand("p2"), cand("p3"), cand("p4")], self.sessao, consultas)
        self.assertEqual([r["id"] for r in rs], ["p1", "p2"])
        self.assertEqual(rs[-1]["situacao"], "interrompido")
        self.assertEqual(self.sessao.bloqueio.status, 429)

    def test_timeout_para_a_coleta_sem_nova_tentativa_e_guarda_o_que_ja_veio(self):
        import requests
        origem = {"p1": reg("stok", "Café 500g", self.EAN, 18.0), "p2": reg("stok", "Sal 1kg", "07896006744115", 2.0)}
        consultas = ConsultasFalsas(self.sessao, origem, {})
        original = consultas.por_ean
        chamadas = []

        def por_ean(rede, ean):
            chamadas.append((rede, ean))
            if ean == "07896006744115":
                raise requests.exceptions.ReadTimeout("Read timed out. (read timeout=25)")
            return original(rede, ean)

        consultas.por_ean = por_ean
        vistos = []
        rs = cc.coletar([cand("p1"), cand("p2"), cand("p3")], self.sessao, consultas,
                        progresso=lambda i, it: vistos.append(it["id"]))
        self.assertEqual([r["situacao"] for r in rs], ["ok", "erro_rede"])
        self.assertEqual(vistos, ["p1", "p2"])  # o progresso (que grava o arquivo) viu os dois
        self.assertIn("ReadTimeout", self.sessao.erro_rede)
        self.assertEqual(sum(1 for _, e in chamadas if e == "07896006744115"), 1)  # sem nova tentativa

    def test_resumo(self):
        origem = {"p1": reg("stok", "Arroz 5kg", self.EAN, 25.9), "p2": reg("stok", "Feijão 1kg", "07896006744115", 8.0)}
        ean = {("atacadao", self.EAN): reg("atacadao", "Arroz 5kg", self.EAN, 24.5)}
        rs = cc.coletar([cand("p1"), cand("p2"), cand("p3")], self.sessao, ConsultasFalsas(self.sessao, origem, ean))
        r = cc.resumo(rs)
        self.assertEqual((r["com_ean_valido"], r["com_preco_em_2_ou_mais_redes"], r["pares_confirmado"], r["pares_revisar"]),
                         (2, 1, 1, 0))


class MainTest(unittest.TestCase):
    def test_grava_a_saida_a_cada_candidato_e_marca_conclusao(self):
        import json
        import tempfile
        gravacoes = []

        def coletar_falso(candidatos, sessao, progresso=None):
            for i, c in enumerate(candidatos, 1):
                progresso(i, {"id": c["id"], "situacao": "ok", "ean": None, "precos": {}, "pares": []})
                gravacoes.append(json.loads(next(Path(tmp).glob("cesta_*.json")).read_text(encoding="utf-8")))

        with tempfile.TemporaryDirectory() as tmp:
            cands = Path(tmp) / "c.json"
            cands.write_text(json.dumps([cand("p1"), cand("p2")]), encoding="utf-8")
            with mock.patch.dict(os.environ, {"SMARTMARKET_CONTATO": "teste"}), \
                 mock.patch.object(cc, "verificar_robots", return_value=[{"permitido": True, "rede": "x", "metodo": "GET",
                                                                           "endpoint": "e", "motivo": "m", "robots": "r"}]), \
                 mock.patch.object(cc, "coletar", side_effect=coletar_falso), mock.patch("builtins.print"):
                self.assertEqual(cc.main(["--candidatos", str(cands), "--saida", tmp]), 0)
            final = json.loads(next(Path(tmp).glob("cesta_*.json")).read_text(encoding="utf-8"))
        self.assertEqual([len(g["resultados"]) for g in gravacoes], [1, 2])
        self.assertFalse(gravacoes[0]["meta"]["concluida"])
        self.assertTrue(final["meta"]["concluida"])


    def test_sem_contato_nao_faz_requisicao(self):
        with mock.patch.dict(os.environ, {}, clear=True), \
             mock.patch("requests.get") as g, mock.patch("requests.post") as p, \
             mock.patch("builtins.print"):
            self.assertEqual(cc.main(["--so-robots"]), 2)
        g.assert_not_called()
        p.assert_not_called()


if __name__ == "__main__":
    unittest.main()
