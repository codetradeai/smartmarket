"""
SmartMarket - Scraper Asun Supermercados Online (RS)
-----------------------------------------------------
Coleta produtos básicos da rede Asun Supermercados (Rio Grande do Sul)
utilizando a API Sense/OSuper oficial do e-commerce (sense.osuper.com.br),
configurado para a filial de Cachoeirinha/Grande Porto Alegre (Store ID 1560, CEP 94910-000).

Extrai com fidelidade:
- Nome completo e padronizado
- Preço à vista e promocional
- Descrição rica/especificações
- URL da imagem em alta resolução
- Marca, Categoria, SKU/ID externo e URL direta do produto

Saída: dois arquivos (.json e .csv) prontos para normalização e carga no banco de dados.
"""

import argparse
import csv
import json
import logging
import math
import tempfile
import time
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Dict, List, Optional

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO DE CATEGORIAS E LOJA ASUN (RS)
# ---------------------------------------------------------------------------
# Filial 1560: Cachoeirinha / Região Metropolitana de Porto Alegre (CEP: 94910-000)
COMPANY_ID = "319"
STORE_ID = "1560"
BASE_URL = f"https://sense.osuper.com.br/{COMPANY_ID}/{STORE_ID}/category"
STOREFRONT_BASE_URL = "https://www.asunonline.com.br"

CATEGORIAS = {
    "Cafes_Matinais": "1937090",       # Matinais e Sobremesas > Cafés
    "Frios_Laticinios": "1936826",     # Frios e Laticínios > Iogurtes e Bebidas Lácteas
    "Carnes_Acougue": "1936108",       # Açougue
    "Hortifruti": "1936221",           # Hortifruti
    "Biscoitos": "1937107",            # Biscoitos e Chocolates
}

LIMITE_POR_CATEGORIA = 20
TAMANHO_PAGINA = 10
PAUSA_ENTRE_REQUISICOES = 1.5
MAX_PAGINAS_POR_CATEGORIA = 10

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (SmartMarket RS Scraper Bot)",
    "Origin": STOREFRONT_BASE_URL,
    "Referer": f"{STOREFRONT_BASE_URL}/",
    "Accept": "application/json, text/plain, */*",
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


def buscar_pagina(url: str, *, headers: dict, params: dict, timeout: int = 10) -> dict:
    """Realiza requisição HTTP à API e decodifica JSON com precisão Decimal."""
    import requests

    try:
        resposta = requests.get(url, headers=headers, params=params, timeout=timeout)
        resposta.raise_for_status()
        return resposta.json(parse_float=Decimal)
    except (requests.RequestException, ValueError) as exc:
        raise ErroColeta(type(exc).__name__) from exc


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


def validar_moeda(dados: dict) -> None:
    """Garante integridade da moeda nacional BRL."""
    for campo in ("currency", "moeda"):
        if campo in dados and dados[campo] != "BRL":
            raise ValueError("moeda_declarada_diferente_de_BRL")


def obter_url_imagem_alta_resolucao(item: dict) -> Optional[str]:
    """Extrai a URL da imagem com melhor resolução possível."""
    imagem_raw = item.get("image")
    if not imagem_raw or not isinstance(imagem_raw, str):
        return None

    # Se a URL for do Thumbor OSuper edge (ex: fit-in/400x400/...),
    # podemos solicitar resolução ampliada (800x800) mantendo a assinatura válida
    # ou retornar a URL limpa fornecida pela CDN
    return imagem_raw.strip()


def transformar_item(item: dict, nome_categoria: str, instante: datetime) -> dict:
    """Converte e valida um item da API Asun para o contrato oficial do SmartMarket."""
    if not isinstance(item, dict):
        raise ValueError("item_nao_objeto")

    nome = item.get("name")
    if not isinstance(nome, str) or not nome.strip():
        raise ValueError("nome_ausente_ou_invalido")

    pricing = item.get("pricing")
    if not isinstance(pricing, dict):
        raise ValueError("pricing_ausente_ou_invalido")

    validar_moeda(item)
    validar_moeda(pricing)

    externo = item.get("id")
    if externo is not None and (isinstance(externo, bool) or not isinstance(externo, (str, int))):
        raise ValueError("id_produto_origem_invalido")

    promocional = pricing.get("promotionalPrice")
    preco_efetivo = preco_positivo(pricing.get("price") if promocional is None else promocional)
    normal = pricing.get("price")
    preco_normal = preco_positivo(normal) if normal is not None else None

    if instante.tzinfo is None or instante.utcoffset() is None:
        raise ValueError("instante_sem_fuso")

    slug = item.get("slug") or ""
    url_produto = f"{STOREFRONT_BASE_URL}/produto/{slug}" if slug else None

    # Descrição completa (evita apenas repetir o nome se houver detalhes)
    descricao = item.get("description") or ""
    if isinstance(descricao, str):
        descricao = descricao.strip()
    else:
        descricao = ""

    return {
        "nome_bruto": nome.strip(),
        "preco": preco_efetivo,
        "preco_normal": preco_normal,
        "em_promocao": bool(pricing.get("promotion", False)),
        "marca": item.get("brandName") if isinstance(item.get("brandName"), str) else None,
        "categoria": nome_categoria,
        "slug": slug if slug else None,
        "id_produto_origem": str(externo) if externo is not None else None,
        "supermercado": "Asun Supermercados",
        "data_coleta": instante.astimezone(timezone.utc).isoformat(timespec="seconds"),
        "imagem_url": obter_url_imagem_alta_resolucao(item),
        "descricao": descricao if descricao and descricao != nome.strip() else None,
        "url_produto": url_produto,
    }


def coletar_categoria(
    nome_categoria: str,
    categoria_id: str,
    *,
    buscar=None,
    falhas: Optional[list] = None,
    dormir=time.sleep,
    agora=None,
    limite: int = LIMITE_POR_CATEGORIA,
) -> List[dict]:
    """Coleta produtos paginados de uma categoria no Asun Online."""
    buscar = buscar or buscar_pagina
    falhas = falhas if falhas is not None else []
    agora = agora or (lambda: datetime.now(timezone.utc))
    produtos = []

    for pagina in range(MAX_PAGINAS_POR_CATEGORIA):
        params = {
            "sortField": "sales_count",
            "sortOrder": "desc",
            "size": min(TAMANHO_PAGINA, limite - len(produtos)),
            "from": pagina * TAMANHO_PAGINA,
        }
        try:
            url_chamada = f"{BASE_URL}/{categoria_id}"
            dados = buscar(url_chamada, headers=HEADERS, params=params, timeout=10)
            if not isinstance(dados, dict) or not isinstance(dados.get("hits"), list):
                raise ErroColeta("resposta_sem_lista_hits")

            validar_moeda(dados)
            hits = dados["hits"]
            if not hits:
                break

            instante_requisicao = agora()
            for indice, item in enumerate(hits):
                try:
                    produtos.append(transformar_item(item, nome_categoria, instante_requisicao))
                    if len(produtos) >= limite:
                        return produtos
                except ValueError as exc:
                    falhas.append({"categoria": nome_categoria, "motivo": str(exc), "pagina": pagina, "indice": indice})

            if len(hits) < TAMANHO_PAGINA:
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
    """Executa a coleta para o conjunto configurado de categorias."""
    categorias = categorias or CATEGORIAS
    todos_produtos = []
    todas_falhas = []

    for nome_cat, id_cat in categorias.items():
        LOGGER.info("Iniciando coleta Asun: %s (ID: %s)", nome_cat, id_cat)
        itens = coletar_categoria(
            nome_cat,
            id_cat,
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
    parser = argparse.ArgumentParser(description="Coletor de dados Asun Online (SmartMarket RS)")
    parser.add_argument("--formato", choices=["json", "csv", "ambos"], default="ambos")
    parser.add_argument("--saida", default=str(Path(__file__).parent / "output" / "coleta_asun"))
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
