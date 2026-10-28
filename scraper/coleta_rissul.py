"""
SmartMarket - Scraper Supermercados Rissul (RS)
-----------------------------------------------
Coleta produtos de supermercado da rede Supermercados Rissul (Rio Grande do Sul)
utilizando a API oficial VTEX Catalog System (rissul.com.br/api/catalog_system/pub/products/search).

Extrai com fidelidade:
- Nome completo e padronizado
- Preço à vista (unitário normal) e preço de lista/tabela
- Descrição detalhada do produto (limpa de marcações HTML)
- URL da imagem em alta resolução nativa (CDN VTEX rissul.vteximg.com.br)
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
from typing import Any, Dict, List, Optional, Tuple

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO DE CATEGORIAS E ENDPOINTS VTEX RISSUL
# ---------------------------------------------------------------------------
BASE_URL = "https://www.rissul.com.br/api/catalog_system/pub/products/search"
STOREFRONT_BASE_URL = "https://www.rissul.com.br"

CATEGORIAS = {
    "Mercearia": "C:7",
    "Carnes_Aves_Peixes": "C:8",
    "Frios_Laticinios": "C:10",
    "Bebidas": "C:11",
    "Hortifruti": "C:1",
    "Padaria": "C:9",
    "Limpeza": "C:12",
    "Congelados": "C:2",
}

LIMITE_POR_CATEGORIA = 20
TAMANHO_PAGINA = 15
PAUSA_ENTRE_REQUISICOES = 1.0
MAX_PAGINAS_POR_CATEGORIA = 5

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


def buscar_pagina(url: str, *, headers: dict, params: dict, timeout: int = 15) -> list:
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
    limpo = re.sub(r"\s+([.,;:!?])", r"\1", limpo)
    limpo = " ".join(limpo.split()).strip()
    return limpo if limpo else None


def preco_positivo(valor: Any) -> float:
    """Valida decimal finito e estritamente positivo."""
    if valor is None or isinstance(valor, bool):
        raise ValueError("preco_ausente_ou_invalido")
    try:
        decimal = Decimal(str(valor))
    except (InvalidOperation, ValueError):
        raise ValueError(f"preco_invalido: {valor}") from None
    if not decimal.is_finite() or decimal <= Decimal("0"):
        raise ValueError(f"preco_deve_ser_positivo: {valor}")
    return float(decimal)


def obter_url_imagem_alta_resolucao(url_raw: Optional[str]) -> Optional[str]:
    """Extrai URL limpa da CDN VTEX em alta resolução."""
    if not url_raw or not isinstance(url_raw, str):
        return None
    url = url_raw.strip()
    url = re.sub(r"-\d+-\d+(?=/|\.)", "", url)
    return url


def carregar_fixture(caminho: Path):
    """Carrega dados estáticos de fixture para testes offline."""
    with open(caminho, "r", encoding="utf-8") as f:
        dados = json.load(f)

    def buscar_fixture(url, headers=None, params=None, timeout=10):
        termo = (params or {}).get("fq", "").replace("C:", "")
        for k, v in dados.items():
            if k == termo or k.replace("C:", "") == termo or f"C:{termo}" == k:
                return v
        if dados:
            return next(iter(dados.values()))
        return []

    return buscar_fixture


def transformar_produto(
    item_vtex: dict,
    categoria_nome: str,
    instante_coleta: datetime,
) -> Optional[dict]:
    """Mapeia o payload bruto de um produto VTEX Rissul para o schema do SmartMarket."""
    nome = item_vtex.get("productName") or ""
    if not nome or not isinstance(nome, str):
        return None

    produto_id = item_vtex.get("productId")
    if not produto_id:
        return None

    items = item_vtex.get("items") or []
    if not items or not isinstance(items, list):
        return None

    item_sku = items[0]
    sellers = item_sku.get("sellers") or []
    if not sellers or not isinstance(sellers, list):
        return None

    commertial_offer = sellers[0].get("commertialOffer") or {}
    price_raw = commertial_offer.get("Price")
    list_price_raw = commertial_offer.get("ListPrice")

    try:
        preco_atual = preco_positivo(price_raw)
    except ValueError:
        return None

    try:
        preco_lista = preco_positivo(list_price_raw) if list_price_raw else preco_atual
    except ValueError:
        preco_lista = preco_atual

    em_promocao = preco_lista > preco_atual
    preco_final = preco_atual
    preco_normal = preco_lista if em_promocao else preco_atual

    images = item_sku.get("images") or []
    imagem_url = None
    if images and isinstance(images, list) and isinstance(images[0], dict):
        imagem_url = obter_url_imagem_alta_resolucao(images[0].get("imageUrl"))

    descricao = limpar_html(item_vtex.get("description") or item_vtex.get("metaTagDescription"))

    url_prod = item_vtex.get("link")
    if url_prod and url_prod.startswith("/"):
        url_prod = f"{STOREFRONT_BASE_URL}{url_prod}"
    elif not url_prod:
        slug = item_vtex.get("linkText") or ""
        url_prod = f"{STOREFRONT_BASE_URL}/{slug}/p" if slug else STOREFRONT_BASE_URL

    marca = item_vtex.get("brand")
    marca = str(marca).strip() if marca else None

    return {
        "nome_bruto": nome.strip(),
        "preco": round(preco_final, 2),
        "preco_normal": round(preco_normal, 2),
        "em_promocao": em_promocao,
        "marca": marca,
        "categoria": categoria_nome,
        "slug": str(item_vtex.get("linkText") or ""),
        "id_produto_origem": str(produto_id),
        "supermercado": "Rissul",
        "data_coleta": instante_coleta.isoformat(),
        "imagem_url": imagem_url,
        "descricao": descricao,
        "url_produto": url_prod,
    }


def coletar_categoria(
    nome_cat: str,
    id_cat: str,
    limite: int = LIMITE_POR_CATEGORIA,
    instante_coleta: Optional[datetime] = None,
    buscar_fn=buscar_pagina,
    pausa: float = PAUSA_ENTRE_REQUISICOES,
    max_paginas: int = MAX_PAGINAS_POR_CATEGORIA,
) -> Tuple[List[dict], List[dict]]:
    """Pagina e extrai produtos de uma categoria VTEX Rissul."""
    instante = instante_coleta or datetime.now(timezone.utc)
    produtos: List[dict] = []
    falhas: List[dict] = []
    skus_vistos = set()

    for pagina in range(max_paginas):
        de = pagina * TAMANHO_PAGINA
        ate = de + TAMANHO_PAGINA - 1
        params = {
            "fq": id_cat,
            "_from": de,
            "_to": ate,
        }

        try:
            itens_vtex = buscar_fn(BASE_URL, headers=HEADERS, params=params)
        except ErroColeta as exc:
            falhas.append({"categoria": nome_cat, "pagina": pagina, "erro": str(exc)})
            break

        if not itens_vtex:
            break

        novos = 0
        for item in itens_vtex:
            prod = transformar_produto(item, nome_cat, instante)
            if not prod:
                continue
            if prod["id_produto_origem"] in skus_vistos:
                continue
            skus_vistos.add(prod["id_produto_origem"])
            produtos.append(prod)
            novos += 1
            if len(produtos) >= limite:
                break

        if novos == 0 or len(produtos) >= limite:
            break

        if pausa > 0:
            time.sleep(pausa)

    return produtos, falhas


def executar_coleta(
    categorias: Optional[Dict[str, str]] = None,
    limite_por_categoria: int = LIMITE_POR_CATEGORIA,
    buscar_fn=buscar_pagina,
    pausa: float = PAUSA_ENTRE_REQUISICOES,
) -> Tuple[List[dict], List[dict]]:
    """Orquestra a coleta de todas as categorias configuradas."""
    instante = datetime.now(timezone.utc)
    cats = categorias or CATEGORIAS
    todos_produtos = []
    todas_falhas = []
    skus_globais = set()

    for nome, id_cat in cats.items():
        prods, falhas = coletar_categoria(
            nome,
            id_cat,
            limite=limite_por_categoria,
            instante_coleta=instante,
            buscar_fn=buscar_fn,
            pausa=pausa,
        )
        for p in prods:
            if p["id_produto_origem"] not in skus_globais:
                skus_globais.add(p["id_produto_origem"])
                todos_produtos.append(p)
        todas_falhas.extend(falhas)

    return todos_produtos, todas_falhas


def salvar_arquivos(
    produtos: List[dict],
    output_dir: Path,
    nome_base: str = "coleta_rissul",
) -> None:
    """Gravação atômica em JSON e CSV de saída para rotina e consumo."""
    output_dir.mkdir(parents=True, exist_ok=True)
    destinos_json = [output_dir / f"{nome_base}.json", output_dir / "produtos_coletados.json"]
    destinos_csv = [output_dir / f"{nome_base}.csv", output_dir / "produtos_coletados.csv"]

    for d_json in destinos_json:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=output_dir, delete=False) as tmp:
            json.dump(produtos, tmp, ensure_ascii=False, indent=2)
            temp_path = Path(tmp.name)
        temp_path.replace(d_json)

    for d_csv in destinos_csv:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="", dir=output_dir, delete=False) as tmp:
            writer = csv.DictWriter(tmp, fieldnames=CAMPOS)
            writer.writeheader()
            for prod in produtos:
                writer.writerow({k: prod.get(k) for k in CAMPOS})
            temp_path = Path(tmp.name)
        temp_path.replace(d_csv)

    LOGGER.info("Arquivos Rissul gravados em: %s", output_dir)


def main(argv: Optional[List[str]] = None) -> int:
    """Ponto de entrada compatível com o orquestrador rotina_carga."""
    parser = argparse.ArgumentParser(description="Coletor de dados Supermercados Rissul (SmartMarket RS)")
    parser.add_argument("--fixture", type=Path, help="Caminho para fixture JSON de teste offline")
    parser.add_argument("--limite", type=int, default=LIMITE_POR_CATEGORIA, help="Limite por categoria")
    parser.add_argument("--output-dir", type=Path, default=Path("output"), help="Diretório de saída")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if args.fixture:
        try:
            buscar_fn = carregar_fixture(args.fixture)
            pausa = 0.0
        except Exception as exc:
            LOGGER.error("Falha ao carregar fixture Rissul: %s", exc)
            return 1
    else:
        buscar_fn = buscar_pagina
        pausa = PAUSA_ENTRE_REQUISICOES

    produtos, falhas = executar_coleta(limite_por_categoria=args.limite, buscar_fn=buscar_fn, pausa=pausa)
    salvar_arquivos(produtos, args.output_dir)
    print(f"Sucesso! {len(produtos)} produtos do Rissul salvos em {args.output_dir}")
    return 0 if produtos else 1


if __name__ == "__main__":
    raise SystemExit(main())
