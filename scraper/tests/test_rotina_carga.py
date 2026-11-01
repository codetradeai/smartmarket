"""
Testes unitários offline para a Rotina Automática de Coleta e Carga (rotina_carga.py).
Valida concorrência (lock), orquestração de múltiplas redes, atualização de
indisponibilidade na tabela preco e geração de relatórios operacionais.
"""

import json
import os
import shutil
import tempfile
import unittest
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from unittest.mock import MagicMock, patch

from rotina_carga import (
    LockProcesso,
    REDES_CONFIG,
    atualizar_indisponibilidade_produtos,
    executar_ciclo_rede,
    executar_rodada_completa,
    garantir_mercados_existentes,
    obter_dsn,
    main,
)
from pipeline import ErroIngestao


class TestRotinaCarga(unittest.TestCase):

    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp(prefix="smartmarket_test_rotina_"))
        self.fixtures_dir = Path(__file__).resolve().parent / "fixtures"

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_01_lock_processo_adquire_e_libera(self):
        """Valida que o LockProcesso cria o arquivo com PID e remove na saída."""
        lock_file = self.temp_dir / ".teste.lock"
        self.assertFalse(lock_file.exists())

        with LockProcesso(lock_file) as lock:
            self.assertTrue(lock.adquirido)
            self.assertTrue(lock_file.exists())
            conteudo = lock_file.read_text(encoding="utf-8")
            self.assertIn(f"pid={os.getpid()}", conteudo)

        # Após o bloco with, o lock deve ter sido liberado e o arquivo excluído
        self.assertFalse(lock_file.exists())

    def test_02_lock_processo_bloqueia_concorrencia(self):
        """Valida que tentativa de lock concorrente levanta ErroIngestao."""
        lock_file = self.temp_dir / ".concorrente.lock"

        with LockProcesso(lock_file):
            with self.assertRaises(ErroIngestao) as ctx:
                with LockProcesso(lock_file):
                    pass
            self.assertIn("rotina_ja_em_execucao_lock_ativo", str(ctx.exception))

        # Após liberar o primeiro, um novo pode ser adquirido
        with LockProcesso(lock_file) as novo_lock:
            self.assertTrue(novo_lock.adquirido)

    def test_03_obter_dsn_prioridades(self):
        """Valida fallback de DSN (argumento > SMARTMARKET_DSN > SMARTMARKET_LOCAL_DSN > default)."""
        # 1. Argumento explícito tem prioridade máxima
        self.assertEqual(obter_dsn("host=meubanco"), "host=meubanco")

        # 2. Variável de ambiente SMARTMARKET_DSN
        with patch.dict(os.environ, {"SMARTMARKET_DSN": "host=env_dsn"}, clear=False):
            self.assertEqual(obter_dsn(), "host=env_dsn")

        # 3. Fallback default
        with patch.dict(os.environ, {}, clear=True):
            dsn_default = obter_dsn()
            self.assertIn("smartmarket", dsn_default)
            self.assertIn("5436", dsn_default)

    def test_04_garantir_mercados_existentes(self):
        """Valida que mercados configurados são verificados e inseridos quando ausentes."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Simula que mercados 1, 3, 4, 5, 6, 7 e 8 existem e o mercado 2 não existe
        mock_cursor.fetchone.side_effect = [
            (1, "Fort Atacadista"),
            None,
            (3, "Asun Supermercados"),
            (4, "Atacadão"),
            (5, "Master Supermercados"),
            (6, "Zaffari"),
            (7, "Rissul"),
            (8, "Stok Center"),
        ]

        garantir_mercados_existentes(mock_conn, permitir_criacao=True)

        # Deve ter consultado os oito mercados (8 selects + 1 insert)
        self.assertEqual(mock_cursor.execute.call_count, 9)
        # O insert deve ter ocorrido para o Carrefour (ID 2)
        chamadas = mock_cursor.execute.call_args_list
        insert_call = chamadas[2]
        self.assertIn("INSERT INTO mercado", insert_call[0][0])
        self.assertEqual(insert_call[0][1], (2, "Carrefour"))

    def test_05_atualizar_indisponibilidade_produtos(self):
        """Valida atualização de status para disponivel=FALSE de produtos ausentes na coleta (Cenário 3.1 BDD)."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Simula 2 produtos cadastrados no banco para esta loja: 'prod_1' e 'prod_2'
        mock_cursor.fetchall.return_value = [
            ("prod_1", 101),
            ("prod_2", 102),
        ]

        # Na coleta atual, apenas 'prod_1' foi coletado. Logo, 'prod_2' deve ser marcado indisponível.
        coletados_ids = {"prod_1"}
        atualizar_indisponibilidade_produtos(
            mock_conn,
            source="carrefour",
            store="mercado",
            mercado_id=2,
            produtos_coletados_ids=coletados_ids
        )

        # Deve ter executado SELECT na source_product e UPDATE em preco para prod_2
        self.assertEqual(mock_cursor.execute.call_count, 2)
        update_call = mock_cursor.execute.call_args_list[1]
        self.assertIn("UPDATE preco", update_call[0][0])
        self.assertIn("disponivel = FALSE", update_call[0][0])
        self.assertEqual(update_call[0][1], (102, 2))

    @patch("rotina_carga.carregar")
    @patch("rotina_carga.conectar_banco")
    @patch("rotina_carga.validar_dsn")
    def test_06_executar_ciclo_rede_com_fixture(self, mock_validar_dsn, mock_conectar, mock_carregar):
        """Valida o ciclo completo de uma rede usando fixture local."""
        mock_validar_dsn.return_value = {"dbname": "smartmarket"}
        mock_conn = MagicMock()
        mock_conectar.return_value.__enter__.return_value = mock_conn
        mock_carregar.return_value = {
            "produtos_criados": 3,
            "precos_inseridos": 3,
            "eventos_repetidos": 0,
            "reexecucao": False,
        }

        config_carrefour = REDES_CONFIG["carrefour"]
        resumo = executar_ciclo_rede(
            "carrefour",
            config_carrefour,
            dsn="host=localhost dbname=smartmarket",
            diretorio_base=self.temp_dir,
            modo_fixture=True,
            diretorio_fixtures=self.fixtures_dir,
            permitir_banco_app=True
        )

        self.assertEqual(resumo["source"], "carrefour")
        self.assertEqual(resumo["status"], "concluido")
        self.assertEqual(resumo["precos_inseridos"], 3)
        self.assertTrue(mock_carregar.called)

    @patch("rotina_carga.executar_ciclo_rede")
    @patch("rotina_carga.garantir_mercados_existentes")
    @patch("rotina_carga.conectar_banco")
    @patch("rotina_carga.validar_dsn")
    def test_07_executar_rodada_completa_gera_relatorio(self, mock_validar_dsn, mock_conectar, mock_garantir, mock_ciclo):
        """Valida que a rodada completa orquestra Fort e Carrefour e gera relatório JSON."""
        mock_validar_dsn.return_value = {"dbname": "smartmarket"}
        mock_conn = MagicMock()
        mock_conectar.return_value.__enter__.return_value = mock_conn
        mock_ciclo.side_effect = [
            {"source": "fort", "status": "concluido", "produtos_criados": 2, "precos_inseridos": 2},
            {"source": "carrefour", "status": "concluido", "produtos_criados": 3, "precos_inseridos": 3},
            {"source": "asun", "status": "concluido", "produtos_criados": 2, "precos_inseridos": 2},
            {"source": "atacadao", "status": "concluido", "produtos_criados": 1, "precos_inseridos": 1},
            {"source": "master", "status": "concluido", "produtos_criados": 2, "precos_inseridos": 2},
            {"source": "zaffari", "status": "concluido", "produtos_criados": 2, "precos_inseridos": 2},
            {"source": "rissul", "status": "concluido", "produtos_criados": 2, "precos_inseridos": 2},
            {"source": "stok", "status": "concluido", "produtos_criados": 2, "precos_inseridos": 2},
        ]

        relatorio = executar_rodada_completa(
            dsn="host=localhost dbname=smartmarket",
            diretorio_base=self.temp_dir,
            modo_fixture=True,
            diretorio_fixtures=self.fixtures_dir,
            permitir_banco_app=True
        )

        self.assertTrue(relatorio["sucesso_geral"])
        self.assertIn("fort", relatorio["redes"])
        self.assertIn("carrefour", relatorio["redes"])
        self.assertIn("asun", relatorio["redes"])
        self.assertIn("atacadao", relatorio["redes"])
        self.assertIn("master", relatorio["redes"])
        self.assertIn("zaffari", relatorio["redes"])
        self.assertIn("rissul", relatorio["redes"])
        self.assertIn("stok", relatorio["redes"])

        # Verifica se o arquivo de relatório foi gravado
        arquivo_relatorio = self.temp_dir / "relatorios" / "relatorio_rotina.json"
        self.assertTrue(arquivo_relatorio.exists())
        dados_salvos = json.loads(arquivo_relatorio.read_text(encoding="utf-8"))
        self.assertEqual(dados_salvos["modo"], "fixture")
        self.assertTrue(dados_salvos["sucesso_geral"])

    @patch("rotina_carga.executar_rodada_completa")
    def test_08_cli_main_one_shot(self, mock_rodada):
        """Valida a CLI main em modo one-shot."""
        mock_rodada.return_value = {"sucesso_geral": True}
        lock_dir = self.temp_dir / "cli_test"

        codigo = main([
            "--output-base", str(lock_dir),
            "--fixture",
            "--intervalo-minutos", "0",
        ])

        self.assertEqual(codigo, 0)
        self.assertTrue(mock_rodada.called)


if __name__ == "__main__":
    unittest.main()
