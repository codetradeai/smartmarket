import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ean import digito_verificador_valido, ean_canonico, tipo_ean, validar_ean


class ValidarEanTest(unittest.TestCase):
    def test_tipos_validos(self):
        casos = {
            "7896011906881": "EAN-13",
            "036000291452": "UPC-A",
            "73513537": "EAN-8",
            "10012345678902": "GTIN-14",
        }
        for codigo, tipo in casos.items():
            with self.subTest(codigo=codigo):
                self.assertEqual(validar_ean(codigo), codigo)
                self.assertEqual(tipo_ean(codigo), tipo)

    def test_digito_verificador_errado_e_rejeitado(self):
        self.assertIsNone(validar_ean("7896011906882"))
        self.assertFalse(digito_verificador_valido("7896011906882"))

    def test_codigos_internos_do_master_sao_descartados(self):
        for interno in ("364670001", "49072", "39870001"):
            with self.subTest(interno=interno):
                self.assertIsNone(validar_ean(interno, aceitar_ean8=False))
        # 5 e 9 dígitos nunca são EAN, nem com EAN-8 aceito
        self.assertIsNone(validar_ean("49072"))
        self.assertIsNone(validar_ean("364670001"))

    def test_ean8_ocasional_de_codigo_interno_pode_ser_recusado(self):
        # "39870001" passa no dígito verificador por acaso: só fontes que
        # recusam EAN-8 conseguem descartá-lo.
        self.assertEqual(validar_ean("39870001"), "39870001")
        self.assertIsNone(validar_ean("39870001", aceitar_ean8=False))

    def test_formatos_invalidos(self):
        for lixo in (None, True, "", "   ", "abc", "78960119068a1", "7896-0119-0688-1", 7.896e12, [], "0000000000000"):
            with self.subTest(lixo=lixo):
                self.assertIsNone(validar_ean(lixo))

    def test_espacos_nas_pontas_sao_ignorados_e_inteiro_aceito(self):
        self.assertEqual(validar_ean(" 7896011906881 "), "7896011906881")
        self.assertEqual(validar_ean(7896011906881), "7896011906881")

    def test_canonico_une_upc_e_ean13_com_zero(self):
        self.assertEqual(ean_canonico("036000291452"), ean_canonico("0036000291452"))
        self.assertEqual(ean_canonico("036000291452"), "00036000291452")
        self.assertIsNone(ean_canonico("123"))


if __name__ == "__main__":
    unittest.main()
