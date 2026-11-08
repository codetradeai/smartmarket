"""
Garante que a rotina consegue conduzir o coletor REAL de cada rede em modo fixture.

Regressão: Asun e Atacadão declaravam ``main()`` sem argv e a rotina, que chama
``modulo.main([...])``, quebrava com TypeError todo dia. Aqui só o banco é
substituído; o módulo coletor de cada rede NÃO é mockado.
"""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from rotina_carga import REDES_CONFIG, executar_ciclo_rede  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures"


class TestRotinaComColetoresReais(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="smartmarket_test_redes_"))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _ciclo(self, chave):
        with patch("rotina_carga.carregar") as carregar, \
                patch("rotina_carga.conectar_banco") as conectar, \
                patch("rotina_carga.validar_dsn", return_value={"dbname": "smartmarket"}), \
                patch("rotina_carga.atualizar_indisponibilidade_produtos"):
            carregar.return_value = {"produtos_criados": 1, "precos_inseridos": 1}
            conectar.return_value.__enter__.return_value = MagicMock()
            resumo = executar_ciclo_rede(
                chave, REDES_CONFIG[chave],
                dsn="host=localhost dbname=smartmarket",
                diretorio_base=self.tmp,
                modo_fixture=True,
                diretorio_fixtures=FIXTURES,
                permitir_banco_app=True,
            )
        return resumo, carregar

    def test_cada_rede_roda_com_o_coletor_real_em_modo_fixture(self):
        for chave in REDES_CONFIG:
            with self.subTest(rede=chave):
                resumo, carregar = self._ciclo(chave)
                self.assertIn(resumo["status"], ("concluido", "parcial"))
                self.assertTrue(carregar.called, "a carga deve receber os registros coletados")
                registros = carregar.call_args.args[0]
                self.assertGreater(len(registros), 0)
                self.assertGreater(resumo["total_coletados"], 0)
                saida = Path(resumo["dir_saida"])
                self.assertTrue((saida / "produtos_coletados.json").exists())
                self.assertTrue((saida / "produtos_coletados.csv").exists())


class TestMainAsunAtacadao(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="smartmarket_test_main_"))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _rodar(self, modulo, fixture):
        return modulo.main(["--fixture", str(FIXTURES / fixture), "--output-dir", str(self.tmp)])

    def test_asun_grava_json_e_csv_com_ids_e_precos(self):
        import coleta_asun
        self._rodar(coleta_asun, "asun_valido.json")
        dados = json.loads((self.tmp / "produtos_coletados.json").read_text(encoding="utf-8"))
        ids = {d["id_produto_origem"] for d in dados}
        self.assertEqual(ids, {"cafe-asun-1", "filtro-asun-1", "leite-asun-1"})
        self.assertTrue((self.tmp / "produtos_coletados.csv").exists())

    def test_atacadao_grava_json_e_csv_com_ids_e_precos(self):
        import coleta_atacadao
        self._rodar(coleta_atacadao, "atacadao_valido.json")
        dados = json.loads((self.tmp / "produtos_coletados.json").read_text(encoding="utf-8"))
        self.assertEqual([d["id_produto_origem"] for d in dados], ["atacadao-1"])
        self.assertEqual(dados[0]["preco"], 28.9)
        self.assertTrue((self.tmp / "produtos_coletados.csv").exists())

    def test_fixture_invalida_retorna_1_sem_gravar(self):
        import coleta_asun
        import coleta_atacadao
        for modulo in (coleta_asun, coleta_atacadao):
            with self.subTest(modulo=modulo.__name__):
                codigo = modulo.main(["--fixture", str(self.tmp / "nao_existe.json"),
                                      "--output-dir", str(self.tmp)])
                self.assertEqual(codigo, 1)
                self.assertFalse((self.tmp / "produtos_coletados.json").exists())

    def test_sem_produtos_retorna_1_e_preserva_saida_anterior(self):
        import coleta_asun
        vazio = self.tmp / "vazio.json"
        vazio.write_text("{}", encoding="utf-8")
        anterior = self.tmp / "produtos_coletados.json"
        anterior.write_text('["anterior"]', encoding="utf-8")
        codigo = coleta_asun.main(["--fixture", str(vazio), "--output-dir", str(self.tmp)])
        self.assertEqual(codigo, 1)
        self.assertEqual(anterior.read_text(encoding="utf-8"), '["anterior"]')


if __name__ == "__main__":
    unittest.main()
