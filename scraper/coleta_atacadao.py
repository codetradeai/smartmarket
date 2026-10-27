"""
SmartMarket - Scraper Atacadão (RS)
------------------------------------
Coleta produtos de supermercado e atacado via a API oficial VTEX Catalog System
do e-commerce do Atacadão (atacadao.com.br).

Extrai com fidelidade:
- Nome completo e padronizado
- Preço à vista (unitário normal) e preço de lista/tabela
- Descrição detalhada do produto (limpa de marcações HTML)
- URL da imagem em alta resolução nativa (CDN VTEX atacadaobr.vteximg.com.br)
- Marca, Categoria, SKU/ID externo e URL direta do produto

Saída: dois arquivos (.json e .csv) prontos para normalização e carga no banco de dados.
"""

import argparse
import csv
import json
import logging
import math
import re
import tempfile
import time
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Dict, List, Optional

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO DE CATEGORIAS E ENDPOINTS VTEX ATACADÃO
# ---------------------------------------------------------------------------
BASE_URL = "https://www.atacadao.com.br/api/catalog_system/pub/products/search"
STOREFRONT_BASE_URL = "https://www.atacadao.com.br"

CATEGORIAS = {
    "Mercearia": "C:2",             # Mercearia / Alimentos Básicos (Arroz, Feijão, Óleo, Farinhas)
    "Lacteos_Frios": "C:130",       # Frios e Congelados > Lácteos
    "Bebidas": "C:4",               # Bebidas
    "Hortifruti": "C:11",           # Hortifrúti
    "Carnes_Aves_Peixes": "C:13",   # Carnes, Aves e Peixes
    "Limpeza": "C:8",               # Limpeza
}

LIMITE_POR_CATEGORIA = 20
TAMANHO_PAGINA = 15
PAUSA_ENTRE_REQUISICOES = 1.5
MAX_PAGINAS_POR_CATEGORIA = 10

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (SmartMarket RS Bot)",
    "Accept": "application/json, text/plain, */*",
    "Referer": f"{STOREFRONT_BASE_URL}/",
    "Origin": STOREFRONT_BASE_URL,
}

CAMPOS = (
    "nome_bruto",
    "preco",
    "preco_normal",
    "em_promocao",
    "marca",
    "categoria",
    "slug",
    "id_produto_origem",
    "supermercado",
    "data_coleta",
    "imagem_url",
    "descricao",
    "url_produto",
)


class ErroColeta(Exception):
    """Falha de transporte, indisponibilidade ou resposta inválida da fonte."""


def buscar_pagina(url: str, *, headers: dict, params: dict, timeout: int = 10) -> list:
    """Realiza requisição HTTP à API VTEX e decodifica lista JSON com precisão Decimal."""
    import requests

    try:
        resposta = requests.get(url, headers=headers, params=params, timeout=timeout)
        resposta.raise_for_status()
        dados = resposta.json(parse_float=Decimal)
        if not isinstance(dados, list):
            raise ErroColeta("resposta_esperada_lista_produtos")
        return dados
    except (requests.RequestException, ValueError) as exc:
        raise ErroColeta(type(exc).__name__) from exc


def limpar_html(texto: Optional[str]) -> Optional[str]:
    """Remove tags HTML e normaliza espaços em branco da descrição."""
    if not texto or not isinstance(texto, str):
        return None
    limpo = re.sub(r"<[^>]+>", " ", texto)
    limpo = " ".join(limpo.split()).strip()
    return limpo if limpo else None


def preco_positivo(valor: Any) -> float:
    """Valida decimal finito e estritamente positivo."""
    if valor is None or isinstance(valor, bool):
        raise ValueError("preco_ausente_ou_invalido")
    try:
        decimal = Decimal(str(valor))
    except (InvalidOperation, ValueError):
        raise ValueError("preco_nao_numerico") from None
    if not decimal.is_finite() or decimal <= 0:
        raise ValueError("preco_nao_positivo_ou_nao_finito")
    numero = float(decimal)
    if not math.isfinite(numero) or numero <= 0:
        raise ValueError("preco_fora_do_intervalo")
    return numero


def obter_url_imagem_alta_resolucao(item_sku: dict) -> Optional[str]:
    """Extrai a URL direta da imagem em alta resolução da CDN VTEX."""
    imagens = item_sku.get("images")
    if not isinstance(imagens, list) or not imagens:
        return None
    primeira = imagens[0]
    if isinstance(primeira, dict):
        url = primeira.get("imageUrl")
        if isinstance(url, str) and url.strip():
            # A URL do VTEX geralmente vem como:
            # https://atacadaobr.vteximg.com.br/arquivos/ids/2099129/g.jpg.jpg?v=639282746399000000
            # Removemos dimensões de redimensionamento caso existam no path
            url_limpa = re.sub(r"/ids/\d+-\d+-\d+/", lambda m: m.group(0).split("-")[0] + "/", url.strip())
            return url_limpa
    return None


def transformar_produto(produto_raw: dict, nome_categoria: str, instante: datetime) -> dict:
    """Converte e valida um produto do catálogo VTEX para o padrão do SmartMarket."""
    if not isinstance(produto_raw, dict):
        raise ValueError("produto_nao_objeto")

    nome = produto_raw.get("productName")
    if not isinstance(nome, str) or not nome.strip():
        raise ValueError("nome_ausente_ou_invalido")

    skus = produto_raw.get("items")
    if not isinstance(skus, list) or not skus:
        raise ValueError("skus_ausentes")

    primeiro_sku = skus[0]
    sellers = primeiro_sku.get("sellers")
    if not isinstance(sellers, list) or not sellers:
        raise ValueError("sellers_ausentes")

    commertial_offer = sellers[0].get("commertialOffer")
    if not isinstance(commertial_offer, dict):
        raise ValueError("commertial_offer_ausente")

    preco_atual = commertial_offer.get("Price")
    if preco_atual is None:
        raise ValueError("preco_ausente")
    preco_efetivo = preco_positivo(preco_atual)

    preco_tabela = commertial_offer.get("ListPrice")
    preco_normal = preco_positivo(preco_tabela) if preco_tabela is not None and preco_tabela > 0 else preco_efetivo

    em_promocao = preco_efetivo < preco_normal

    if instante.tzinfo is None or instante.utcoffset() is None:
        raise ValueError("instante_sem_fuso")

    externo = produto_raw.get("productId")
    if externo is not None and (isinstance(externo, bool) or not isinstance(externo, (str, int))):
        raise ValueError("id_produto_origem_invalido")

    slug = produto_raw.get("linkText")
    link_direto = produto_raw.get("link")
    if not link_direto and slug:
        link_direto = f"{STOREFRONT_BASE_URL}/{slug}/p"

    descricao = limpar_html(produto_raw.get("description"))

    return {
        "nome_bruto": nome.strip(),
        "preco": preco_efetivo,
        "preco_normal": preco_normal,
        "em_promocao": em_promocao,
        "marca": produto_raw.get("brand") if isinstance(produto_raw.get("brand"), str) else None,
        "categoria": nome_categoria,
        "slug": slug if slug else None,
        "id_produto_origem": str(externo) if externo is not None else None,
        "supermercado": "Atacadão",
        "data_coleta": instante.astimezone(timezone.utc).isoformat(timespec="seconds"),
        "imagem_url": obter_url_imagem_alta_resolucao(primeiro_sku),
        "descricao": descricao if descricao and descricao != nome.strip() else None,
        "url_produto": link_direto,
    }


def coletar_categoria(
    nome_categoria: str,
    filtro_fq: str,
    *,
    buscar=None,
    falhas: Optional[list] = None,
    dormir=time.sleep,
    agora=None,
    limite: int = LIMITE_POR_CATEGORIA,
) -> List[dict]:
    """Coleta produtos paginados de uma categoria no Atacadão via VTEX Search API."""
    buscar = buscar or buscar_pagina
    falhas = falhas if falhas is not None else []
    agora = agora or (lambda: datetime.now(timezone.utc))
    produtos = []

    for pagina in range(MAX_PAGINAS_POR_CATEGORIA):
        de_indice = pagina * TAMANHO_PAGINA
        ate_indice = de_indice + min(TAMANHO_PAGINA, limite - len(produtos)) - 1
        if de_indice > ate_indice:
            break

        params = {
            "fq": filtro_fq,
            "_from": de_indice,
            "_to": ate_indice,
        }

        try:
            lista_produtos = buscar(BASE_URL, headers=HEADERS, params=params, timeout=12)
            if not lista_produtos:
                break

            instante_requisicao = agora()
            for indice, prod_raw in enumerate(lista_produtos):
                try:
                    item_transformado = transformar_produto(prod_raw, nome_categoria, instante_requisicao)
                    produtos.append(item_transformado)
                    if len(produtos) >= limite:
                        return produtos
                except ValueError as exc:
                    falhas.append({"categoria": nome_categoria, "motivo": str(exc), "pagina": pagina, "indice": indice})

            if len(lista_produtos) < TAMANHO_PAGINA:
                break

            dormir(PAUSA_ENTRE_REQUISICOES)

        except ErroColeta as exc:
            falhas.append({"categoria": nome_categoria, "motivo": str(exc), "pagina": pagina})
            break

    return produtos


def executar_coleta(
    categorias: Optional[Dict[str, str]] = None,
    *,
    buscar=None,
    limite_por_categoria: int = LIMITE_POR_CATEGORIA,
    dormir=time.sleep,
    agora=None,
) -> tuple[List[dict], List[dict]]:
    """Executa a coleta para o conjunto de categorias configuradas no Atacadão."""
    categorias = categorias or CATEGORIAS
    todos_produtos = []
    todas_falhas = []

    for nome_cat, fq_cat in categorias.items():
        LOGGER.info("Iniciando coleta Atacadão: %s (Filtro: %s)", nome_cat, fq_cat)
        itens = coletar_categoria(
            nome_cat,
            fq_cat,
            buscar=buscar,
            falhas=todas_falhas,
            dormir=dormir,
            agora=agora,
            limite=limite_por_categoria,
        )
        todos_produtos.extend(itens)
        LOGGER.info("Categoria %s finalizada com %d produtos válidos", nome_cat, len(itens))

    return todos_produtos, todas_falhas


def salvar_json(produtos: List[dict], destino: Path) -> None:
    """Gravação atômica em JSON para evitar arquivos corrompidos."""
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=destino.parent) as tmp:
        json.dump(produtos, tmp, ensure_ascii=False, indent=2)
        temp_path = Path(tmp.name)
    temp_path.replace(destino)


def salvar_csv(produtos: List[dict], destino: Path) -> None:
    """Gravação atômica em CSV compatível com padrão da ingestão."""
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="", delete=False, dir=destino.parent) as tmp:
        writer = csv.DictWriter(tmp, fieldnames=CAMPOS)
        writer.writeheader()
        for prod in produtos:
            writer.writerow({k: prod.get(k) for k in CAMPOS})
        temp_path = Path(tmp.name)
    temp_path.replace(destino)


def main() -> None:
    parser = argparse.ArgumentParser(description="Coletor de dados Atacadão (SmartMarket RS)")
    parser.add_argument("--formato", choices=["json", "csv", "ambos"], default="ambos")
    parser.add_argument("--saida", default=str(Path(__file__).parent / "output" / "coleta_atacadao"))
    parser.add_argument("--limite", type=int, default=15, help="Limite de produtos por categoria")
    parser.add_argument("--apenas-categoria", help="Executa apenas a categoria informada")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    cats = CATEGORIAS
    if args.apenas_categoria:
        if args.apenas_categoria not in CATEGORIAS:
            parser.error(f"Categoria desconhecida. Disponíveis: {list(CATEGORIAS.keys())}")
        cats = {args.apenas_categoria: CATEGORIAS[args.apenas_categoria]}

    produtos, falhas = executar_coleta(cats, limite_por_categoria=args.limite)
    print(f"\n[SUCESSO] Total de produtos coletados com sucesso: {len(produtos)}")
    print(f"[STATUS] Falhas registradas descartadas: {len(falhas)}")

    base_saida = Path(args.saida)
    if args.formato in ("json", "ambos"):
        json_path = base_saida.with_suffix(".json")
        salvar_json(produtos, json_path)
        print(f"[EXPORT] JSON gerado: {json_path}")
    if args.formato in ("csv", "ambos"):
        csv_path = base_saida.with_suffix(".csv")
        salvar_csv(produtos, csv_path)
        print(f"[EXPORT] CSV gerado: {csv_path}")


if __name__ == "__main__":
    main()
