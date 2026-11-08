"""
Indisponibilidade em massa: só uma coleta COMPLETA e EXAUSTIVA pode marcar produtos
ausentes como disponivel=FALSE. Coleta parcial (status 2) ou amostral (top-N por
categoria) não prova que o produto sumiu da loja.
"""
import json
import shutil
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import rotina_carga  # noqa: E402
from rotina_carga import REDES_CONFIG, executar_ciclo_rede  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures"
DSN = "host=localhost dbname=smartmarket"


def coletor_falso(status):
    """Módulo coletor que grava dois produtos e devolve o status pedido."""
    def main(argv):
        destino = Path(argv[argv.index("--output-dir") + 1])
        (destino / "produtos_coletados.json").write_text(json.dumps([
            {"id_produto_origem": "A", "nome_bruto": "Arroz 5kg", "preco": 20.0},
            {"id_produto_origem": "B", "nome_bruto": "Feijao 1kg", "preco": 8.0},
        ]), encoding="utf-8")
        return status
    return types.SimpleNamespace(main=main)


class TestIndisponibilidadeSoComColetaExaustiva(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="smartmarket_test_indisp_"))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _ciclo(self, status, *, exaustiva):
        config = {
            "nome": "Rede Falsa", "modulo": coletor_falso(status), "source": "falsa",
            "store": "loja", "mercado_id_default": 99, "fixture_padrao": "x.json",
            "coleta_exaustiva": exaustiva,
        }
        with patch("rotina_carga.carregar", return_value={"precos_inseridos": 2}) as carregar, \
                patch("rotina_carga.conectar_banco") as conectar, \
                patch("rotina_carga.validar_dsn", return_value={"dbname": "smartmarket"}), \
                patch("rotina_carga.atualizar_indisponibilidade_produtos") as indisponivel:
            conectar.return_value.__enter__.return_value = MagicMock()
            resumo = executar_ciclo_rede("falsa", config, dsn=DSN, diretorio_base=self.tmp,
                                         permitir_banco_app=True)
        return resumo, carregar, indisponivel

    def test_coleta_parcial_status_2_carrega_mas_nao_marca_indisponivel(self):
        resumo, carregar, indisponivel = self._ciclo(2, exaustiva=True)
        self.assertTrue(carregar.called, "os preços coletados continuam sendo carregados")
        indisponivel.assert_not_called()
        self.assertEqual(resumo["status"], "parcial")
        self.assertEqual(resumo["indisponibilidade"], "ignorada_coleta_parcial")

    def test_coleta_amostral_nao_marca_indisponivel_mesmo_com_status_0(self):
        resumo, _, indisponivel = self._ciclo(0, exaustiva=False)
        indisponivel.assert_not_called()
        self.assertEqual(resumo["status"], "concluido")
        self.assertEqual(resumo["indisponibilidade"], "ignorada_coleta_amostral")

    def test_coleta_completa_e_exaustiva_marca_ausentes(self):
        resumo, _, indisponivel = self._ciclo(0, exaustiva=True)
        indisponivel.assert_called_once()
        self.assertEqual(indisponivel.call_args.args[1:4], ("falsa", "loja", 99))
        self.assertEqual(indisponivel.call_args.args[4], {"A", "B"})
        self.assertEqual(resumo["indisponibilidade"], "atualizada")

    def test_nenhuma_rede_real_e_exaustiva_enquanto_o_coletor_amostra(self):
        """Todos os coletores usam LIMITE_POR_CATEGORIA/top-N: ninguém pode ser declarado exaustivo."""
        for chave, config in REDES_CONFIG.items():
            with self.subTest(rede=chave):
                self.assertFalse(config.get("coleta_exaustiva", False))

    def test_rede_real_com_fixture_nao_dispara_update(self):
        with patch("rotina_carga.carregar", return_value={"precos_inseridos": 1}), \
                patch("rotina_carga.conectar_banco") as conectar, \
                patch("rotina_carga.validar_dsn", return_value={"dbname": "smartmarket"}):
            cursor = MagicMock()
            conectar.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = cursor
            executar_ciclo_rede("fort", REDES_CONFIG["fort"], dsn=DSN, diretorio_base=self.tmp,
                                modo_fixture=True, diretorio_fixtures=FIXTURES, permitir_banco_app=True)
        sqls = [c.args[0] for c in cursor.execute.call_args_list]
        self.assertFalse(any("UPDATE preco" in s for s in sqls))


class TestRotinaRepassaQuarentena(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="smartmarket_test_rotina_quar_"))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _ciclo(self, resumo_carga):
        config = {"nome": "Rede Falsa", "modulo": coletor_falso(0), "source": "falsa", "store": "loja",
                  "mercado_id_default": 99, "fixture_padrao": "x.json"}
        with patch("rotina_carga.carregar", return_value=resumo_carga) as carregar, \
                patch("rotina_carga.conectar_banco"), \
                patch("rotina_carga.validar_dsn", return_value={"dbname": "smartmarket"}):
            resumo = executar_ciclo_rede("falsa", config, dsn=DSN, diretorio_base=self.tmp,
                                         permitir_banco_app=True)
        return resumo, carregar

    def test_carga_recebe_o_diretorio_da_execucao_para_gravar_a_quarentena(self):
        resumo, carregar = self._ciclo({"precos_inseridos": 2, "rejeitados": []})
        self.assertEqual(Path(carregar.call_args.kwargs["diretorio_quarentena"]), Path(resumo["dir_saida"]))
        self.assertEqual(resumo["status"], "concluido")
        self.assertEqual(resumo["total_rejeitados"], 0)

    def test_rejeitados_deixam_o_ciclo_parcial_mas_nao_falho(self):
        rej = [{"indice": 1, "id_produto_origem": "B", "motivo": "preco_fora_numeric_10_2", "etapa": "validacao"}]
        resumo, _ = self._ciclo({"precos_inseridos": 1, "rejeitados": rej})
        self.assertEqual(resumo["status"], "parcial")
        self.assertEqual(resumo["total_rejeitados"], 1)
        self.assertEqual(resumo["rejeitados"], rej)


if __name__ == "__main__":
    unittest.main()
