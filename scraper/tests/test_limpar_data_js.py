"""Regeneração do data.js sem preço simulado, a partir dos produtos já coletados (sem nova coleta)."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import gerar_catalogo_e_sql as gerador

OITO = {"zaffari": 10.5, "rissul": 10.2, "asun": 9.9, "stok": 9.4, "atacadao": 9.5, "master": 10.3, "fort": 9.6, "carrefour": 10.4}

CABECALHO_ANTIGO = (
    "// Catálogo oficial SmartMarket consolidado com todos os 530 produtos coletados das 8 redes do RS\n\n"
    "export const CATEGORIES = [\n  { id: 'todos', label: 'Todos', icon: 'x' },\n]\n\n"
    "export const MARKETS = [\n  { id: 'fort', name: 'Fort Atacadista' },\n]\n\n"
)


def produto(pid, origem, prices=None, **extra):
    p = {"id": pid, "name": f"Produto {pid}", "prices": dict(prices or OITO), "supermercadoOrigem": origem}
    p.update(extra)
    return p


def escrever_data_js(pasta, produtos, crlf=False):
    texto = CABECALHO_ANTIGO + "export const PRODUCTS = " + json.dumps(produtos, ensure_ascii=False, indent=2) + ";\n"
    if crlf:
        texto = texto.replace("\n", "\r\n")
    caminho = Path(pasta) / "data.js"
    caminho.write_bytes(texto.encode("utf-8"))
    return caminho


def ler_produtos(caminho):
    texto = caminho.read_text(encoding="utf-8")
    corpo = texto[texto.index("export const PRODUCTS = ") + len("export const PRODUCTS = "):]
    return json.loads(corpo[:corpo.rindex("]") + 1])


class TestChaveMercado(unittest.TestCase):
    def test_nomes_de_origem_do_catalogo(self):
        casos = {
            "Asun Supermercados": "asun", "Atacadão": "atacadao", "Master": "master", "Rissul": "rissul",
            "Stok Center": "stok", "Zaffari": "zaffari", "Carrefour Mercado": "carrefour",
        }
        for nome, chave in casos.items():
            self.assertEqual(gerador.chave_mercado(nome), chave, nome)

    def test_fort_atacadista_nao_vira_atacadao(self):
        self.assertEqual(gerador.chave_mercado("Fort Atacadista"), "fort")

    def test_sem_origem_cai_em_fort_como_o_gerador(self):
        self.assertEqual(gerador.chave_mercado(None), "fort")


class TestLimparPrecosCatalogo(unittest.TestCase):
    def test_so_fica_o_preco_da_rede_de_origem(self):
        produtos, resumo = gerador.limpar_precos_catalogo([produto("p1", "Asun Supermercados"), produto("p2", "Fort Atacadista")])
        self.assertEqual(produtos[0]["prices"], {"asun": 9.9})
        self.assertEqual(produtos[1]["prices"], {"fort": 9.6})
        self.assertEqual(resumo["precos_removidos"], 14)
        self.assertEqual(resumo["por_rede"], {"asun": 1, "fort": 1})

    def test_mantem_ids_ordem_e_demais_campos(self):
        entrada = [produto("p9", "Master", imageLocal="/images/x.webp", promo=True), produto("p3", "Rissul")]
        saida, _ = gerador.limpar_precos_catalogo(json.loads(json.dumps(entrada)))
        self.assertEqual([p["id"] for p in saida], ["p9", "p3"])
        self.assertEqual(saida[0]["imageLocal"], "/images/x.webp")
        self.assertTrue(saida[0]["promo"])

    def test_menor_preco_recalculado_para_a_origem(self):
        p = produto("p1", "Zaffari", menorPreco=9.4, mercadoMenorPreco="stok")
        (saida,), _ = gerador.limpar_precos_catalogo([p])
        self.assertEqual((saida["menorPreco"], saida["mercadoMenorPreco"]), (10.5, "zaffari"))

    def test_club_prices_de_outra_rede_sao_descartados(self):
        p = produto("p1", "Stok Center", clubPrices={"stok": "Clube Stok", "master": "Clube Master"})
        (saida,), _ = gerador.limpar_precos_catalogo([p])
        self.assertEqual(saida["clubPrices"], {"stok": "Clube Stok"})

    def test_sem_preco_na_origem_fica_sem_preco_e_e_contado(self):
        p = produto("p1", "Carrefour Mercado", prices={"asun": 5.0})
        (saida,), resumo = gerador.limpar_precos_catalogo([p])
        self.assertEqual(saida["prices"], {})
        self.assertEqual(resumo["sem_preco_na_origem"], 1)


class TestRegenerarDataJs(unittest.TestCase):
    def test_reescreve_precos_e_cabecalho_sem_tocar_categorias_e_mercados(self):
        with tempfile.TemporaryDirectory() as tmp:
            caminho = escrever_data_js(tmp, [produto("p1", "Asun Supermercados"), produto("p2", "Stok Center")], crlf=True)
            resumo = gerador.regenerar_data_js(caminho)
            texto = caminho.read_text(encoding="utf-8")
            produtos = ler_produtos(caminho)

        self.assertEqual(resumo["produtos"], 2)
        self.assertTrue(texto.startswith("// Catálogo estático SmartMarket: 2 produtos, cada um com o preço real"))
        self.assertNotIn("530 produtos", texto)
        bloco_antigo = CABECALHO_ANTIGO.split("\n", 1)[1]
        self.assertIn(bloco_antigo, texto)
        self.assertEqual([p["prices"] for p in produtos], [{"asun": 9.9}, {"stok": 9.4}])
        self.assertTrue(texto.endswith("];\n"))
        self.assertNotIn("\r\n", texto)

    def test_idempotente(self):
        with tempfile.TemporaryDirectory() as tmp:
            caminho = escrever_data_js(tmp, [produto("p1", "Master")])
            gerador.regenerar_data_js(caminho)
            primeira = caminho.read_bytes()
            resumo = gerador.regenerar_data_js(caminho)
            self.assertEqual(caminho.read_bytes(), primeira)
        self.assertEqual(resumo["precos_removidos"], 0)

    def test_nenhum_produto_fica_com_mais_de_uma_rede(self):
        with tempfile.TemporaryDirectory() as tmp:
            caminho = escrever_data_js(tmp, [produto(f"p{i}", o) for i, o in enumerate(
                ["Asun Supermercados", "Fort Atacadista", "Master", "Rissul", "Stok Center", "Zaffari", "Atacadão"], 1)])
            gerador.regenerar_data_js(caminho)
            produtos = ler_produtos(caminho)
        self.assertTrue(all(len(p["prices"]) == 1 for p in produtos))


if __name__ == "__main__":
    unittest.main()
