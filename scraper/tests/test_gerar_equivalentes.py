"""gerar_equivalentes: contrato do arquivo, determinismo e atualidade de frontend/src/data/equivalentes.json."""
import contextlib
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ_SCRAPER = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ_SCRAPER))

import gerar_equivalentes as ge

REPO = RAIZ_SCRAPER.parent
DATA_JS = REPO / "frontend" / "src" / "data.js"
EQUIVALENTES = REPO / "frontend" / "src" / "data" / "equivalentes.json"

CONFIANCA_DA_CAMADA = {"T0": "provavel", "T1": "confirmado", "T2": "confirmado", "T3": "provavel", "T4": "provavel"}


def produto(id_, nome, rede, preco=10.0, marca="Marca", categoria="leites", unit="1L", foto=None):
    p = {"id": id_, "name": nome, "brand": marca, "category": categoria, "unit": unit,
         "prices": {rede: preco} if preco is not None else {}, "idOrigem": f"{rede}-{id_}"}
    if foto:
        p["imageUrl"] = foto
    return p


def executar(args):
    """main() sem poluir a saída dos testes."""
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        return ge.main(args)


def escrever_data_js(pasta, produtos):
    caminho = Path(pasta) / "data.js"
    caminho.write_text("// Catálogo de teste\n\nexport const CATEGORIES = [\n  { id: 'todos' },\n]\n\n"
                       "export const PRODUCTS = " + json.dumps(produtos, ensure_ascii=False, indent=2) + ";\n",
                       encoding="utf-8")
    return caminho


CATALOGO = [
    produto("p1", "Leite Marca Integral 1L", "fort"),
    produto("p2", "Leite Integral Marca 1 Litro", "asun", 9.5),
    produto("p3", "Leite Marca Integral 1000ml", "stok", 9.9),
    produto("p4", "Leite Marca Desnatado 1L", "fort"),
    produto("p5", "Leite Marca Integral 1L", "zaffari", None),  # sem preço: não entra no casamento
    produto("p10", "Cerveja Marca Pilsen Lata 350ml", "fort", categoria="bebidas", unit="350ml"),
    produto("p11", "Cerveja Marca Pilsen 350ml", "asun", categoria="bebidas", unit="350ml"),
]


class CarregarProdutosTest(unittest.TestCase):
    def test_converte_o_catalogo_em_registros_e_ignora_produto_sem_preco(self):
        with tempfile.TemporaryDirectory() as tmp:
            regs, ignorados = ge.carregar_produtos(escrever_data_js(tmp, CATALOGO))
        por_id = {r["id"]: r for r in regs}
        self.assertEqual(ignorados, 1)
        self.assertNotIn("p5", por_id)
        self.assertEqual(por_id["p2"], {"id": "p2", "nome": "Leite Integral Marca 1 Litro", "marca": "Marca", "cat": "leites",
                                        "unidade": "1L", "rede": "asun", "preco": 9.5, "idOrigem": "asun-p2", "imageUrl": None})


class GerarArquivoTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.data_js = escrever_data_js(self._tmp.name, CATALOGO)
        self.destino = Path(self._tmp.name) / "saida" / "equivalentes.json"

    def test_grava_o_contrato_com_grupos_ordenados_e_ids_sequenciais(self):
        ge.gerar(self.data_js, self.destino)
        arq = json.loads(self.destino.read_text(encoding="utf-8"))
        self.assertEqual(sorted(arq), ["grupos", "versao"])
        self.assertEqual(arq["grupos"][0], {"id": "g1", "confianca": "confirmado", "camada": "T2", "itens": ["p1", "p2", "p3"]})
        self.assertEqual([g["id"] for g in arq["grupos"]], [f"g{i}" for i in range(1, len(arq["grupos"]) + 1)])
        self.assertEqual(arq["grupos"][1]["itens"], ["p10", "p11"])
        self.assertEqual(arq["grupos"][1]["confianca"], "provavel")
        for g in arq["grupos"]:
            self.assertEqual(list(g), ["id", "confianca", "camada", "itens"])

    def test_versao_e_o_hash_curto_do_conteudo(self):
        ge.gerar(self.data_js, self.destino)
        arq = json.loads(self.destino.read_text(encoding="utf-8"))
        canonico = json.dumps(arq["grupos"], ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        self.assertEqual(arq["versao"], hashlib.sha256(canonico.encode("utf-8")).hexdigest()[:12])

    def test_duas_execucoes_geram_o_mesmo_arquivo_byte_a_byte(self):
        ge.gerar(self.data_js, self.destino)
        primeiro = self.destino.read_bytes()
        mudou = ge.gerar(self.data_js, self.destino)["mudou"]
        self.assertFalse(mudou)
        self.assertEqual(self.destino.read_bytes(), primeiro)
        outro = Path(self._tmp.name) / "outro.json"
        ge.gerar(self.data_js, outro)
        self.assertEqual(outro.read_bytes(), primeiro)

    def test_a_versao_muda_quando_os_grupos_mudam(self):
        ge.gerar(self.data_js, self.destino)
        antes = json.loads(self.destino.read_text(encoding="utf-8"))["versao"]
        catalogo = [p for p in CATALOGO if p["id"] != "p3"]
        escrever_data_js(self._tmp.name, catalogo)
        resultado = ge.gerar(self.data_js, self.destino)
        self.assertTrue(resultado["mudou"])
        self.assertNotEqual(json.loads(self.destino.read_text(encoding="utf-8"))["versao"], antes)

    def test_verificar_acusa_arquivo_desatualizado(self):
        self.assertEqual(executar(["--data-js", str(self.data_js), "--saida", str(self.destino), "--verificar"]), 1)  # não existe
        self.assertEqual(executar(["--data-js", str(self.data_js), "--saida", str(self.destino)]), 0)
        self.assertEqual(executar(["--data-js", str(self.data_js), "--saida", str(self.destino), "--verificar"]), 0)
        self.destino.write_text(self.destino.read_text(encoding="utf-8").replace("p10", "p99"), encoding="utf-8")
        self.assertEqual(executar(["--data-js", str(self.data_js), "--saida", str(self.destino), "--verificar"]), 1)

    def test_fim_de_linha_sempre_lf_e_termina_com_quebra(self):
        ge.gerar(self.data_js, self.destino)
        bruto = self.destino.read_bytes()
        self.assertNotIn(b"\r", bruto)
        self.assertTrue(bruto.endswith(b"\n"))


class ArquivoCommitadoTest(unittest.TestCase):
    """O equivalentes.json versionado cumpre o contrato e está em dia com o data.js."""

    @classmethod
    def setUpClass(cls):
        cls.arquivo = json.loads(EQUIVALENTES.read_text(encoding="utf-8"))
        texto = DATA_JS.read_text(encoding="utf-8")
        corpo = texto[texto.index("export const PRODUCTS = ") + len("export const PRODUCTS = "):]
        cls.catalogo = {p["id"]: p for p in json.loads(corpo[:corpo.rindex("]") + 1])}

    def test_formato_do_contrato(self):
        self.assertEqual(sorted(self.arquivo), ["grupos", "versao"])
        self.assertRegex(self.arquivo["versao"], r"^[0-9a-f]{12}$")
        self.assertGreater(len(self.arquivo["grupos"]), 0)
        for i, g in enumerate(self.arquivo["grupos"], 1):
            self.assertEqual(g["id"], f"g{i}")
            self.assertIn(g["camada"], CONFIANCA_DA_CAMADA)
            self.assertEqual(g["confianca"], CONFIANCA_DA_CAMADA[g["camada"]])
            self.assertGreaterEqual(len(g["itens"]), 2)

    def test_ids_existem_no_catalogo_e_cada_id_esta_em_um_so_grupo(self):
        vistos = {}
        for g in self.arquivo["grupos"]:
            for item in g["itens"]:
                self.assertRegex(item, r"^p\d+$")
                self.assertIn(item, self.catalogo, f"{item} não existe no data.js")
                self.assertNotIn(item, vistos, f"{item} está em {vistos.get(item)} e em {g['id']}")
                vistos[item] = g["id"]

    def test_itens_de_cada_grupo_sao_de_redes_diferentes(self):
        for g in self.arquivo["grupos"]:
            redes = [next(iter(self.catalogo[i]["prices"])) for i in g["itens"]]
            self.assertEqual(len(redes), len(set(redes)), f"{g['id']} repete rede: {redes}")

    def test_confirmado_so_vem_de_camadas_estritas(self):
        for g in self.arquivo["grupos"]:
            if g["confianca"] == "confirmado":
                self.assertIn(g["camada"], ("T1", "T2"))

    def test_camada_t5_nao_entra(self):
        self.assertNotIn("T5", {g["camada"] for g in self.arquivo["grupos"]})

    def test_casos_conhecidos_nao_sao_confirmados(self):
        nomes = {i: self.catalogo[i]["name"].lower() for g in self.arquivo["grupos"] if g["confianca"] == "confirmado" for i in g["itens"]}
        for g in self.arquivo["grupos"]:
            if g["confianca"] != "confirmado":
                continue
            textos = [nomes[i] for i in g["itens"]]
            for padrao in (r"zero", r"diet", r"light"):
                ocorrencias = {bool(re.search(padrao, t)) for t in textos}
                self.assertEqual(len(ocorrencias), 1, f"{g['id']} mistura {padrao}: {textos}")

    def test_brahma_chopp_e_coca_sem_x_zero_acucar_nunca_ficam_confirmados(self):
        import casamento_camadas as cc
        achados = {"chopp": 0, "sem_x_zero": 0}
        for g in self.arquivo["grupos"]:
            nomes = [cc.sem_acento(self.catalogo[i]["name"]) for i in g["itens"]]
            chopp = {"chopp" in n for n in nomes}
            formas = {cc.forma_zero(n) for n in nomes} - {None}
            if len(chopp) > 1:
                achados["chopp"] += 1
                self.assertEqual(g["confianca"], "provavel", f"{g['id']} confirmado mistura 'chopp': {nomes}")
            if formas == {"zero", "sem"}:
                achados["sem_x_zero"] += 1
                self.assertEqual(g["confianca"], "provavel", f"{g['id']} confirmado mistura 'sem' e 'zero' açúcar: {nomes}")
        # os dois casos existem no catálogo real; se sumirem, o teste deixou de proteger algo
        self.assertGreater(achados["chopp"], 0)
        self.assertGreater(achados["sem_x_zero"], 0)

    def test_arquivo_em_dia_com_o_data_js(self):
        with tempfile.TemporaryDirectory() as tmp:
            destino = Path(tmp) / "equivalentes.json"
            ge.gerar(DATA_JS, destino)
            self.assertEqual(destino.read_bytes(), EQUIVALENTES.read_bytes(),
                             "equivalentes.json desatualizado: rode python scraper/gerar_equivalentes.py")

    def test_resultado_nao_depende_da_ordem_dos_produtos_no_catalogo(self):
        import random
        import casamento_camadas as cc
        registros, _ = ge.carregar_produtos(DATA_JS)
        esperado = cc.casar_registros(registros)["grupos"]
        for semente in (1, 2):
            embaralhado = list(registros)
            random.Random(semente).shuffle(embaralhado)
            self.assertEqual(cc.casar_registros(embaralhado)["grupos"], esperado)

    def test_saida_nao_depende_da_semente_de_hash_do_python(self):
        saidas = []
        with tempfile.TemporaryDirectory() as tmp:
            for semente in ("1", "4242"):
                destino = Path(tmp) / f"eq{semente}.json"
                env = dict(os.environ, PYTHONHASHSEED=semente, PYTHONDONTWRITEBYTECODE="1")
                subprocess.run([sys.executable, str(RAIZ_SCRAPER / "gerar_equivalentes.py"), "--saida", str(destino)],
                               check=True, capture_output=True, env=env)
                saidas.append(destino.read_bytes())
        self.assertEqual(saidas[0], saidas[1])
        self.assertEqual(saidas[0], EQUIVALENTES.read_bytes())


if __name__ == "__main__":
    unittest.main()
