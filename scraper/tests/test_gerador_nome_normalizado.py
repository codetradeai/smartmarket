"""nome_normalizado gravado pela carga SQL precisa nascer sem acento.

O backend busca por nome comparando o termo digitado (sem acento, minúsculo) apenas com
produto.nome_normalizado. Quando a carga gravava só nome.lower(), 350 dos 530 produtos
('feijão ...', 'pão ...') nunca casavam com a busca.
"""
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import gerar_catalogo_e_sql as gerador

INSERT_PRODUTO = re.compile(
    r"INSERT INTO produto \(id, nome, nome_normalizado,.*?VALUES \(\d+, '((?:[^']|'')*)', '((?:[^']|'')*)', ")


class TestNomeNormalizadoDoGerador(unittest.TestCase):
    def _gerar_sql(self, itens):
        with tempfile.TemporaryDirectory() as tmp:
            sql = Path(tmp) / "carga.sql"
            data_js = Path(tmp) / "data.js"
            with mock.patch.object(gerador, "carregar_todos_produtos", return_value=itens), \
                 mock.patch.object(gerador, "SQL_DESTINO", sql), \
                 mock.patch.object(gerador, "DATA_JS_DESTINO", data_js), \
                 mock.patch.object(gerador, "REGISTRO_IDS", Path(tmp) / "catalogo_ids.json"), \
                 mock.patch("builtins.print"):
                gerador.gerar_sql_e_data()
            return sql.read_text(encoding="utf-8")

    def _item(self, nome):
        return {"nome_bruto": nome, "preco": 5.0, "preco_normal": 5.0,
                "supermercado": "Zaffari", "id_produto_origem": nome}

    def test_funcao_remove_acentos_caixa_e_espacos_como_o_java(self):
        casos = {
            "Pão Cacetinho Integral Pão Francês Zaffari": "pao cacetinho integral pao frances zaffari",
            "  CAFÉ   com  AÇÚCAR  ": "cafe com acucar",
            "ÀÈÌÒÙ Çãõ": "aeiou cao",
            "Ñandú Güaraná": "nandu guarana",
            "Arroz Tio João 5kg": "arroz tio joao 5kg",
        }
        for entrada, esperado in casos.items():
            with self.subTest(entrada):
                self.assertEqual(gerador.nome_normalizado(entrada), esperado)

    def test_funcao_aceita_texto_decomposto(self):
        self.assertEqual(gerador.nome_normalizado("Pão"), "pao")

    def test_sql_grava_nome_com_acento_e_nome_normalizado_sem_acento(self):
        sql = self._gerar_sql([self._item("Feijão Preto Caldão 1kg"),
                               self._item("Pão Cacetinho Integral Pão Francês Zaffari")])
        linhas = INSERT_PRODUTO.findall(sql)
        self.assertEqual(linhas, [
            ("Feijão Preto Caldão 1kg", "feijao preto caldao 1kg"),
            ("Pão Cacetinho Integral Pão Francês Zaffari", "pao cacetinho integral pao frances zaffari"),
        ])

    def test_sql_regrava_nome_normalizado_quando_o_produto_ja_existe(self):
        sql = self._gerar_sql([self._item("Feijão Preto Caldão 1kg")])
        insert = next(l for l in sql.splitlines() if l.startswith("INSERT INTO produto"))
        self.assertIn("nome_normalizado = EXCLUDED.nome_normalizado", insert)


if __name__ == "__main__":
    unittest.main()
