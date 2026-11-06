"""Grava vínculos num PostgreSQL local descartável (exige SMARTMARKET_TEST_DSN)."""
import sys
import unittest
from uuid import uuid4
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import test_pipeline_postgres as base
from casamento import casar
from pipeline import ErroIngestao, carregar
from test_normalizacao_pipeline import registro
from vinculos import gravar_vinculos

BOMBRIL = "7891022868036"


def reg(rede_id, nome, ean, **kw):
    return registro(id_produto_origem=rede_id, nome_bruto=nome, marca="Bombril", codigo_barras=ean, **kw)


class VinculosPostgresTest(unittest.TestCase):
    setUpClass = classmethod(base.PostgresTest.setUpClass.__func__)

    def setUp(self):
        self.uid = uuid4().hex[:8]
        self.mercados = {}
        self.psycopg_conn = lambda: self.psycopg.connect(self.dsn)
        with self.psycopg_conn() as conn:
            conn.execute("DELETE FROM vinculo_produto")
            for rede in ("atacadao", "master", "stok"):
                self.mercados[rede] = conn.execute(
                    "INSERT INTO mercado(nome) VALUES(%s) RETURNING id", (rede + "_v",)).fetchone()[0]

    def carregar_rede(self, rede, rows, run):
        return carregar(rows, dsn=self.dsn, source=rede, store="loja_" + self.uid, mercado_id=self.mercados[rede], run_id=run)

    def _montar(self):
        u = self.uid
        dados = {
            "atacadao": [reg("A1" + u, "Lã de Aço Bombril 45g", BOMBRIL)],
            "master": [reg("M1" + u, "Esponja Aço Bombril Eco Com 6 Unidade", BOMBRIL)],
            "stok": [reg("S1" + u, "Esponja Bombril Aço Eco 45g Com 6 Unidades", BOMBRIL)],
        }
        for rede, rows in dados.items():
            self.carregar_rede(rede, rows, f"vinc_{rede}_{u}")
        return casar(dados)

    def linhas(self):
        with self.psycopg_conn() as conn:
            return conn.execute("SELECT produto_a_id, produto_b_id, origem, status, motivo FROM vinculo_produto "
                                "ORDER BY produto_a_id, produto_b_id").fetchall()

    def test_grava_pares_com_origem_e_status(self):
        res = self._montar()
        resumo = gravar_vinculos(res["pares"], dsn=self.dsn)
        self.assertEqual(resumo["inseridos"], 3)
        # Master ("6 Unidade") não tem medida em g/ml → medida_ausente (revisar);
        # Atacadão(45g) × Stok(45g, 6 un) → embalagem_diferente (revisar).
        self.assertEqual(resumo["revisar"], 3)
        linhas = self.linhas()
        self.assertEqual(len(linhas), 3)
        self.assertTrue(all(a < b for a, b, *_ in linhas))
        self.assertEqual({l[2] for l in linhas}, {"ean"})
        self.assertEqual(sorted(l[3] for l in linhas), ["revisar", "revisar", "revisar"])
        self.assertEqual(sorted(l[4] for l in linhas),
                         ["embalagem_diferente", "medida_ausente", "medida_ausente"])

    def test_regravar_e_idempotente(self):
        res = self._montar()
        gravar_vinculos(res["pares"], dsn=self.dsn)
        resumo = gravar_vinculos(res["pares"], dsn=self.dsn)
        self.assertEqual((resumo["inseridos"], resumo["atualizados"]), (0, 3))
        self.assertEqual(len(self.linhas()), 3)

    def test_vinculo_ean_nao_e_rebaixado_para_nome(self):
        res = self._montar()
        gravar_vinculos(res["pares"], dsn=self.dsn)
        rebaixado = [dict(p, origem="nome") for p in res["pares"]]
        gravar_vinculos(rebaixado, dsn=self.dsn)
        self.assertEqual({l[2] for l in self.linhas()}, {"ean"})

    def test_par_sem_produto_carregado_nao_e_gravado(self):
        par = {"a": {"rede": "atacadao", "id_origem": "INEXISTENTE"}, "b": {"rede": "master", "id_origem": "X"},
               "origem": "ean", "status": "confirmado", "motivo": None}
        self.assertEqual(gravar_vinculos([par], dsn=self.dsn)["nao_resolvidos"], 1)
        self.assertEqual(self.linhas(), [])

    def test_origem_ou_status_invalido_e_rejeitado(self):
        for campo, valor in (("origem", "chute"), ("status", "talvez")):
            par = {"a": {"rede": "x", "id_origem": "1"}, "b": {"rede": "y", "id_origem": "2"},
                   "origem": "ean", "status": "confirmado"}
            par[campo] = valor
            with self.assertRaises(ErroIngestao):
                gravar_vinculos([par], dsn=self.dsn)


VinculosPostgresTest = unittest.skipUnless(base.DSN, "Defina SMARTMARKET_TEST_DSN para integração PostgreSQL local")(VinculosPostgresTest)

if __name__ == "__main__":
    unittest.main()
