"""Casamento em camadas (T1..T4 e T0 foto): exemplos reais, rejeições e fusão de grupos.

Os testes afirmam o RESULTADO do casamento (quais itens formam grupo e com que confiança), nunca só que
a função não lança. Cada rejeição abaixo corresponde a um erro que o catálogo real já produziu.
"""
import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import casamento_camadas as cc


def reg(id_, rede, nome, marca="Marca", cat="bebidas", unidade="1 un", preco=10.0, imagem=None):
    return {"id": id_, "rede": rede, "nome": nome, "marca": marca, "cat": cat, "unidade": unidade,
            "preco": preco, "idOrigem": f"{rede}-{id_}", "imageUrl": imagem}


def casar_dois(nome_a, nome_b, marca_a="Marca", marca_b="Marca", cat_a="bebidas", cat_b="bebidas",
               rede_a="fort", rede_b="asun", **kw):
    return cc.casar_registros([reg("p1", rede_a, nome_a, marca_a, cat_a, **kw),
                               reg("p2", rede_b, nome_b, marca_b, cat_b, **kw)])["grupos"]


class ExemplosReaisConfirmadosTest(unittest.TestCase):
    def test_iogurte_nestle_asun_x_fort_casa_como_confirmado(self):
        grupos = cc.casar_registros([
            reg("p10", "asun", "Iogurte Natural Nestlé Desnatado 160g", "Nestlé", "leites"),
            reg("p20", "fort", "Iogurte Nestlé Natural Desnatado 160g", "Nestlé", "leites"),
        ])["grupos"]
        self.assertEqual(len(grupos), 1)
        self.assertEqual(grupos[0]["itens"], ["p10", "p20"])
        # mesmos tokens em outra ordem: a chave idêntica de casamento.py já os une (T1)
        self.assertEqual(grupos[0]["camada"], "T1")
        self.assertEqual(grupos[0]["confianca"], "confirmado")

    def test_ordem_das_palavras_e_litro_por_extenso(self):
        grupos = casar_dois("Leite Marca Integral 1L", "Leite Integral Marca 1 Litro", cat_a="leites", cat_b="leites")
        self.assertEqual([(g["camada"], g["confianca"]) for g in grupos], [("T2", "confirmado")])

    def test_sem_acucar_escrito_igual_nos_dois_lados_continua_confirmado(self):
        grupos = casar_dois("Refrigerante Marca Cola Zero Açúcar 2L", "Refrigerante Marca Zero Açúcar Cola 2 Litros")
        self.assertEqual([g["confianca"] for g in grupos], ["confirmado"])

    def test_marca_com_alias_casa(self):
        grupos = casar_dois("Leite Condensado Presidente 395g", "Leite Condensado President 395g",
                            marca_a="Presidente", marca_b="President", cat_a="leites", cat_b="leites")
        self.assertEqual(len(grupos), 1)

    def test_embalagem_ausente_de_um_lado_cai_em_provavel(self):
        grupos = casar_dois("Creme de Leite Marca 200g", "Creme de Leite Marca Tetra Pak 200g",
                            cat_a="leites", cat_b="leites")
        self.assertEqual([(g["camada"], g["confianca"]) for g in grupos], [("T3", "provavel")])

    def test_marca_recuperada_do_nome_e_sempre_provavel(self):
        regs = [
            reg("p1", "fort", "Chocolate Garoto Ao Leite 80g", "Garoto", "biscoitos"),
            reg("p2", "fort", "Chocolate Garoto Branco 80g", "Garoto", "biscoitos"),
            reg("p3", "asun", "Chocolate Garoto Ao Leite 80g", "", "biscoitos"),
        ]
        grupos = cc.casar_registros(regs)["grupos"]
        self.assertEqual([(g["itens"], g["camada"], g["confianca"]) for g in grupos], [(["p1", "p3"], "T4", "provavel")])


class RejeicoesTest(unittest.TestCase):
    """Pares que NÃO podem formar grupo de forma alguma (nem provável)."""

    CASOS = [
        ("tamanho diferente 350ml x 2L", "Refrigerante Marca Cola 350ml", "Refrigerante Marca Cola 2L", {}),
        ("multipacote 6x350ml x 350ml", "Cerveja Marca 6x350ml", "Cerveja Marca 350ml", {}),
        ("multipacote 'com 4 unidades' x avulso", "Sabonete Marca 90g Com 4 Unidades", "Sabonete Marca 90g", {"cat": "higiene"}),
        ("quantidade diferente", "Leite Marca Integral 1L", "Leite Marca Integral 1,5L", {"cat": "leites"}),
        ("unidade-base diferente (ml x g)", "Sabão Marca 900ml", "Sabão Marca 900g", {"cat": "limpeza"}),
        ("zero x normal", "Refrigerante Marca Cola 2L", "Refrigerante Marca Cola Zero 2L", {}),
        ("diet x normal", "Refrigerante Marca Guaraná 350ml", "Refrigerante Marca Guaraná Diet 350ml", {}),
        ("light x normal", "Iogurte Marca Natural 170g", "Iogurte Marca Natural Light 170g", {"cat": "leites"}),
        ("integral x desnatado", "Leite Marca Integral 1L", "Leite Marca Desnatado 1L", {"cat": "leites"}),
        ("com lactose x zero lactose", "Leite Marca Integral 1L", "Leite Marca Integral Zero Lactose 1L", {"cat": "leites"}),
        ("sabores diferentes", "Biscoito Marca Recheado Morango 120g", "Biscoito Marca Recheado Chocolate 120g", {"cat": "biscoitos"}),
        ("tradicional só de um lado", "Farinha Marca Tradicional 210g", "Farinha Marca 210g", {"cat": "graos"}),
        ("pó x líquido", "Sabão Marca Líquido 1kg", "Sabão Marca em Pó 1kg", {"cat": "limpeza"}),
        ("cores", "Feijão Marca Preto 1kg", "Feijão Marca Carioca 1kg", {"cat": "graos"}),
        ("cortes", "Frango Marca Coxa 1kg", "Frango Marca Peito 1kg", {"cat": "carnes"}),
        ("tipo de grão", "Arroz Marca Parboilizado 5kg", "Arroz Marca Agulhinha 5kg", {"cat": "graos"}),
        ("tipo 1 x tipo 2", "Arroz Marca Tipo 1 5kg", "Arroz Marca Tipo 2 5kg", {"cat": "graos"}),
        ("leve 3 pague 2 x normal", "Creme Dental Marca 70g", "Creme Dental Marca 70g Leve 3 Pague 2", {"cat": "higiene"}),
        ("lata x vidro", "Cerveja Marca Lata 350ml", "Cerveja Marca Vidro 350ml", {}),
        ("kit composto", "Shampoo Marca 350ml + Condicionador 350ml", "Shampoo Marca 350ml", {"cat": "higiene"}),
    ]

    def test_pares_rejeitados(self):
        for titulo, a, b, extra in self.CASOS:
            with self.subTest(titulo):
                cat = extra.get("cat", "bebidas")
                self.assertEqual(casar_dois(a, b, cat_a=cat, cat_b=cat), [])

    def test_marcas_diferentes(self):
        self.assertEqual(casar_dois("Café Marca Tradicional 500g", "Café Outra Tradicional 500g",
                                    marca_a="Marca", marca_b="Outra", cat_a="cafe", cat_b="cafe"), [])

    def test_mesma_rede_nao_forma_grupo(self):
        self.assertEqual(casar_dois("Leite Marca Integral 1L", "Leite Marca Integral 1L",
                                    cat_a="leites", cat_b="leites", rede_a="fort", rede_b="fort"), [])

    def test_alimento_x_nao_alimento(self):
        self.assertEqual(casar_dois("Sabonete Marca 90g", "Chocolate Marca 90g", cat_a="higiene", cat_b="biscoitos"), [])

    def test_sem_medida_nao_casa(self):
        self.assertEqual(casar_dois("Presente Marca Especial", "Presente Marca Especial", cat_a="bazar", cat_b="bazar"), [])


class ConfiancaDeCasosAmbiguosTest(unittest.TestCase):
    """Casos em que dois juízes divergiram: nunca podem entrar como 'confirmado'."""

    def test_brahma_chopp_zero_alcool_x_brahma_zero_alcool_nao_e_confirmado(self):
        grupos = casar_dois("Cerveja Brahma Chopp Zero Álcool 350ml", "Cerveja Brahma Zero Álcool 350ml",
                            marca_a="Brahma", marca_b="Brahma")
        self.assertNotIn("confirmado", [g["confianca"] for g in grupos])

    def test_coca_sem_acucar_x_coca_zero_acucar_no_maximo_provavel(self):
        grupos = casar_dois("Refrigerante Coca-Cola sem Açúcar 2L", "Refrigerante Coca-Cola Zero Açúcar 2L",
                            marca_a="Coca-Cola", marca_b="Coca-Cola")
        self.assertNotIn("confirmado", [g["confianca"] for g in grupos])
        # e a divergência de grafia não pode rebaixar o caso em que as duas redes escrevem igual
        iguais = casar_dois("Refrigerante Coca-Cola sem Açúcar 2L", "Refrigerante Coca-Cola sem Açúcar 2 Litros",
                            marca_a="Coca-Cola", marca_b="Coca-Cola")
        self.assertEqual([g["confianca"] for g in iguais], ["confirmado"])

    def test_confianca_acompanha_a_camada(self):
        self.assertEqual({c: cc.CONFIANCA_POR_CAMADA[c] for c in ("T0", "T1", "T2", "T3", "T4")},
                         {"T0": "provavel", "T1": "confirmado", "T2": "confirmado", "T3": "provavel", "T4": "provavel"})


class FusaoDeGruposTest(unittest.TestCase):
    def test_transitividade_perigosa_nao_funde(self):
        # A~B (embalagem ausente em B é tolerada) e B~C idem, mas A (lata) x C (vidro) é conflito direto.
        regs = [
            reg("p1", "fort", "Cerveja Marca Pilsen Lata 350ml"),
            reg("p2", "asun", "Cerveja Marca Pilsen 350ml"),
            reg("p3", "stok", "Cerveja Marca Pilsen Vidro 350ml"),
        ]
        grupos = cc.casar_registros(regs)["grupos"]
        todos = [i for g in grupos for i in g["itens"]]
        self.assertEqual(len(todos), len(set(todos)), "um id em no máximo um grupo")
        for g in grupos:
            self.assertFalse({"p1", "p3"} <= set(g["itens"]), "lata e vidro não podem ficar no mesmo grupo")
        self.assertEqual(len(grupos), 1)
        self.assertEqual(len(grupos[0]["itens"]), 2)
        self.assertIn("p2", grupos[0]["itens"])

    def test_tres_redes_compativeis_formam_um_grupo_so(self):
        regs = [reg("p1", "fort", "Leite Marca Integral 1L", cat="leites"),
                reg("p2", "asun", "Leite Integral Marca 1 Litro", cat="leites"),
                reg("p3", "stok", "Leite Marca Integral 1000ml", cat="leites")]
        grupos = cc.casar_registros(regs)["grupos"]
        self.assertEqual([(g["itens"], g["confianca"]) for g in grupos], [(["p1", "p2", "p3"], "confirmado")])

    def test_grupo_com_elo_fraco_herda_a_confianca_do_elo_fraco(self):
        # p1~p2 é T2 (confirmado); p3 só casa em T3 (embalagem ausente num lado) => o grupo inteiro é provável
        regs = [reg("p1", "fort", "Creme de Leite Marca 200g", cat="leites"),
                reg("p2", "asun", "Creme de Leite Marca 200g", cat="leites"),
                reg("p3", "stok", "Creme de Leite Marca Tetra Pak 200g", cat="leites")]
        grupos = cc.casar_registros(regs)["grupos"]
        self.assertEqual(len(grupos), 1)
        self.assertEqual(grupos[0]["itens"], ["p1", "p2", "p3"])
        self.assertEqual(grupos[0]["confianca"], "provavel")

    def test_duas_linhas_da_mesma_rede_nao_entram_no_mesmo_grupo(self):
        regs = [reg("p1", "fort", "Leite Marca Integral 1L", cat="leites"),
                reg("p2", "fort", "Leite Marca Integral 1L", cat="leites"),
                reg("p3", "asun", "Leite Marca Integral 1L", cat="leites")]
        grupos = cc.casar_registros(regs)["grupos"]
        self.assertEqual(len(grupos), 1)
        redes = [r["rede"] for r in regs if r["id"] in grupos[0]["itens"]]
        self.assertEqual(sorted(redes), ["asun", "fort"])

    def test_resultado_independe_da_ordem_de_entrada(self):
        regs = [reg("p1", "fort", "Leite Marca Integral 1L", cat="leites"),
                reg("p2", "asun", "Leite Integral Marca 1 Litro", cat="leites"),
                reg("p3", "stok", "Leite Marca Integral 1000ml", cat="leites"),
                reg("p4", "fort", "Cerveja Marca Pilsen Lata 350ml"),
                reg("p5", "asun", "Cerveja Marca Pilsen 350ml"),
                reg("p6", "stok", "Cerveja Marca Pilsen Vidro 350ml")]
        esperado = cc.casar_registros(regs)
        for semente in range(5):
            embaralhado = list(regs)
            random.Random(semente).shuffle(embaralhado)
            self.assertEqual(cc.casar_registros(embaralhado), esperado)

    def test_ids_do_resultado_ordenados_numericamente(self):
        regs = [reg("p100", "fort", "Leite Marca Integral 1L", cat="leites"),
                reg("p9", "asun", "Leite Marca Integral 1L", cat="leites")]
        self.assertEqual(cc.casar_registros(regs)["grupos"][0]["itens"], ["p9", "p100"])


class FotoIdenticaTest(unittest.TestCase):
    FOTO = "https://cdn.exemplo/bucket/abc123/foto-1.webp"

    def _grupos(self, nome_a, nome_b, foto_a=None, foto_b=None, **kw):
        return cc.casar_registros([
            reg("p1", "asun", nome_a, imagem=foto_a or self.FOTO, **kw),
            reg("p2", "fort", nome_b, imagem=foto_b or self.FOTO, **kw)])["grupos"]

    def test_foto_identica_com_nomes_compativeis_e_provavel_t0(self):
        grupos = self._grupos("Café Marca Gourmet Torra Escura 500g", "Marca Café Especial Escuro 500g", cat="cafe")
        self.assertEqual([(g["camada"], g["confianca"]) for g in grupos], [("T0", "provavel")])

    def test_foto_identica_nao_supera_variante_dura(self):
        self.assertEqual(self._grupos("Refrigerante Marca Cola 2L", "Refrigerante Marca Cola Zero 2L"), [])

    def test_foto_identica_nao_supera_tamanho_diferente(self):
        self.assertEqual(self._grupos("Refrigerante Marca Cola 350ml", "Refrigerante Marca Cola 2L"), [])

    def test_foto_identica_nao_supera_marca_diferente(self):
        regs = [reg("p1", "asun", "Café Alfa Gourmet 500g", "Alfa", "cafe", imagem=self.FOTO),
                reg("p2", "fort", "Café Beta Especial 500g", "Beta", "cafe", imagem=self.FOTO)]
        self.assertEqual(cc.casar_registros(regs)["grupos"], [])

    def test_foto_placeholder_nao_casa(self):
        placeholder = "https://cdn.exemplo/padrao-de-fotos/sem-foto.webp"
        self.assertEqual(self._grupos("Café Marca Gourmet Torra Escura 500g", "Marca Café Especial Escuro 500g",
                                      foto_a=placeholder, foto_b=placeholder, cat="cafe"), [])

    def test_mesma_foto_no_cdn_com_assinaturas_diferentes_e_a_mesma_foto(self):
        a = "https://edge.cdn/ASSINA1=/fit-in/400x400/https://bucket.s3.amazonaws.com/h/1.webp"
        b = "https://edge.cdn/ASSINA2=/fit-in/800x800/https://bucket.s3.amazonaws.com/h/1.webp"
        self.assertEqual(cc.chave_imagem(a), cc.chave_imagem(b))
        self.assertNotEqual(cc.chave_imagem(a), cc.chave_imagem(a.replace("1.webp", "2.webp")))

    def test_camada_melhor_vence_a_foto(self):
        grupos = self._grupos("Leite Marca Integral 1L", "Leite Integral Marca 1 Litro", cat="leites")
        self.assertEqual([g["camada"] for g in grupos], ["T2"])


class AvaliarParTest(unittest.TestCase):
    """O nível de um par é conferido diretamente também para os pares internos de um grupo (nivel_par)."""

    def _par(self, nome_a, nome_b, marca_a="Marca", marca_b="Marca", rede_a="fort", rede_b="asun"):
        a, b = cc.construir_corpus([reg("p1", rede_a, nome_a, marca_a, "leites"), reg("p2", rede_b, nome_b, marca_b, "leites")])
        return a, b

    def test_motivos_de_rejeicao(self):
        casos = [
            ("embalagem_diferente", self._par("Leite Marca Integral 1L", "Leite Marca Integral 2L")),
            ("marca_diferente", self._par("Leite Marca Integral 1L", "Leite Outra Integral 1L", marca_b="Outra")),
            ("variante_diferente", self._par("Leite Marca Integral 1L", "Leite Marca Desnatado 1L")),
            ("mesma_rede", self._par("Leite Marca Integral 1L", "Leite Marca Integral 1L", rede_b="fort")),
            ("sem_medida", self._par("Leite Marca Integral", "Leite Marca Integral")),
        ]
        for motivo, (a, b) in casos:
            with self.subTest(motivo):
                camada, _, m = cc.avaliar(a, b)
                self.assertIsNone(camada)
                self.assertEqual(m, motivo)
                self.assertIsNone(cc.nivel_par(a, b))

    def test_nivel_par_devolve_a_camada_mais_confiavel(self):
        a, b = self._par("Leite Marca Integral 1L", "Leite Integral Marca 1L")
        self.assertEqual(cc.nivel_par(a, b), "T1")  # a chave idêntica vence a T2 que também vale
        a, b = self._par("Leite Marca Integral 1L", "Leite Integral Marca 1 Litro")
        self.assertEqual(cc.nivel_par(a, b), "T2")  # tokens iguais, mas a chave de casamento.py não os une
        a, b = self._par("Creme de Leite Marca 200g", "Creme de Leite Marca Tetra Pak 200g")
        self.assertEqual(cc.nivel_par(a, b), "T3")


class AuxiliaresTest(unittest.TestCase):
    def test_parse_embalagem_multipacote_e_peso(self):
        e = cc.parse_embalagem("cerveja marca 6x350ml", "")
        self.assertEqual((e["ok"], e["base"], e["tam"], e["pack"]), (True, "ml", "350", 6))
        e = cc.parse_embalagem("arroz marca 5kg", "")
        self.assertEqual((e["base"], e["tam"], e["pack"]), ("g", "5000", 1))

    def test_embalagens_equivalentes_exige_tamanho_e_pack(self):
        a = cc.parse_embalagem("cerveja marca 6x350ml", "")
        b = cc.parse_embalagem("cerveja marca 350ml", "")
        self.assertFalse(cc.embalagens_equivalentes(a, b))
        self.assertTrue(cc.embalagens_equivalentes(a, cc.parse_embalagem("cerveja marca 6 x 350 ml", "")))

    def test_kit_e_peso_variavel_nao_tem_embalagem_confiavel(self):
        self.assertEqual(cc.parse_embalagem("kit shampoo 350ml + condicionador 350ml", "")["motivo"], "kit_composto")
        self.assertEqual(cc.parse_embalagem("banana prata peso aproximado 1kg", "")["motivo"], "peso_variavel")


if __name__ == "__main__":
    unittest.main()
