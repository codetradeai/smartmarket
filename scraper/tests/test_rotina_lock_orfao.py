"""
Lock da rotina: um processo morto (SIGKILL, OOM, queda de energia) não pode travar a
coleta para sempre. O lock órfão deve ser detectado e recuperado; o lock de um
processo vivo continua bloqueando.
"""
import os
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline import ErroIngestao  # noqa: E402
from rotina_carga import LockProcesso, processo_existe  # noqa: E402


def pid_de_processo_morto():
    proc = subprocess.Popen([sys.executable, "-c", "pass"])
    proc.wait()
    return proc.pid


class TestLockOrfao(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="smartmarket_test_lock_"))
        self.lock = self.tmp / ".rotina.lock"

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_processo_existe_distingue_vivo_de_morto(self):
        self.assertTrue(processo_existe(os.getpid()))
        self.assertFalse(processo_existe(pid_de_processo_morto()))

    def test_lock_de_processo_morto_e_recuperado(self):
        morto = pid_de_processo_morto()
        self.lock.write_text(f"pid={morto}\n", encoding="utf-8")

        with LockProcesso(self.lock) as lock:
            self.assertTrue(lock.adquirido)
            self.assertIn(f"pid={os.getpid()}", self.lock.read_text(encoding="utf-8"))

        self.assertFalse(self.lock.exists(), "o lock recuperado também é liberado ao sair")

    def test_lock_de_processo_vivo_continua_bloqueando(self):
        self.lock.write_text(f"pid={os.getpid()}\n", encoding="utf-8")
        with self.assertRaises(ErroIngestao) as ctx:
            with LockProcesso(self.lock):
                pass
        self.assertIn("rotina_ja_em_execucao_lock_ativo", str(ctx.exception))
        self.assertIn(f"pid={os.getpid()}", self.lock.read_text(encoding="utf-8"),
                      "lock de quem está vivo não pode ser apagado")

    def test_lock_sem_pid_recente_bloqueia_porque_o_dono_pode_estar_gravando(self):
        self.lock.write_text("", encoding="utf-8")
        with self.assertRaises(ErroIngestao):
            with LockProcesso(self.lock):
                pass
        self.assertTrue(self.lock.exists())

    def test_lock_sem_pid_e_antigo_e_recuperado(self):
        self.lock.write_text("lixo", encoding="utf-8")
        antigo = time.time() - 3600
        os.utime(self.lock, (antigo, antigo))
        with LockProcesso(self.lock) as lock:
            self.assertTrue(lock.adquirido)

    def test_recuperacao_nao_apaga_lock_que_mudou_de_dono(self):
        """Se o dono mudou entre a leitura e a limpeza, o lock novo é respeitado."""
        morto = pid_de_processo_morto()
        self.lock.write_text(f"pid={morto}\n", encoding="utf-8")

        def morto_mas_outro_assume(pid):
            # Outro processo (vivo) assume o lock logo depois que lemos o pid antigo.
            self.lock.write_text(f"pid={os.getpid()}\n", encoding="utf-8")
            return False

        with mock.patch("rotina_carga.processo_existe", morto_mas_outro_assume):
            with self.assertRaises(ErroIngestao):
                with LockProcesso(self.lock):
                    pass
        self.assertIn(f"pid={os.getpid()}", self.lock.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
