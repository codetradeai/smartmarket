#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartMarket - Motor de Assinatura Semântica Canônica e Entity Resolution
Diretório: scripts/consolidar_ofertas.py

Regras de Negócio:
1. Extração Estruturada de Atributos:
   - Categoria Base
   - Marca (Dicionário do varejo gaúcho/nacional)
   - Peso / Volume / Unidade convertido para escala base (g, ml, un)
   - Subtipo essencial padronizado sem ruídos de embalagem
2. Zero Falsos Positivos:
   - EAN exato prioritário.
   - Assinatura semântica: {categoria_base}_{marca}_{subtipo}_{medida_padronizada}.
   - Requer mesma categoria, mesma marca e mesma medida padronizada com similaridade de tokens >= 0.60.
3. Agrupamento por Preço em Filiais:
   - Se múltiplas filiais da mesma rede possuem o mesmo preço, consolida em `filiais_ids: [...]`.
"""

import os
import re
import csv
import json
import unicodedata
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Any, Optional, Set, Tuple

DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
DIR_SAIDA = DIRETORIO_SCRIPTS / "saida"
ARQUIVO_BANCO_OTIMIZADO = DIR_SAIDA / "banco_produtos_otimizado.json"
ARQUIVO_SCHEMA_SQL = DIR_SAIDA / "schema_otimizado_filiais.sql"
ARQUIVO_CATALOGO_FILIAIS = DIRETORIO_SCRIPTS / "catalogo_filiais_rs.json"


def normalizar_texto(texto: str) -> str:
    """Remove acentos, pontuação excessiva e converte para minúsculas."""
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", texto)
    sem_acento = "".join([c for c in nfkd if not unicodedata.combining(c)])
    limpo = re.sub(r"[^\w\s\d]", " ", sem_acento.lower())
    return re.sub(r"\s+", " ", limpo).strip()


# -----------------------------------------------------------------------------
# 1. NORMALIZAÇÃO DE PESO / VOLUME / UNIDADE (CONVERSÃO PARA UNIDADE BASE)
# -----------------------------------------------------------------------------
def normalizar_medida(texto: str) -> Optional[str]:
    """
    Detecta e converte pesos, volumes e contagens para uma unidade base padrão:
    - 1kg, 1 kg, 1.000g, 1000g, 1 quilo -> 1000g
    - 5kg, 5000g -> 5000g
    - 1l, 1 litro, 1000ml -> 1000ml
    - 2l, 2000ml -> 2000ml
    - 350ml, lata 350ml -> 350ml
    - 12 rolos, c/ 30, 30 un -> 12un, 30un
    """
    if not texto:
        return None
    t = normalizar_texto(texto)

    # 1. Quilos e Gramas
    m_quilo = re.search(r"(\d+(?:[.,]\d+)?)\s*quilos?", t)
    if m_quilo:
        val = float(m_quilo.group(1).replace(",", "."))
        return f"{int(val * 1000)}g"

    m_g_mil = re.search(r"\b(\d+)\.000\s*g\b", t)
    if m_g_mil:
        return f"{m_g_mil.group(1)}000g"

    m_kg = re.search(r"(\d+(?:[.,]\d+)?)\s*kg\b", t)
    if m_kg:
        val = float(m_kg.group(1).replace(",", "."))
        return f"{int(val * 1000)}g"

    m_g = re.search(r"(\d+)\s*g\b", t)
    if m_g:
        return f"{m_g.group(1)}g"

    # 2. Litros e Mililitros
    m_litro = re.search(r"(\d+(?:[.,]\d+)?)\s*litros?", t)
    if m_litro:
        val = float(m_litro.group(1).replace(",", "."))
        return f"{int(val * 1000)}ml"

    m_l = re.search(r"(\d+(?:[.,]\d+)?)\s*l\b", t)
    if m_l:
        val = float(m_l.group(1).replace(",", "."))
        return f"{int(val * 1000)}ml"

    m_ml = re.search(r"(\d+)\s*ml\b", t)
    if m_ml:
        return f"{m_ml.group(1)}ml"

    # 3. Contagens e Unidades
    m_rolos = re.search(r"(\d+)\s*rolos?", t)
    if m_rolos:
        return f"{m_rolos.group(1)}un"

    m_c = re.search(r"(?:c/|cx\s*|com\s*)(\d+)\b", t)
    if m_c:
        return f"{m_c.group(1)}un"

    m_un = re.search(r"(\d+)\s*(?:unidades?|unids?|un|capsulas?)\b", t)
    if m_un:
        return f"{m_un.group(1)}un"

    return None


# -----------------------------------------------------------------------------
# 2. DICIONÁRIO ROBUSTO DE MARCAS DO VAREJO GAÚCHO E NACIONAL
# -----------------------------------------------------------------------------
BRAND_DICTIONARY = [
    # Arroz e Grãos
    "tio joao", "camil", "blue ville", "namorado", "prato fino", "arbaza", "kicaldo",
    "caldo de ouro", "bulnez", "paganini", "urbano", "da terrinha", "tordilho",
    # Cafés e Chás
    "melitta", "pilao", "3 coracoes", "tres coracoes", "nescafe", "iguacu", "caboclo",
    "damiao", "lor", "bravo", "marata", "bom jesus",
    # Laticínios e Derivados
    "elege", "tirol", "italac", "pia", "parmalat", "ninho", "santa clara", "piracanjuba",
    "batavo", "danone", "vigor", "crioulo", "presidente", "quata", "moça", "moca",
    # Óleos e Gorduras
    "soya", "liza", "concordia", "salada", "coamo", "leve", "vitaliv", "bunge",
    # Açúcar e Farinhas
    "uniao", "caravelas", "da barra", "guarani", "alto alegre", "orquidea", "dona benta",
    "renata", "mirella", "rosa branca",
    # Massas e Molhos
    "isabela", "renata", "adria", "barilla", "vilma", "paganini", "predilecta", "heinz",
    "fugini", "elefante", "quero", "tarantella",
    # Chocolates e Doces
    "neugebauer", "garoto", "lacta", "nestle", "ferrero", "hersheys",
    # Bebidas e Cervejas
    "coca cola", "pepsi", "fruki", "guarana antarctica", "fanta", "sprite", "sukita",
    "brahma", "skol", "polar", "heineken", "amstel", "budweiser", "corona", "stella artois",
    "becks", "eisenbahn", "bohemia", "schin", "devassa",
    # Limpeza e Higiene
    "omo", "tixan", "ype", "brilhante", "girando sol", "minuano", "ariel", "comfort",
    "downy", "vanish", "veja", "ajax", "sapolio", "cif", "pinho sol",
    "personal", "neve", "dualette", "mili", "sublime", "paloma", "fofinho", "mimmo",
    "colgate", "sorriso", "oral b", "dove", "lux", "palmolive", "nivea", "rexona",
    # Carnes e Frios
    "sadia", "perdigao", "seara", "aurora", "nat", "frangosul", "friboi", "swift",
    "pamplona", "ceratti", "minerva", "marfrig"
]

BRAND_DICTIONARY.sort(key=len, reverse=True)


def extrair_marca(texto: str) -> Optional[str]:
    """Extrai a marca a partir do título do produto utilizando o dicionário."""
    t = normalizar_texto(texto)
    for marca in BRAND_DICTIONARY:
        padrao = rf"\b{re.escape(marca)}\b"
        if re.search(padrao, t):
            if marca in ("3 coracoes", "tres coracoes"):
                return "3_coracoes"
            if marca == "coca cola":
                return "coca_cola"
            if marca == "guarana antarctica":
                return "guarana_antarctica"
            if marca == "blue ville":
                return "blue_ville"
            if marca == "tio joao":
                return "tio_joao"
            if marca == "prato fino":
                return "prato_fino"
            if marca == "caldo de ouro":
                return "caldo_de_ouro"
            if marca == "da terrinha":
                return "da_terrinha"
            if marca == "santa clara":
                return "santa_clara"
            if marca == "dona benta":
                return "dona_benta"
            if marca == "girando sol":
                return "girando_sol"
            if marca in ("moça", "moca"):
                return "moca"
            return marca.replace(" ", "_")
    return None


# -----------------------------------------------------------------------------
# 3. CATEGORIZAÇÃO BASE E SINÔNIMOS DE SUBTIPO
# -----------------------------------------------------------------------------
CATEGORIAS_BASE = {
    "arroz": ["arroz"],
    "feijao": ["feijao"],
    "cafe": ["cafe", "cappuccino", "capuccino"],
    "leite": ["leite"],
    "oleo": ["oleo", "azeite"],
    "acucar": ["acucar"],
    "farinha": ["farinha"],
    "macarrao": ["macarrao", "espaguete", "spaghetti", "penne", "parafuso", "fusilli"],
    "refrigerante": ["refrigerante", "refri", "coca", "guarana", "pepsi", "fruki", "fanta", "sprite"],
    "cerveja": ["cerveja", "chope", "chopp"],
    "sabao": ["sabao", "lava roupas", "detergente em po", "amaciante"],
    "detergente": ["detergente"],
    "papel_higienico": ["papel higienico", "papel hig"],
    "queijo": ["queijo", "mussarela", "mucarela", "prato"],
    "manteiga": ["manteiga", "margarina"],
    "frango": ["frango", "coxa", "sobrecoxa", "peito"],
    "carne": ["carne", "alcatra", "costela", "coxao", "patinho", "picanha", "maminha"]
}


def detectar_categoria_base(texto: str) -> str:
    t = normalizar_texto(texto)
    for cat, aliases in CATEGORIAS_BASE.items():
        for al in aliases:
            if re.search(rf"\b{re.escape(al)}\b", t):
                return cat
    return "geral"


STOPWORDS_EMBALAGEM = {
    "pacote", "pct", "pcte", "caixa", "cx", "embalagem", "unidade", "unid", "un",
    "tradicional", "especial", "selecionado", "selecao", "tipo", "t1", "tp1", "tipo 1",
    "tp", "longo fino", "longo-fino", "agulhinha", "sache", "garrafa", "pet", "lata",
    "tetra pak", "vdo", "vidro", "refil", "pouch", "leve", "pague", "promocao", "oferta",
    "de", "do", "da", "dos", "das", "para", "com", "sem", "em", "supermercados", "supermercado"
}


SUBTIPOS_MAP = {
    # Arroz
    "branco": ["branco", "polido"],
    "parboilizado": ["parboilizado", "parb"],
    "integral": ["integral", "integ"],
    "arboreo": ["arborio", "arboreo", "carnaroli"],
    "carreteiro": ["carreteiro", "cateto"],
    "sushi": ["sushi", "japones"],
    "arabe": ["arabe"],
    "grega": ["grega", "a grega"],
    # Feijão
    "preto": ["preto"],
    "carioca": ["carioca", "carioquinha"],
    "branco_grao": ["branco"],
    "vermelho": ["vermelho"],
    # Leite
    "integral": ["integral"],
    "desnatado": ["desnatado", "desn"],
    "semidesnatado": ["semidesnatado", "semi desnatado", "semi"],
    "zero_lactose": ["zero lactose", "lacfree", "sem lactose"],
    # Café
    "moido": ["torrado e moido", "moido", "po"],
    "soluvel": ["soluvel"],
    "capsula": ["capsulas", "capsula"],
    # Açúcar
    "refinado": ["refinado"],
    "cristal": ["cristal"],
    "demerara": ["demerara"],
    # Papel Higiênico
    "folha_dupla": ["folha dupla", "fd", "dupla"],
    "folha_tripla": ["folha tripla", "ft", "tripla"],
    "folha_simples": ["folha simples", "fs", "simples"]
}


def extrair_subtipo_essencial(texto: str, categoria: str) -> Optional[str]:
    t = normalizar_texto(texto)
    for sub, aliases in SUBTIPOS_MAP.items():
        for al in aliases:
            if re.search(rf"\b{re.escape(al)}\b", t):
                return sub
    return None


def extrair_tokens_significativos(texto: str, marca: Optional[str], medida: Optional[str]) -> Set[str]:
    t = normalizar_texto(texto)
    palavras = t.split()
    tokens = set()
    for p in palavras:
        if p in STOPWORDS_EMBALAGEM or len(p) <= 2:
            continue
        if marca and p in marca.split("_"):
            continue
        if medida and (p in medida or p.isdigit()):
            continue
        tokens.add(p)
    return tokens


def similaridade_jaccard(set1: Set[str], set2: Set[str]) -> float:
    if not set1 and not set2:
        return 1.0
    if not set1 or not set2:
        return 0.0
    inter = len(set1.intersection(set2))
    uniao = len(set1.union(set2))
    return inter / uniao if uniao > 0 else 0.0


# -----------------------------------------------------------------------------
# 4. GERADOR DE ASSINATURA SEMÂNTICA CANÔNICA
# -----------------------------------------------------------------------------
def gerar_assinatura_semantica(nome_bruto: str) -> Dict[str, Any]:
    cat = detectar_categoria_base(nome_bruto)
    marca = extrair_marca(nome_bruto)
    medida = normalizar_medida(nome_bruto)
    subtipo = extrair_subtipo_essencial(nome_bruto, cat)
    tokens = extrair_tokens_significativos(nome_bruto, marca, medida)

    chave = None
    if cat != "geral" and marca and medida:
        sub_str = f"_{subtipo}" if subtipo else ""
        chave = f"sig_{cat}_{marca}{sub_str}_{medida}"

    return {
        "categoria": cat,
        "marca": marca,
        "medida": medida,
        "subtipo": subtipo,
        "tokens": tokens,
        "chave_assinatura": chave
    }


def extrair_ean_valido(ean_raw: Any) -> Optional[str]:
    """Valida se o código de barras parece um EAN/GTIN válido (8, 12, 13 ou 14 dígitos numéricos)."""
    if not ean_raw:
        return None
    ean_str = re.sub(r"\D", "", str(ean_raw))
    if len(ean_str) in [8, 12, 13, 14] and not ean_str.startswith("0000000"):
        return ean_str
    return None


class MotorConsolidacaoOfertas:
    def __init__(self):
        self.filiais_por_rede: Dict[str, List[Dict[str, Any]]] = {}
        self.produtos_canonicos: Dict[str, Dict[str, Any]] = {}
        self.ofertas_agrupadas: List[Dict[str, Any]] = []

        # Índices de resolução de entidade
        self.mapa_ean_para_id: Dict[str, str] = {}
        self.mapa_assinatura_para_id: Dict[str, str] = {}
        self.itens_registrados: List[Dict[str, Any]] = []

        self._carregar_catalogo_filiais()

    def _carregar_catalogo_filiais(self):
        if not ARQUIVO_CATALOGO_FILIAIS.exists():
            print("[AVISO] Arquivo de filiais não encontrado.")
            return

        with open(ARQUIVO_CATALOGO_FILIAIS, "r", encoding="utf-8") as f:
            filiais = json.load(f)

        for f in filiais:
            rede = f["rede"]
            if rede not in self.filiais_por_rede:
                self.filiais_por_rede[rede] = []
            self.filiais_por_rede[rede].append(f)

    def processar_arquivos_coleta(self, lista_arquivos: List[Path]):
        """Consolida os itens coletados de múltiplos arquivos brutos de scrapers."""
        todos_itens = []
        for arq in lista_arquivos:
            if not arq.exists():
                continue
            try:
                with open(arq, "r", encoding="utf-8") as f:
                    itens = json.load(f)
                    if isinstance(itens, list):
                        todos_itens.extend(itens)
            except Exception as e:
                print(f"[Aviso] Erro ao ler {arq}: {e}")

        print(f"\n[Consolidação] Processando {len(todos_itens)} registros brutos de coleta...")

        # 1. Pré-processa e extrai assinaturas
        itens_preparados = []
        for raw in todos_itens:
            nome_bruto = str(raw.get("nome_bruto") or "").strip()
            preco = float(raw.get("preco") or 0.0)
            if not nome_bruto or preco <= 0:
                continue

            ean = extrair_ean_valido(raw.get("codigo_barras"))
            sig = gerar_assinatura_semantica(nome_bruto)
            itens_preparados.append({
                "raw": raw,
                "nome_bruto": nome_bruto,
                "preco": preco,
                "preco_normal": float(raw["preco_normal"]) if raw.get("preco_normal") else None,
                "rede": str(raw.get("supermercado") or "Supermercado").strip(),
                "imagem_url": raw.get("imagem_url"),
                "categoria_bruta": raw.get("categoria", "Mercearia"),
                "ean": ean,
                "sig": sig,
                "filiais_ids": raw.get("filiais_ids")
            })

        # 2. Resolução de Entidade (Entity Resolution Pass)
        for item in itens_preparados:
            prod_id = self._resolver_entidade(item)
            self._vincular_oferta_a_produto(prod_id, item)

        # 3. Finalização e cálculo de economia
        self._finalizar_produtos_canonicos()

        multi = [p for p in self.produtos_canonicos.values() if p.get("total_mercados", 0) >= 2]
        print(f"[Resultado] {len(self.produtos_canonicos)} produtos canônicos únicos.")
        print(f"[Resultado] {len(self.ofertas_agrupadas)} ofertas agrupadas por filiais.")
        print(f"[Resultado] {len(multi)} produtos com comparação direta em 2+ mercados simultaneamente.")

    def _resolver_entidade(self, item: Dict[str, Any]) -> str:
        ean = item["ean"]
        sig = item["sig"]
        nome_bruto = item["nome_bruto"]

        # Regra 1: EAN Idêntico
        if ean and ean in self.mapa_ean_para_id:
            return self.mapa_ean_para_id[ean]

        # Regra 2: Assinatura Semântica Exata
        if sig["chave_assinatura"] and sig["chave_assinatura"] in self.mapa_assinatura_para_id:
            prod_id = self.mapa_assinatura_para_id[sig["chave_assinatura"]]
            if ean:
                self.mapa_ean_para_id[ean] = prod_id
            return prod_id

        # Regra 3: Match Relaxado com Validação de Atributos Críticos
        if sig["categoria"] != "geral" and sig["marca"] and sig["medida"]:
            for existente in self.itens_registrados:
                ex_sig = existente["sig"]
                if (ex_sig["categoria"] == sig["categoria"] and
                    ex_sig["marca"] == sig["marca"] and
                    ex_sig["medida"] == sig["medida"]):

                    if sig["subtipo"] and ex_sig["subtipo"] and sig["subtipo"] != ex_sig["subtipo"]:
                        continue

                    sim = similaridade_jaccard(sig["tokens"], ex_sig["tokens"])
                    if sim >= 0.50:
                        prod_id = existente["prod_id"]
                        if ean:
                            self.mapa_ean_para_id[ean] = prod_id
                        if sig["chave_assinatura"]:
                            self.mapa_assinatura_para_id[sig["chave_assinatura"]] = prod_id
                        return prod_id

        # Regra 4: Novo Produto Canônico
        slug_nome = normalizar_texto(nome_bruto).replace(" ", "_")
        medida_slug = f"_{sig['medida']}" if sig["medida"] else ""
        prod_id = f"prod_{slug_nome[:45]}{medida_slug}"

        if ean:
            self.mapa_ean_para_id[ean] = prod_id
        if sig["chave_assinatura"]:
            self.mapa_assinatura_para_id[sig["chave_assinatura"]] = prod_id

        self.itens_registrados.append({
            "prod_id": prod_id,
            "sig": sig,
            "ean": ean,
            "nome_bruto": nome_bruto
        })

        return prod_id

    def _vincular_oferta_a_produto(self, prod_id: str, item: Dict[str, Any]):
        nome_bruto = item["nome_bruto"]
        preco = item["preco"]
        preco_normal = item["preco_normal"]
        rede = item["rede"]
        imagem_url = item["imagem_url"]
        categoria = item["categoria_bruta"]
        ean = item["ean"]
        sig = item["sig"]

        # Trava de Sanidade Anti-Outlier (Ratio Máximo 2.2x):
        # Se um produto canônico já tem ofertas e a nova oferta tem preço > 2.2x do menor preço
        # ou < menor_preco / 2.2, separa em um produto canônico variante para não misturar embalagens/fardos.
        precos_existentes = [of["preco"] for of in self.ofertas_agrupadas if of["produto_id"] == prod_id]
        if precos_existentes:
            menor_p = min(precos_existentes)
            if preco > (menor_p * 2.2) or (menor_p > preco * 2.2):
                faixa_preco = int(preco)
                prod_id = f"{prod_id}_p{faixa_preco}"

        if prod_id not in self.produtos_canonicos:
            marca_display = (sig["marca"] or "").replace("_", " ").title()
            self.produtos_canonicos[prod_id] = {
                "produto_id": prod_id,
                "nome_canonico": nome_bruto,
                "marca": marca_display if marca_display else item.get("marca"),
                "categoria": categoria,
                "imagem_url": imagem_url,
                "ean": ean,
                "data_atualizacao": datetime.now(timezone.utc).isoformat(),
                "mercados_ofertantes": set(),
                "ofertas_ids": [],
            }
        else:
            if not self.produtos_canonicos[prod_id].get("imagem_url") and imagem_url:
                self.produtos_canonicos[prod_id]["imagem_url"] = imagem_url
            if not self.produtos_canonicos[prod_id].get("ean") and ean:
                self.produtos_canonicos[prod_id]["ean"] = ean

        self.produtos_canonicos[prod_id]["mercados_ofertantes"].add(rede)

        filiais_ids_rede = item.get("filiais_ids")
        if not filiais_ids_rede or not isinstance(filiais_ids_rede, list):
            filiais_da_rede = self.filiais_por_rede.get(rede, [])
            filiais_ids_rede = [f["filial_id"] for f in filiais_da_rede]
            if not filiais_ids_rede:
                filiais_ids_rede = [f"{rede.lower().replace(' ', '_')}_default"]

        oferta_existente = None
        for of in self.ofertas_agrupadas:
            if of["produto_id"] == prod_id and of["rede"] == rede and abs(of["preco"] - preco) < 0.001:
                oferta_existente = of
                break

        if oferta_existente:
            for fid in filiais_ids_rede:
                if fid not in oferta_existente["filiais_ids"]:
                    oferta_existente["filiais_ids"].append(fid)
        else:
            em_promocao = bool(item["raw"].get("em_promocao") or (preco_normal and preco < preco_normal))
            oferta_id = f"of_{prod_id}_{rede.lower()[:4]}_{int(preco*100)}"
            nova_oferta = {
                "oferta_id": oferta_id,
                "produto_id": prod_id,
                "rede": rede,
                "preco": preco,
                "preco_normal": preco_normal,
                "em_promocao": em_promocao,
                "filiais_ids": filiais_ids_rede,
                "data_coleta": item["raw"].get("data_coleta", datetime.now(timezone.utc).isoformat())
            }
            self.ofertas_agrupadas.append(nova_oferta)
            self.produtos_canonicos[prod_id]["ofertas_ids"].append(oferta_id)

    def _finalizar_produtos_canonicos(self):
        for p in self.produtos_canonicos.values():
            p["mercados_ofertantes"] = sorted(list(p["mercados_ofertantes"]))
            p["total_mercados"] = len(p["mercados_ofertantes"])

            precos = [of["preco"] for of in self.ofertas_agrupadas if of["produto_id"] == p["produto_id"]]
            if precos:
                p["menor_preco"] = min(precos)
                p["maior_preco"] = max(precos)
                p["economia_maxima"] = round(p["maior_preco"] - p["menor_preco"], 2)
            else:
                p["menor_preco"] = None
                p["maior_preco"] = None
                p["economia_maxima"] = 0.0

    def exportar(self) -> Dict[str, Any]:
        DIR_SAIDA.mkdir(parents=True, exist_ok=True)
        produtos_lista = list(self.produtos_canonicos.values())
        produtos_multi_mercado = [p for p in produtos_lista if p.get("total_mercados", 0) >= 2]

        dados_otimizados = {
            "metadata": {
                "versao": "2.2.0",
                "data_geracao": datetime.now(timezone.utc).isoformat(),
                "total_produtos_canonicos": len(produtos_lista),
                "total_ofertas_agrupadas": len(self.ofertas_agrupadas),
                "total_produtos_multi_mercado": len(produtos_multi_mercado),
                "regras_aplicadas": [
                    "Zero duplicacao de produtos canonicos",
                    "Agrupamento de filiais com mesmo preco em filiais_ids: [...]",
                    "Assinatura Semantica Canonica (Categoria + Marca + Subtipo + Medida)",
                    "Resolucao de Entidade EAN e Tokens Jaccard >= 0.50"
                ]
            },
            "produtos": produtos_lista,
            "ofertas": self.ofertas_agrupadas
        }

        with open(ARQUIVO_BANCO_OTIMIZADO, "w", encoding="utf-8") as f:
            json.dump(dados_otimizados, f, ensure_ascii=False, indent=2)

        self._exportar_sql()
        return dados_otimizados

    def _exportar_sql(self):
        sql = f"""-- SmartMarket Schema Otimizado com Agrupamento de Filiais
-- Gerado em: {datetime.now(timezone.utc).isoformat()}

CREATE TABLE IF NOT EXISTS produtos_canonicos (
    produto_id VARCHAR(150) PRIMARY KEY,
    nome_canonico VARCHAR(255) NOT NULL,
    marca VARCHAR(100),
    categoria VARCHAR(100),
    imagem_url TEXT,
    ean VARCHAR(20),
    total_mercados INT DEFAULT 1,
    menor_preco DECIMAL(10, 2),
    maior_preco DECIMAL(10, 2),
    economia_maxima DECIMAL(10, 2),
    data_atualizacao TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ofertas_filiais (
    oferta_id VARCHAR(180) PRIMARY KEY,
    produto_id VARCHAR(150) REFERENCES produtos_canonicos(produto_id),
    rede VARCHAR(100) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    preco_normal DECIMAL(10, 2),
    em_promocao BOOLEAN DEFAULT FALSE,
    filiais_ids JSONB NOT NULL,
    data_coleta TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ofertas_produto ON ofertas_filiais(produto_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_rede ON ofertas_filiais(rede);
CREATE INDEX IF NOT EXISTS idx_ofertas_filiais_gin ON ofertas_filiais USING gin (filiais_ids);
"""
        with open(ARQUIVO_SCHEMA_SQL, "w", encoding="utf-8") as f:
            f.write(sql)


if __name__ == "__main__":
    motor = MotorConsolidacaoOfertas()
    arquivos_coleta = [
        DIR_SAIDA / "coleta_marcas_direcionada.json",
        DIR_SAIDA / "coleta_massiva_bruta.json",
        DIR_SAIDA / "coleta_fort_atacadista.json",
        DIR_SAIDA / "coleta_asun_supermercados.json",
        DIR_SAIDA / "coleta_carrefour_mercado.json",
        DIR_SAIDA / "coleta_atacadao.json",
        DIR_SAIDA / "coleta_master_supermercados.json",
        DIR_SAIDA / "coleta_stok_center.json",
        DIR_SAIDA / "coleta_zaffari___bourbon.json",
        DIR_SAIDA / "coleta_supermercados_rissul.json",
    ]
    motor.processar_arquivos_coleta(arquivos_coleta)
    motor.exportar()
