"""Verifica que os 8 coletores respeitam a pausa mínima de 2 s entre requisições."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import coleta_asun
import coleta_atacadao
import coleta_carrefour
import coleta_fort_atacadista
import coleta_master
import coleta_rissul
import coleta_stok
import coleta_zaffari


def _pagina_completa(modulo, primeiro_id=1):
    """TAMANHO_PAGINA itens mínimos válidos com ids únicos para disparar paginação."""
    return [
        {
            "produto_id": primeiro_id + i,
            "descricao": f"Arroz Teste {primeiro_id + i} 1kg",
            "preco": "5.00",
            "imagem": "a.jpg",
            "em_oferta": False,
            "oferta": None,
        }
        for i in range(modulo.TAMANHO_PAGINA)
    ]


def _mock_duas_paginas(pagina_1):
    """Devolve a página 1 cheia; página 2 vazia → dispara exatamente um time.sleep."""
    def buscar(termo, pagina=1):
        return {"data": {"produtos": pagina_1 if pagina == 1 else []}}
    return buscar


class PausaMinimaConstanteTest(unittest.TestCase):
    """Verifica o valor da constante diretamente.

    Mutação: baixar PAUSA_ENTRE_REQUISICOES para 1.0 (ou qualquer valor < 2) quebra estes testes.
    """

    def test_constante_master_minimo_2s(self):
        self.assertGreaterEqual(
            coleta_master.PAUSA_ENTRE_REQUISICOES, 2.0,
            "PAUSA_ENTRE_REQUISICOES do Master abaixo de 2 s — risco de bloqueio por rate-limit",
        )

    def test_constante_stok_minimo_2s(self):
        self.assertGreaterEqual(
            coleta_stok.PAUSA_ENTRE_REQUISICOES, 2.0,
            "PAUSA_ENTRE_REQUISICOES do Stok abaixo de 2 s — risco de bloqueio por rate-limit",
        )


class PausaMinimaTodosColetoresTest(unittest.TestCase):
    """A constante de cada uma das 8 redes não pode ficar abaixo de 2 s."""

    def test_todos_os_coletores_minimo_2s(self):
        modulos = (
            coleta_asun, coleta_atacadao, coleta_carrefour, coleta_fort_atacadista,
            coleta_master, coleta_rissul, coleta_stok, coleta_zaffari,
        )
        for modulo in modulos:
            with self.subTest(modulo=modulo.__name__):
                self.assertGreaterEqual(modulo.PAUSA_ENTRE_REQUISICOES, 2.0)


class PausaMinimaRelogioFalsoTest(unittest.TestCase):
    """Injeta relógio falso e confirma que cada chamada a time.sleep recebe >= 2 s."""

    def _rodar_e_capturar_pausas(self, modulo, pagina_1):
        patch_target = "coleta_master.time.sleep" if modulo is coleta_master else "coleta_stok.time.sleep"
        with patch(patch_target) as mock_sleep:
            modulo.executar(
                categorias={"Arroz": "arroz"},
                limite_por_categoria=modulo.TAMANHO_PAGINA + 1,
                buscar_fn=_mock_duas_paginas(pagina_1),
                data_coleta="2026-11-06T00:00:00Z",
            )
        return [c.args[0] for c in mock_sleep.call_args_list]

    def test_master_time_sleep_recebe_minimo_2s(self):
        pausas = self._rodar_e_capturar_pausas(coleta_master, _pagina_completa(coleta_master, 100))
        self.assertTrue(pausas, "time.sleep não chamado — a paginação não foi acionada")
        for p in pausas:
            self.assertGreaterEqual(p, 2.0, f"Master: pausa {p}s < 2s mínimo")

    def test_stok_time_sleep_recebe_minimo_2s(self):
        pausas = self._rodar_e_capturar_pausas(coleta_stok, _pagina_completa(coleta_stok, 200))
        self.assertTrue(pausas, "time.sleep não chamado — a paginação não foi acionada")
        for p in pausas:
            self.assertGreaterEqual(p, 2.0, f"Stok: pausa {p}s < 2s mínimo")


if __name__ == "__main__":
    unittest.main()
