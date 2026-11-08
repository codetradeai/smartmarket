"""Limpeza determinística do catálogo (frontend/src/data.js) feita por scraper/limpar_catalogo.py.

Cada teste afirma um comportamento provado pela auditoria do catálogo: cópias exatas, linhas
híbridas com preço simulado, categoria por palavra inteira, unidade 1000x errada e nome com
encoding quebrado. Os testes com o data.js real conferem as invariantes do arquivo versionado.
"""
import json
import re
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import limpar_catalogo as lc

RAIZ = Path(__file__).resolve().parent.parent.parent
DATA_JS_REAL = RAIZ / "frontend" / "src" / "data.js"

CABECALHO = (
    "// Catálogo estático SmartMarket: 5 produtos, cada um com o preço real da rede onde foi coletado "
    "(sem preço simulado). Gerado por scraper/gerar_catalogo_e_sql.py\n\n"
    "export const CATEGORIES = [\n  { id: 'todos', label: 'Todos', icon: 'x' },\n]\n\n"
    "export const MARKETS = [\n  { id: 'rissul', name: 'Rissul' },\n]\n\n"
)


def prod(pid, rede="Rissul", id_origem="1", nome=None, categoria="mercearia", unidade="1 un", preco=1.0, **extra):
    p = {
        "id": pid,
        "name": nome or f"Produto {pid}",
        "brand": "Marca",
        "category": categoria,
        "unit": unidade,
        "imageLocal": f"/images/produtos/{id_origem}_abc123.jpg",
        "imageUrl": f"https://exemplo.test/{id_origem}.jpg",
        "descricao": f"Descrição de {nome or pid}",
        "prices": {"rissul": preco},
        "idOrigem": id_origem,
        "supermercadoOrigem": rede,
    }
    p.update(extra)
    return p


def montar(produtos):
    return CABECALHO + "export const PRODUCTS = " + json.dumps(produtos, ensure_ascii=False, indent=2) + ";\n"


class TestLeituraEEscrita(unittest.TestCase):
    def test_ida_e_volta_preserva_o_arquivo_byte_a_byte(self):
        texto = montar([prod("p1"), prod("p2", id_origem="2")])
        prefixo, produtos, sufixo = lc.ler_data_js(texto)
        self.assertEqual(len(produtos), 2)
        self.assertEqual(lc.montar_data_js(prefixo, produtos, sufixo), texto)

    def test_arquivo_sem_export_de_produtos_e_rejeitado(self):
        with self.assertRaises(ValueError):
            lc.ler_data_js("export const OUTRA = [];\n")

    def test_cabecalho_passa_a_informar_a_quantidade_real(self):
        prefixo, produtos, sufixo = lc.ler_data_js(montar([prod("p1")] * 5))
        novo = lc.atualizar_cabecalho(prefixo, 3)
        self.assertIn("3 produtos, cada um", novo)
        self.assertNotIn("5 produtos", novo)


class TestDuplicatas(unittest.TestCase):
    def test_copia_exata_mantem_a_primeira_ocorrencia(self):
        entrada = [prod("p1", id_origem="10"), prod("p2", id_origem="20"), prod("p3", id_origem="10")]
        saida, achados = lc.remover_duplicatas(entrada)
        self.assertEqual([p["id"] for p in saida], ["p1", "p2"])
        self.assertEqual(achados["removidas"], [{"id": "p3", "mantida": "p1", "motivo": "copia_exata"}])

    def test_mesma_chave_em_redes_diferentes_nao_e_duplicata(self):
        # idOrigem 754 existe no Master e no Stok com produtos diferentes
        entrada = [prod("p1", rede="Master", id_origem="754"), prod("p2", rede="Stok Center", id_origem="754")]
        saida, achados = lc.remover_duplicatas(entrada)
        self.assertEqual(len(saida), 2)
        self.assertEqual(achados["removidas"], [])

    def test_prefere_a_copia_com_foto_quando_a_primeira_nao_tem(self):
        sem_foto = prod("p1", id_origem="10", imageLocal="", imageUrl="")
        com_foto = prod("p2", id_origem="10")
        saida, achados = lc.remover_duplicatas([sem_foto, com_foto])
        self.assertEqual([p["id"] for p in saida], ["p2"])
        self.assertEqual(achados["removidas"][0]["mantida"], "p2")

    def test_linha_hibrida_perde_para_a_copia_coerente_com_a_origem_mesmo_vindo_antes(self):
        # híbrida: foto de outra rede (nome do arquivo não começa pelo idOrigem) e preço simulado
        hibrida = prod("p1", id_origem="2199634", preco=5.6, imageLocal="/images/produtos/22628_73ef.jpg")
        real = prod("p2", id_origem="2199634", preco=5.39)
        saida, achados = lc.remover_duplicatas([hibrida, real])
        self.assertEqual([p["id"] for p in saida], ["p2"])
        self.assertEqual(achados["removidas"][0]["motivo"], "hibrida_preco_simulado")
        self.assertEqual(saida[0]["prices"], {"rissul": 5.39})

    def test_precos_divergentes_sem_hibrida_ficam_com_a_primeira_e_sao_registrados(self):
        a = prod("p1", id_origem="10", preco=3.0)
        b = prod("p2", id_origem="10", preco=3.5)
        saida, achados = lc.remover_duplicatas([a, b])
        self.assertEqual([p["id"] for p in saida], ["p1"])
        self.assertEqual(
            achados["precos_divergentes"],
            [{"chave": "Rissul|10", "mantida": "p1", "criterio": "primeira_ocorrencia",
              "precos": {"p1": {"rissul": 3.0}, "p2": {"rissul": 3.5}}}],
        )

    def test_divergencia_com_hibrida_registra_a_coerencia_com_a_origem_como_criterio(self):
        hibrida = prod("p1", id_origem="7", preco=9.0, imageLocal="/images/produtos/999_x.jpg")
        real = prod("p2", id_origem="7", preco=8.0)
        _, achados = lc.remover_duplicatas([hibrida, real])
        self.assertEqual(achados["precos_divergentes"][0]["criterio"], "coerencia_com_a_origem")
        self.assertEqual(achados["precos_divergentes"][0]["mantida"], "p2")

    def test_remocao_preserva_a_ordem_e_nao_renumera_os_ids(self):
        entrada = [prod("p1", id_origem="1"), prod("p5", id_origem="1"), prod("p9", id_origem="9")]
        saida, _ = lc.remover_duplicatas(entrada)
        self.assertEqual([p["id"] for p in saida], ["p1", "p9"])

    def test_idempotente(self):
        entrada = [prod("p1", id_origem="10"), prod("p2", id_origem="10"), prod("p3", id_origem="20")]
        uma, _ = lc.remover_duplicatas(entrada)
        duas, achados = lc.remover_duplicatas(uma)
        self.assertEqual(uma, duas)
        self.assertEqual(achados["removidas"], [])


class TestEncoding(unittest.TestCase):
    def test_mojibake_utf8_lido_como_latin1_volta_ao_texto_certo(self):
        self.assertEqual(lc.corrigir_texto("Queijo ParmesÃ£o Ralado Gran Mestri 40g"), "Queijo Parmesão Ralado Gran Mestri 40g")
        self.assertEqual(lc.corrigir_texto("Refresco em Pó Zero Açucar Apti Sabor LimÃ£o 8g Envelope"),
                         "Refresco em Pó Zero Açucar Apti Sabor Limão 8g Envelope")

    def test_interrogacao_invertida_entre_letras_era_apostrofo(self):
        self.assertEqual(lc.corrigir_texto("Café L¿OR Gourmet Intenso"), "Café L'OR Gourmet Intenso")
        self.assertEqual(lc.corrigir_texto("Linguiça Suína D¿Talia Pernil Spaleta 600g"), "Linguiça Suína D'Talia Pernil Spaleta 600g")

    def test_texto_correto_nao_muda(self):
        for texto in ("Pão de Açúcar CONGELADO", "COMPOSIÇÃO: Cálcio 26mg/l", "Mamão Papaia", "Ração 1ª linha", "Qual é o prazo ¿ talvez?"):
            self.assertEqual(lc.corrigir_texto(texto), texto)

    def test_sequencia_que_nao_vira_utf8_valido_fica_como_esta(self):
        self.assertEqual(lc.corrigir_texto("x\u00f0\u0080y"), "x\u00f0\u0080y")

    def test_aplica_em_nome_descricao_e_marca_e_conta_os_itens(self):
        p = prod("p1", nome="Queijo ParmesÃ£o", descricao="Queijo ParmesÃ£o - Produto monitorado")
        p["brand"] = "L¿OR"
        saida, alterados = lc.corrigir_encoding([p, prod("p2", nome="Arroz")])
        self.assertEqual(saida[0]["name"], "Queijo Parmesão")
        self.assertEqual(saida[0]["descricao"], "Queijo Parmesão - Produto monitorado")
        self.assertEqual(saida[0]["brand"], "L'OR")
        self.assertEqual([a["id"] for a in alterados], ["p1"])
        self.assertEqual(alterados[0]["antes"], "Queijo ParmesÃ£o")
        self.assertEqual(alterados[0]["depois"], "Queijo Parmesão")


class TestUnidade1000x(unittest.TestCase):
    def corrigir(self, unidade, nome="Produto"):
        p = prod("p1", nome=nome, unidade=unidade)
        saida, alterados = lc.corrigir_unidades([p])
        return saida[0]["unit"], alterados

    def test_virgula_com_tres_casas_em_gramas_e_quilo_em_milhar(self):
        self.assertEqual(self.corrigir("1,250g", "Iogurte Líquido Danone Morango 1,250g")[0], "1,25kg")
        self.assertEqual(self.corrigir("1,150g", "Bebida Láctea Biolat Morango 1,150g")[0], "1,15kg")

    def test_menos_de_um_quilo_volta_para_gramas(self):
        self.assertEqual(self.corrigir("0,500g", "Carne Bovina Picanha Fatiada Congelada Kg (aprox 0,500g)")[0], "500g")

    def test_ponto_de_milhar_em_gramas(self):
        self.assertEqual(self.corrigir("1.175g", "Chocolate Kinder Bueno White 1.175g")[0], "1,175kg")

    def test_mililitros_com_decimal_pequeno_sao_litros(self):
        self.assertEqual(self.corrigir("1,35ml", "Suco Integral De Uva Bebah Tinto Pet 1,35ml")[0], "1,35l")

    def test_decimais_legitimos_ficam_intactos(self):
        for unidade in ("100,8g", "41,5g", "8,5g", "20,3g", "112,5g", "7,5g", "1,5l", "1,01kg", "500g", "2kg", "350ml", "1 un"):
            self.assertEqual(self.corrigir(unidade)[0], unidade, unidade)

    def test_registra_antes_e_depois(self):
        _, alterados = self.corrigir("1,250g")
        self.assertEqual(alterados, [{"id": "p1", "name": "Produto", "antes": "1,250g", "depois": "1,25kg"}])

    def test_idempotente(self):
        p = prod("p1", unidade="1,250g")
        uma, _ = lc.corrigir_unidades([p])
        duas, alterados = lc.corrigir_unidades(uma)
        self.assertEqual(uma, duas)
        self.assertEqual(alterados, [])


class TestCategoriaPorPalavraInteira(unittest.TestCase):
    """(nome, categoria atual) -> categoria esperada; None = não mexe. Casos reais do catálogo."""

    def conferir(self, casos):
        for nome, atual, esperado in casos:
            with self.subTest(nome=nome, atual=atual):
                achado = lc.recategorizar(nome, atual)
                self.assertEqual(achado[0] if achado else None, esperado)

    def test_macarrao_seco_e_instantaneo_saem_de_hortifruti_e_carnes(self):
        self.conferir([
            ("Macarrão Espaguete Sem Ovos Orquídea 500g", "hortifruti", "mercearia"),
            ("Macarrão Galo Massa de Sêmola Espaguete 9 500g", "hortifruti", "mercearia"),
            ("Macarrão Instantâneo Lámen Carne Isabela 75g", "carnes", "mercearia"),
            ("Macarrão Instantâneo Cup Noodles Queijo Nacho 68g", "leites", "mercearia"),
            ("Macarrão Instantâneo Nissin Cup Noodles Legumes com Azeite 67g", "oleos", "mercearia"),
            ("Espaguete Barilla 500g", "hortifruti", "mercearia"),
            ("Massa Isabela Sêmola Sem Ovos Espaguete 400g", "carnes", "mercearia"),
        ])

    def test_massa_recheada_e_lasanha_vao_para_congelados(self):
        self.conferir([
            ("Lasanha Seara 4 Queijos 600g", "leites", "congelados"),
            ("Lasanha Seara Bolonhesa 1kg", "padaria", "congelados"),
            ("Ravioli D'itália com Recheio de Queijo 300g", "leites", "congelados"),
            ("Capeletti Famigliare de Carne 250g", "carnes", "congelados"),
            ("Nhoque Mezzani Batata 500g", "hortifruti", "congelados"),
            ("Massa Fresca Essasim Agnoline de Frango 500g", "carnes", "congelados"),
        ])

    def test_massa_na_categoria_certa_nao_e_mexida(self):
        self.conferir([
            ("Macarrão Parafuso Pilar 400g", "mercearia", None),
            ("Macarrão Parafuso Pilar 400g", "graos", None),
            ("Lasanha Sadia à Bolonhesa 600g", "congelados", None),
            ("Massa Fresca Romena Espaguete 500g", "mercearia", None),
            ("Massa para Pizza Essasim 180g", "congelados", None),
        ])

    def test_palavra_inteira_nao_confunde_substring_nem_nome_de_marca(self):
        self.conferir([
            ("Pão de alho Santa Massa 400g", "padaria", None),
            ("Torresmo Santa Massa Alho Defumado 40g", "hortifruti", None),
            ("Maçã Fuji", "hortifruti", None),
            ("Machado de cozinha", "cafe", None),
            ("Molho de Tomate Italiano com Macarrão 340g", "mercearia", None),
        ])

    def test_higiene_antes_de_ingrediente(self):
        self.conferir([
            ("Sabonete Palmolive 85g Café Óleo Amendoas", "cafe", "higiene"),
            ("Esmalte Risqué cappuccino 8ml", "cafe", "higiene"),
            ("Desodorante Roll-On Dove Fresh Care Pêssego e Leite 50ml", "leites", "higiene"),
            ("Sabonete Dove Manteiga Karité 90g com 8 Unidades", "leites", "higiene"),
            ("Shampoo Dove Nutrição com Tri-Óleos 370ml", "oleos", "higiene"),
            ("Condicionador Elseve Óleo Extraordinário Nutrição 400ml", "oleos", "higiene"),
            ("Kit Elseve Cachos dos Sonhos Shampoo 375ml + Condicionador 170ml", "padaria", "higiene"),
            ("Papel Higiênico Neve Tecnologia Demacare 20 Metros Com 24 Unidades", "hortifruti", "higiene"),
            ("Loção Hidratação Essencial Monange Aveia 200ml", "graos", "higiene"),
            ("Sabonete Líquido de Aveia Hedera Refil 200ml", "graos", "higiene"),
            ("Creme para Pentear Seda Boom Definição Óleo de Coco 1kg Pote", "oleos", "higiene"),
        ])

    def test_limpeza_antes_de_ingrediente(self):
        self.conferir([
            ("Limpador Concentrado Chá Branco Coala 120ml", "cafe", "limpeza"),
            ("Multi-Inseticida Aerossol à Base de Água Óleo de Eucalipto SBP Frasco 380ml", "oleos", "limpeza"),
            ("Detergente Líquido Ypê Maçã 500ml", "hortifruti", "limpeza"),
            ("Lava-Louças Líquido Maçã Ypê 500ml", "hortifruti", "limpeza"),
            ("Amaciante De Roupa Concentrado Doces Sonhos Girando Sol Frasco 500ml", "padaria", "limpeza"),
            ("Limpador Perfumado Veja Água de coco e melão 2l", "bebidas", "limpeza"),
            ("Papel Toalha Snob Pack 3 Rolos 360 Folhas", "mercearia", "limpeza"),
            ("Purificador de Ar Bom Ar Óleo Perfumado Life Scents Jardim Místico 16ml", "oleos", "limpeza"),
            ("Lava Roupa Líquido Omo Coco 450ml", "mercearia", "limpeza"),
        ])

    def test_palavras_de_limpeza_que_tambem_sao_comida_ou_personagem_ficam(self):
        self.conferir([
            ("Amaciante de Carne Maggi 120g", "carnes", None),
            ("Maggi Fondor Amaciante De Carnes Tempero Vidro 120g", "carnes", None),
            ("Iogurte Batavo Bob Esponja confeito 120g", "leites", None),
            ("Farinha Multiuso Vitalin Integral Sem Glúten 500g", "graos", None),
            ("Coador de pano para café Stolf", "cafe", "bazar"),
        ])

    def test_azeite_e_vinagre_no_inicio_do_nome_vao_para_oleos(self):
        self.conferir([
            ("Azeite Renata Extra Virgem 500ml", "leites", "oleos"),
            ("Vinagre de Arroz Meiwa 150ml", "graos", "oleos"),
            ("Vinagre de Maçã Castelo 750ml", "hortifruti", "oleos"),
            ("Azeite de Oliva Gallo 500ml", "oleos", None),
            ("Azeitona Verde Fatiada Pote 200g", "mercearia", None),
            ("Atum Sólido em Óleo Gomes da Costa 170g", "mercearia", None),
            ("Sardinha ao Óleo Coqueiro 125g", "mercearia", None),
            ("Molho para Salada Caesar com Azeite de Oliva Liza 234ml", "oleos", None),
        ])

    def test_racao_e_petisco_para_caes_e_gatos_saem_da_categoria_de_comida(self):
        self.conferir([
            ("Ração Para Cão Champ Sabor Frango 85g", "carnes", "bazar"),
            ("Ração Úmida para Cães Adultos Dog Chow Carne e Arroz Sachê 85g", "graos", "bazar"),
            ("Petisco Para Cães Pedigree Tasty Bites Leite 80g", "leites", "bazar"),
            ("Alimento para Gatos Whiskas Patê de Carne Adulto Lata 290g", "carnes", "bazar"),
            ("Peitoral para Cães Sspets Tamanho P, M e G", "mercearia", "bazar"),
            ("Biscoito Dog Chow Frango e Leite 500g", "biscoitos", "bazar"),
            ("Shampoo veterinário Sanol Dog neutro 500ml", "higiene", None),
        ])

    def test_pet_so_pela_palavra_inteira_garrafa_pet_e_lingua_de_gato_ficam(self):
        self.conferir([
            ("Refrigerante Coca-Cola Pet 2L", "bebidas", None),
            ("Óleo de Soja Coamo Pet 900ml", "oleos", None),
            ("Chocolate Pralinart Língua de Gato ao Leite 100g", "biscoitos", None),
            ("Linguiça de Frango Grossa Petisco Congelada Lar 700g", "carnes", None),
            ("Pão de Hot Dog Mentus 250g", "padaria", None),
            ("Molho de Tomate Stella D'oro Hot Dog 1,7kg", "mercearia", None),
        ])

    def test_bazar_so_para_o_que_nao_e_comida(self):
        self.conferir([
            ("Chinelo Havaianas Café 39/40 Top", "cafe", "bazar"),
            ("Oxford Prato Raso 26cm Chá das 5", "cafe", "bazar"),
            ("Jogo de Copos de Vidro Durax 420ml Caixa com 6 Unidades", "mercearia", "bazar"),
            ("Fritadeira sem Óleo Air Fryer Chic Lar 5 Litros 220V", "oleos", "bazar"),
            ("Caixa de Som Amplificada Philco PCX3800 Bivolt", "mercearia", "bazar"),
            ("Cafeteira Cadence Desperta 18 Cafés 220V", "cafe", "bazar"),
            ("Varal De Chão Mor Slim sem abas", "mercearia", "bazar"),
            ("Papel Manteiga Wyda 29x7,5M", "leites", "bazar"),
            ("Porta Macarrão Sanremo em Plástico Unidade", "hortifruti", "bazar"),
            ("Tapete para Banheiro Macarrão Bene 38x58cm Cores Sortidas", "hortifruti", "bazar"),
            ("Batata McCain Air Fryer Palito Congelada Extra Crocante Pacote 600g", "congelados", None),
            ("Pizza Bella Air Fryer Frango Chadrez 350g", "carnes", None),
            ("Cup Noodles Galinha Copo 68g", "hortifruti", "mercearia"),
            ("Iogurte Natural Copo 170g", "leites", None),
            ("Panela de Pressão Tramontina 4,5L", "limpeza", None),
        ])

    def test_utensilios_e_acessorios_pelo_substantivo_do_inicio_do_nome(self):
        self.conferir([
            ("Colher de chá polyood vermelho", "cafe", "bazar"),
            ("Copo Cisper Stylo Água 260ml", "bebidas", "bazar"),
            ("Jogo de 6 Taças de Água LAV Fame Coloridas 395ml", "bebidas", "bazar"),
            ("Faca para Carne Tramontina Polywood Inox 8", "carnes", "bazar"),
            ("Espátula para Bolo Chic Lar Silver Unidade", "padaria", "bazar"),
            ("Prato de Vidro para Bolo Milan Casa Glass 29cm", "padaria", "bazar"),
            ("Prato Pronto Perdigão Frango Cremoso com Arroz e Brócolis 300g", "graos", None),
            ("Caixa de Bombom Lacta favoritos 250,6g", "biscoitos", None),
            ("Panelinha Seara arroz carreteiro 300g", "graos", None),
        ])

    def test_difusor_serum_pomada_e_abreviatura_de_shampoo(self):
        self.conferir([
            ("Difusor de Aromas Glade 100ml Chá Branco", "cafe", "limpeza"),
            ("DESUMIDIF.SECAR 180G CHA VDE", "cafe", "limpeza"),
            ("Sérum Capilar TRESemmé Blend de Óleos 170ml", "oleos", "higiene"),
            ("Pomada Preventiva de Assaduras Original Hipoglós Caixa 40g", "mercearia", "higiene"),
            ("SH ELSEVE 400mL GLYCOLIC GLOSS", "mercearia", "higiene"),
        ])

    def test_massa_congelada_ou_recheada_chamada_de_macarrao_vai_para_congelados(self):
        self.conferir([
            ("Macarrão Caseiro Tia Nora Congelado Pacote 500g", "congelados", None),
            ("Macarrão Romena Ravioli Frango Pá 250g", "carnes", "congelados"),
            ("Capeleti Zaccaron de carne congelado 400g", "carnes", "congelados"),
            ("Bifinho Keldog Frango Grelhado 250g", "carnes", "bazar"),
        ])

    def test_item_ja_em_categoria_nao_alimentar_nao_e_remanejado(self):
        self.conferir([
            ("Sabonete em Barra Dove", "higiene", None),
            ("Sabonete em Barra Dove", "limpeza", None),
            ("Detergente Ypê", "limpeza", None),
            ("Detergente Ypê", "higiene", None),
            ("Ração para Cães Pedigree", "bazar", None),
        ])

    def test_destino_sempre_e_categoria_existente_e_aceita_pela_propria_regra(self):
        existentes = {"graos", "padaria", "hortifruti", "carnes", "leites", "cafe", "bebidas", "limpeza",
                      "higiene", "congelados", "oleos", "mercearia", "bazar", "biscoitos"}
        for regra in lc.REGRAS:
            self.assertIn(regra.destino, existentes, regra.nome)
            self.assertIn(regra.destino, regra.aceitas, f"{regra.nome}: destino fora das categorias aceitas não seria idempotente")

    def test_recategorizar_produtos_registra_antes_depois_e_regra_e_e_idempotente(self):
        ps = [prod("p1", nome="Macarrão Penne 500g", categoria="hortifruti"),
              prod("p2", id_origem="2", nome="Arroz Branco 1kg", categoria="graos")]
        uma, alterados = lc.recategorizar_produtos(ps)
        self.assertEqual([p["category"] for p in uma], ["mercearia", "graos"])
        self.assertEqual(alterados, [{"id": "p1", "name": "Macarrão Penne 500g", "antes": "hortifruti",
                                      "depois": "mercearia", "regra": "massa_seca"}])
        duas, de_novo = lc.recategorizar_produtos(uma)
        self.assertEqual(uma, duas)
        self.assertEqual(de_novo, [])


class TestForaDeEscopo(unittest.TestCase):
    def test_lista_pet_e_casa_eletro_sem_remover_nada(self):
        ps = [prod("p1", nome="Ração Para Cão Champ 85g", categoria="bazar"),
              prod("p2", id_origem="2", nome="Cafeteira Cadence 220V", categoria="bazar"),
              prod("p3", id_origem="3", nome="Papel Manteiga Wyda", categoria="bazar"),
              prod("p4", id_origem="4", nome="Arroz Branco 1kg", categoria="graos")]
        achados = lc.listar_fora_de_escopo(ps)
        self.assertEqual([(a["id"], a["tipo"]) for a in achados], [("p1", "pet"), ("p2", "casa/eletro")])
        self.assertEqual(len(ps), 4)


class TestPipeline(unittest.TestCase):
    def sujo(self):
        return [
            prod("p1", id_origem="10", nome="Macarrão Penne 500g", categoria="hortifruti"),
            prod("p2", id_origem="10", nome="Macarrão Penne 500g", categoria="hortifruti"),
            prod("p3", id_origem="30", nome="Queijo ParmesÃ£o Ralado 40g", categoria="leites"),
            prod("p4", id_origem="40", nome="Iogurte Líquido Morango 1,250g", categoria="leites", unidade="1,250g"),
            prod("p5", id_origem="50", nome="Sabonete Palmolive Café 85g", categoria="cafe"),
        ]

    def test_aplica_todas_as_correcoes_sem_renumerar(self):
        saida, rel = lc.limpar(self.sujo())
        self.assertEqual([p["id"] for p in saida], ["p1", "p3", "p4", "p5"])
        por_id = {p["id"]: p for p in saida}
        self.assertEqual(por_id["p1"]["category"], "mercearia")
        self.assertEqual(por_id["p3"]["name"], "Queijo Parmesão Ralado 40g")
        self.assertEqual(por_id["p4"]["unit"], "1,25kg")
        self.assertEqual(por_id["p5"]["category"], "higiene")
        self.assertEqual(len(rel["duplicatas"]["removidas"]), 1)
        self.assertEqual(len(rel["encoding"]), 1)
        self.assertEqual(len(rel["unidades"]), 1)
        self.assertEqual({a["regra"] for a in rel["categorias"]}, {"massa_seca", "higiene"})

    def test_segunda_passada_nao_muda_nada(self):
        uma, _ = lc.limpar(self.sujo())
        duas, rel = lc.limpar(uma)
        self.assertEqual(uma, duas)
        self.assertFalse(lc.ha_mudancas(rel))

    def test_nao_altera_a_lista_de_entrada(self):
        entrada = self.sujo()
        copia = json.loads(json.dumps(entrada))
        lc.limpar(entrada)
        self.assertEqual(entrada, copia)


class TestLinhaDeComando(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.data_js = Path(self.tmp.name) / "data.js"
        self.relatorio = Path(self.tmp.name) / "RELATORIO.md"
        produtos = [
            prod("p1", id_origem="10", nome="Macarrão Penne 500g", categoria="hortifruti"),
            prod("p2", id_origem="10", nome="Macarrão Penne 500g", categoria="hortifruti"),
            prod("p3", id_origem="30", nome="Arroz 1kg", categoria="graos"),
        ]
        self.data_js.write_text(montar(produtos), encoding="utf-8")

    def rodar(self, *args):
        return lc.main(["--data-js", str(self.data_js), *args])

    def test_verificar_sai_com_1_sem_gravar_enquanto_ha_o_que_limpar(self):
        antes = self.data_js.read_bytes()
        self.assertEqual(self.rodar("--verificar"), 1)
        self.assertEqual(self.data_js.read_bytes(), antes)

    def test_limpar_grava_atualiza_cabecalho_e_depois_verificar_passa(self):
        self.assertEqual(self.rodar(), 0)
        texto = self.data_js.read_text(encoding="utf-8")
        _, produtos, _ = lc.ler_data_js(texto)
        self.assertEqual([p["id"] for p in produtos], ["p1", "p3"])
        self.assertEqual(produtos[0]["category"], "mercearia")
        self.assertIn(": 2 produtos, cada um", texto)
        self.assertEqual(self.rodar("--verificar"), 0)

    def test_segunda_execucao_deixa_o_arquivo_byte_a_byte_igual(self):
        self.rodar("--relatorio", str(self.relatorio))
        depois_da_primeira = self.data_js.read_bytes()
        relatorio_1 = self.relatorio.read_bytes()
        self.assertEqual(self.rodar("--relatorio", str(self.relatorio)), 0)
        self.assertEqual(self.data_js.read_bytes(), depois_da_primeira)
        self.assertEqual(self.relatorio.read_bytes(), relatorio_1, "sem mudanças o relatório histórico não é reescrito")

    def test_relatorio_lista_ids_antes_e_depois(self):
        self.rodar("--relatorio", str(self.relatorio))
        texto = self.relatorio.read_text(encoding="utf-8")
        self.assertIn("p2", texto)
        self.assertIn("hortifruti", texto)
        self.assertIn("mercearia", texto)
        self.assertIn("massa_seca", texto)

    def test_preserva_fim_de_linha_crlf(self):
        texto = self.data_js.read_text(encoding="utf-8").replace("\n", "\r\n")
        self.data_js.write_bytes(texto.encode("utf-8"))
        self.rodar()
        self.assertIn(b"\r\n", self.data_js.read_bytes())
        self.assertNotIn(b"\r\r", self.data_js.read_bytes())


if __name__ == "__main__":
    unittest.main()
