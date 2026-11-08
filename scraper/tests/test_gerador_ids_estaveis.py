"""O SQL e o data.js gerados precisam de ids estáveis, sequências ajustadas e recusa de entrada vazia.

Antes, produto.id era a posição do item na lista concatenada dos JSONs (prod_id = 1, += 1):
quando um produto sumia da coleta, todos os seguintes deslocavam de id e a reexecução do psql
gravava imagem, descrição e preço no produto errado. O SQL também não ajustava as sequências
(setval), então o próximo INSERT sem id da carga do pipeline (RETURNING id) colidia com a chave
primária. E, sem nenhum JSON de entrada, o gerador sobrescrevia data.js e o SQL versionados com
catálogo vazio e saía com código 0.
"""
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import gerar_catalogo_e_sql as gerador

INSERT_PRODUTO = re.compile(
    r"INSERT INTO produto \(id, nome, nome_normalizado,.*?VALUES \((\d+), '((?:[^']|'')*)', ")
MARCADOR = "export const PRODUCTS = "


def item(nome, origem, supermercado="Zaffari", preco=5.0, **extra):
    base = {"nome_bruto": nome, "preco": preco, "preco_normal": preco,
            "supermercado": supermercado, "id_produto_origem": origem}
    base.update(extra)
    return base


class _Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        tmp = Path(self._tmp.name)
        self.sql = tmp / "carga.sql"
        self.data_js = tmp / "data.js"
        self.registro = tmp / "catalogo_ids.json"
        for alvo, valor in (("SQL_DESTINO", self.sql), ("DATA_JS_DESTINO", self.data_js),
                            ("REGISTRO_IDS", self.registro)):
            patcher = mock.patch.object(gerador, alvo, valor)
            patcher.start()
            self.addCleanup(patcher.stop)
        patcher = mock.patch("builtins.print")
        patcher.start()
        self.addCleanup(patcher.stop)

    def gerar(self, itens):
        with mock.patch.object(gerador, "carregar_todos_produtos", return_value=itens):
            gerador.gerar_sql_e_data()
        return self.sql.read_text(encoding="utf-8")

    def ids_do_sql(self, sql):
        return {nome: int(i) for i, nome in INSERT_PRODUTO.findall(sql)}

    def produtos_do_data_js(self):
        texto = self.data_js.read_text(encoding="utf-8")
        return json.loads(texto[texto.index(MARCADOR) + len(MARCADOR):].rstrip().rstrip(";"))


class TestIdsEstaveis(_Base):
    def test_produto_que_some_nao_desloca_os_ids_dos_outros(self):
        a, b, c = item("Arroz A 1kg", "1"), item("Feijao B 1kg", "2"), item("Cafe C 500g", "3")
        antes = self.ids_do_sql(self.gerar([a, b, c]))
        depois = self.ids_do_sql(self.gerar([b, c]))
        self.assertEqual(depois["Feijao B 1kg"], antes["Feijao B 1kg"])
        self.assertEqual(depois["Cafe C 500g"], antes["Cafe C 500g"])

    def test_produto_novo_no_comeco_nao_desloca_os_ids_existentes(self):
        a, b = item("Arroz A 1kg", "1"), item("Feijao B 1kg", "2")
        antes = self.ids_do_sql(self.gerar([a, b]))
        depois = self.ids_do_sql(self.gerar([item("Leite D 1l", "4"), a, b]))
        self.assertEqual(depois["Arroz A 1kg"], antes["Arroz A 1kg"])
        self.assertEqual(depois["Feijao B 1kg"], antes["Feijao B 1kg"])
        self.assertNotIn(depois["Leite D 1l"], antes.values())

    def test_ordem_da_lista_nao_muda_o_id(self):
        a, b = item("Arroz A 1kg", "1"), item("Feijao B 1kg", "2")
        antes = self.ids_do_sql(self.gerar([a, b]))
        depois = self.ids_do_sql(self.gerar([b, a]))
        self.assertEqual(antes, depois)

    def test_id_de_produto_que_sumiu_nao_e_reaproveitado_por_outro(self):
        a, b, c = item("Arroz A 1kg", "1"), item("Feijao B 1kg", "2"), item("Cafe C 500g", "3")
        id_c = self.ids_do_sql(self.gerar([a, b, c]))["Cafe C 500g"]
        self.gerar([a, b])
        novo = self.ids_do_sql(self.gerar([a, b, item("Leite D 1l", "4")]))["Leite D 1l"]
        self.assertNotEqual(novo, id_c)

    def test_mesmo_id_de_origem_em_redes_diferentes_sao_produtos_diferentes(self):
        ids = self.ids_do_sql(self.gerar([item("Arroz Z 1kg", "1", "Zaffari"),
                                          item("Arroz F 1kg", "1", "Fort Atacadista")]))
        self.assertEqual(len(set(ids.values())), 2)

    def test_sem_id_de_origem_a_chave_e_o_nome_normalizado(self):
        sem_origem = item("Pão Francês 1kg", None)
        antes = self.ids_do_sql(self.gerar([item("Outro 1kg", "9"), sem_origem]))
        depois = self.ids_do_sql(self.gerar([sem_origem]))
        self.assertEqual(depois["Pão Francês 1kg"], antes["Pão Francês 1kg"])

    def test_item_repetido_na_mesma_coleta_vira_um_produto_so(self):
        sql = self.gerar([item("Arroz A 1kg", "1", preco=5.0), item("Arroz A 1kg", "1", preco=5.0)])
        self.assertEqual(len(INSERT_PRODUTO.findall(sql)), 1)
        self.assertEqual(len(self.produtos_do_data_js()), 1)

    def test_data_js_usa_exatamente_os_mesmos_ids_do_sql(self):
        itens = [item("Arroz A 1kg", "1"), item("Feijao B 1kg", "2")]
        ids_sql = self.ids_do_sql(self.gerar(itens))
        ids_js = {p["name"]: p["id"] for p in self.produtos_do_data_js()}
        self.assertEqual(ids_js, {n: f"p{i}" for n, i in ids_sql.items()})

    def test_registro_nao_gravado_com_ids_diferentes_entre_execucoes(self):
        itens = [item("Arroz A 1kg", "1"), item("Feijao B 1kg", "2")]
        self.gerar(itens)
        primeiro = self.registro.read_text(encoding="utf-8")
        self.gerar(itens)
        self.assertEqual(self.registro.read_text(encoding="utf-8"), primeiro)

    def test_registro_ausente_aproveita_os_ids_do_data_js_existente(self):
        existente = [{"id": "p7", "name": "Arroz A 1kg", "supermercadoOrigem": "Zaffari", "idOrigem": "1"},
                     {"id": "p12", "name": "Feijao B 1kg", "supermercadoOrigem": "Zaffari", "idOrigem": "2"}]
        self.data_js.write_text("// x\n" + MARCADOR + json.dumps(existente) + ";\n", encoding="utf-8")
        ids = self.ids_do_sql(self.gerar([item("Leite D 1l", "4"), item("Feijao B 1kg", "2"),
                                          item("Arroz A 1kg", "1")]))
        self.assertEqual(ids["Arroz A 1kg"], 7)
        self.assertEqual(ids["Feijao B 1kg"], 12)
        self.assertEqual(ids["Leite D 1l"], 13)


class TestSqlReexecutavel(_Base):
    def setUp(self):
        super().setUp()
        self.sql_texto = self.gerar([item("Arroz A 1kg", "1", marca="Camil", em_promocao=True,
                                          preco=4.0, preco_normal=5.0)])

    def test_conflito_atualiza_todas_as_colunas_descritivas(self):
        insert = next(l for l in self.sql_texto.splitlines() if l.startswith("INSERT INTO produto"))
        for coluna in ("nome", "nome_normalizado", "marca", "unidade", "categoria", "imagem_url", "descricao"):
            self.assertIn(f"{coluna} = EXCLUDED.{coluna}", insert)

    def test_sequencias_sao_ajustadas_antes_do_commit(self):
        corpo, _, _ = self.sql_texto.rpartition("COMMIT;")
        for tabela in ("mercado", "produto", "preco", "promocao"):
            self.assertRegex(corpo, rf"setval\(pg_get_serial_sequence\('{tabela}', 'id'\)", tabela)

    def test_setval_funciona_em_tabela_vazia(self):
        # setval(seq, 0) falha ("value 0 is out of bounds"); com tabela vazia o valor tem de ser 1, is_called=false.
        self.assertIn("COALESCE(MAX(id), 1), MAX(id) IS NOT NULL", self.sql_texto)

    def test_preco_do_mesmo_dia_nao_duplica_na_reexecucao(self):
        linha = next(l for l in self.sql_texto.splitlines() if l.startswith("INSERT INTO preco"))
        self.assertIn("WHERE NOT EXISTS", linha)
        self.assertIn("coletado_em::date = CURRENT_DATE", linha)

    def test_promocao_do_mesmo_dia_nao_duplica_na_reexecucao(self):
        linha = next(l for l in self.sql_texto.splitlines() if l.startswith("INSERT INTO promocao"))
        self.assertIn("WHERE NOT EXISTS", linha)


class TestRecusaEntradaVazia(_Base):
    SQL_VERSIONADO = "-- sql versionado\nBEGIN;\nCOMMIT;\n"
    JS_VERSIONADO = "// catalogo versionado\nexport const PRODUCTS = [{\"id\": \"p1\"}];\n"
    REGISTRO_VERSIONADO = '{"versao": 1, "proximo_id": 2, "ids": {"zaffari:1": 1}}\n'

    def setUp(self):
        super().setUp()
        self.sql.write_text(self.SQL_VERSIONADO, encoding="utf-8")
        self.data_js.write_text(self.JS_VERSIONADO, encoding="utf-8")
        self.registro.write_text(self.REGISTRO_VERSIONADO, encoding="utf-8")

    def _assert_intactos(self):
        self.assertEqual(self.sql.read_text(encoding="utf-8"), self.SQL_VERSIONADO)
        self.assertEqual(self.data_js.read_text(encoding="utf-8"), self.JS_VERSIONADO)
        self.assertEqual(self.registro.read_text(encoding="utf-8"), self.REGISTRO_VERSIONADO)

    def test_lista_vazia_levanta_erro_e_nao_toca_nos_arquivos(self):
        with mock.patch.object(gerador, "carregar_todos_produtos", return_value=[]):
            with self.assertRaises(gerador.EntradaVaziaError):
                gerador.gerar_sql_e_data()
        self._assert_intactos()

    def test_itens_sem_nome_tambem_contam_como_vazio(self):
        with mock.patch.object(gerador, "carregar_todos_produtos",
                               return_value=[{"nome_bruto": "  "}, {"preco": 3}]):
            with self.assertRaises(gerador.EntradaVaziaError):
                gerador.gerar_sql_e_data()
        self._assert_intactos()

    def test_main_sai_com_codigo_diferente_de_zero(self):
        with mock.patch.object(gerador, "carregar_todos_produtos", return_value=[]), \
             mock.patch("sys.stderr"):
            codigo = gerador.main([])
        self.assertNotEqual(codigo, 0)
        self._assert_intactos()

    def test_main_com_entrada_valida_sai_com_zero(self):
        with mock.patch.object(gerador, "carregar_todos_produtos", return_value=[item("Arroz A 1kg", "1")]):
            self.assertEqual(gerador.main([]), 0)
        self.assertIn("Arroz A 1kg", self.sql.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
