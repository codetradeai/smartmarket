import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from executar_pipeline import travar_exclusivo
from pipeline import ErroIngestao


class LockMultiplataformaTest(unittest.TestCase):
    def test_segundo_lock_no_mesmo_arquivo_e_recusado(self):
        with tempfile.TemporaryDirectory() as tmp:
            caminho = Path(tmp) / ".run.lock"
            with caminho.open("a") as primeiro, caminho.open("a") as segundo:
                travar_exclusivo(primeiro)
                with self.assertRaises(ErroIngestao):
                    travar_exclusivo(segundo)


if __name__ == "__main__":
    unittest.main()
