"""
A coleta HTTP real exige SMARTMARKET_CONTATO (identificacao.com_user_agent). Os dois
pontos de agendamento do repositório (cron e systemd) precisam definir a variável, senão
Fort, Master e Stok falham com ErroConfiguracao antes de fazer a requisição.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRAPER = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRAPER))

from identificacao import VAR_CONTATO  # noqa: E402

CRON = SCRAPER / "cron_coleta_diaria.sh"
SERVICO = SCRAPER / "smartmarket-scraper.service"


class TestContatoNoAgendamento(unittest.TestCase):
    def test_systemd_define_a_variavel_com_valor_nao_vazio(self):
        texto = SERVICO.read_text(encoding="utf-8")
        achados = re.findall(rf"^Environment=\"?{VAR_CONTATO}=(\S+?)\"?\s*$", texto, flags=re.M)
        self.assertEqual(len(achados), 1, "o .service deve definir SMARTMARKET_CONTATO uma vez")
        self.assertTrue(achados[0].strip())

    def test_cron_exporta_a_variavel_antes_da_rotina(self):
        texto = CRON.read_text(encoding="utf-8")
        self.assertRegex(texto, rf"(?m)^export {VAR_CONTATO}=")
        self.assertLess(texto.index(f"export {VAR_CONTATO}="), texto.index("scraper/rotina_carga.py"))

    @unittest.skipUnless(shutil.which("bash"), "bash indisponível")
    def test_cron_tem_sintaxe_bash_valida(self):
        subprocess.run(["bash", "-n", str(CRON)], check=True)

    @unittest.skipUnless(shutil.which("bash"), "bash indisponível")
    def test_cron_propaga_a_variavel_para_o_python_com_e_sem_valor_previo(self):
        """Executa só o trecho de configuração do script e confere o valor visto por um filho."""
        trecho = "\n".join(l for l in CRON.read_text(encoding="utf-8").splitlines()
                           if l.startswith(("set -", f"export {VAR_CONTATO}=")))
        with tempfile.TemporaryDirectory() as tmp:
            script = Path(tmp) / "trecho.sh"
            script.write_text(trecho + f'\nprintf "%s" "${{{VAR_CONTATO}}}"\n', encoding="utf-8")
            base = {k: v for k, v in os.environ.items() if k != VAR_CONTATO}
            padrao = subprocess.run(["bash", str(script)], env=base, capture_output=True, text=True, check=True)
            self.assertTrue(padrao.stdout.strip(), "sem valor prévio deve haver um contato padrão")
            custom = subprocess.run(["bash", str(script)], env={**base, VAR_CONTATO: "https://exemplo.org/contato"},
                                    capture_output=True, text=True, check=True)
            self.assertEqual(custom.stdout, "https://exemplo.org/contato", "o valor do operador prevalece")


if __name__ == "__main__":
    unittest.main()
