"""
SmartMarket - Scraper Carrefour Mercado
----------------------------------------
Coleta produtos de supermercado via extração do fluxo inicial da arquitetura
headless (React Router Stream) do e-commerce mercado.carrefour.com.br.

Saída: dois arquivos, um .json e um .csv, com os campos:
nome_bruto, preco, preco_normal, em_promocao, marca, categoria, slug,
id_produto_origem, supermercado, data_coleta.
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

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO DE CATEGORIAS
# ---------------------------------------------------------------------------
CATEGORIAS = {
    "Graos_Arrozes_Feijoes": "https://mercado.carrefour.com.br/categoria/mercearia/alimentos-basicos",
    "Leites": "https://mercado.carrefour.com.br/categoria/padaria-e-matinais/leites",
}

LIMITE_POR_CATEGORIA = 20
TAMANHO_PAGINA = 15
PAUSA_ENTRE_REQUISICOES = 1.5
MAX_PAGINAS_POR_CATEGORIA = 5

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}

CAMPOS = (
    "nome_bruto", "preco", "preco_normal", "em_promocao", "marca",
    "categoria", "slug", "id_produto_origem", "supermercado", "data_coleta",
)


class ErroColeta(Exception):
    """Falha de transporte ou resposta inválida da fonte."""


def buscar_pagina_html(url, *, headers, timeout):
    """Busca a página HTML do Carrefour Mercado."""
    try:
        import requests
        resposta = requests.get(url, headers=headers, timeout=timeout)
        resposta.raise_for_status()
        return resposta.text
    except Exception as exc:
        raise ErroColeta(type(exc).__name__) from exc


def extrair_produtos_html(html_str):
    """Extrai os objetos brutos de produtos do stream do React Router no HTML."""
    if not isinstance(html_str, str):
        raise ErroColeta("html_invalido")

    inlines = re.findall(r"<script[^>]*>(.*?)</script>", html_str, re.DOTALL)
    stream_scripts = [s for s in inlines if "streamController.enqueue" in s]
    if not stream_scripts:
        raise ErroColeta("stream_controller_nao_encontrado")

    match = re.search(r'streamController\.enqueue\("((?:[^"\\]|\\.)*)"\)', stream_scripts[0])
    if not match:
        raise ErroColeta("payload_stream_nao_localizado")

    try:
        raw_str = '"' + match.group(1) + '"'
        decoded_inner = json.loads(raw_str)
        data = json.loads(decoded_inner, parse_float=Decimal)
    except Exception as exc:
        raise ErroColeta(f"deserializacao_stream_falhou: {type(exc).__name__}") from exc

    if not isinstance(data, list):
        raise ErroColeta("grafo_stream_deve_ser_lista")

    memo = {}

    def resolve(idx, depth=0):
        if depth > 12:
            return None
        if not isinstance(idx, int) or idx < 0 or idx >= len(data):
            return idx
        if idx in memo:
            return memo[idx]
        val = data[idx]
        if isinstance(val, dict):
            res = {}
            for k, v in val.items():
                k_idx = int(k[1:]) if k.startswith("_") and k[1:].isdigit() else k
                resolved_key = resolve(k_idx, depth + 1)
                res[str(resolved_key)] = resolve(v, depth + 1)
            memo[idx] = res
            return res
        if isinstance(val, list):
            res = [resolve(x, depth + 1) for x in val]
            memo[idx] = res
            return res
        return val

    try:
        prod_key_idx = data.index("products")
    except ValueError:
        return []

    target_key = f"_{prod_key_idx}"
    prods = []
    for item in data:
        if isinstance(item, dict) and target_key in item:
            list_idx = item[target_key]
            if isinstance(list_idx, int) and 0 <= list_idx < len(data):
                raw_list = data[list_idx]
                if isinstance(raw_list, list):
                    prods = [resolve(p) for p in raw_list if isinstance(p, int)]
                    break
    return [p for p in prods if isinstance(p, dict)]


def preco_positivo(valor):
    """Valida decimal finito e positivo; mantém número JSON por compatibilidade."""
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
    if Decimal(str(numero)) != decimal:
        raise ValueError("preco_perde_precisao_na_exportacao")
    return numero


def validar_moeda(dados):
    for campo in ("currency", "moeda"):
        if campo in dados and dados[campo] != "BRL":
            raise ValueError("moeda_declarada_diferente_de_BRL")


def transformar_item(item, nome_categoria, instante):
    """Valida e transforma um item do Carrefour para o Contrato v1 do SmartMarket."""
    if not isinstance(item, dict):
        raise ValueError("item_nao_objeto")

    nome = item.get("productName")
    if not isinstance(nome, str) or not nome.strip():
        raise ValueError("nome_ausente_ou_invalido")

    validar_moeda(item)

    for campo in ("brand", "link"):
        if item.get(campo) is not None and not isinstance(item[campo], str):
            raise ValueError(campo + "_invalido")

    externo = item.get("productId")
    if externo is not None and (isinstance(externo, bool) or not isinstance(externo, (str, int))):
        raise ValueError("id_produto_origem_invalido")

    items = item.get("items")
    if not isinstance(items, list) or not items:
        raise ValueError("items_ausente_ou_invalido")

    first_item = items[0]
    if not isinstance(first_item, dict):
        raise ValueError("detalhe_item_invalido")

    sellers = first_item.get("sellers")
    if not isinstance(sellers, list) or not sellers:
        raise ValueError("sellers_ausente_ou_invalido")

    seller = sellers[0]
    if not isinstance(seller, dict):
        raise ValueError("seller_invalido")

    offer = seller.get("commertialOffer")
    if not isinstance(offer, dict):
        raise ValueError("offer_ausente_ou_invalido")

    validar_moeda(offer)

    # Identificação de preços (spotPrice ou Price para efetivo, ListPrice para de/por)
    preco_efetivo_raw = offer.get("Price")
    if preco_efetivo_raw is None:
        preco_efetivo_raw = offer.get("spotPrice")

    efetivo = preco_positivo(preco_efetivo_raw)

    list_price_raw = offer.get("ListPrice")
    normal = preco_positivo(list_price_raw) if list_price_raw is not None else None

    # Verifica se há promoção real (preço normal superior ao preço praticado)
    em_promocao = bool(normal is not None and normal > efetivo)

    if instante.tzinfo is None or instante.utcoffset() is None:
        raise ValueError("instante_sem_fuso")

    return {
        "nome_bruto": nome,
        "preco": efetivo,
        "preco_normal": normal,
        "em_promocao": em_promocao,
        "marca": item.get("brand"),
        "categoria": nome_categoria,
        "slug": item.get("link"),
        "id_produto_origem": str(externo) if externo is not None else None,
        "supermercado": "Carrefour",
        "data_coleta": instante.astimezone(timezone.utc).isoformat(timespec="seconds"),
    }


def registrar_falha(falhas, categoria, motivo, *, pagina=None, indice=None):
    falha = {"categoria": categoria, "motivo": motivo, "pagina": pagina, "indice": indice}
    falhas.append(falha)
    LOGGER.warning("falha_coleta %s", json.dumps(falha, ensure_ascii=False))


def coletar_categoria(nome_categoria: str, url_categoria: str, *,
                      buscar=None, falhas=None, dormir=time.sleep,
                      agora=None) -> list[dict]:
    """Retorna itens válidos da categoria no Carrefour."""
    buscar = buscar or buscar_pagina_html
    falhas = falhas if falhas is not None else []
    agora = agora or (lambda: datetime.now(timezone.utc))
    produtos = []

    for pagina in range(1, MAX_PAGINAS_POR_CATEGORIA + 1):
        url = f"{url_categoria}?page={pagina}"
        try:
            html = buscar(url, headers=HEADERS, timeout=10)
            itens = extrair_produtos_html(html)
        except ErroColeta as exc:
            registrar_falha(falhas, nome_categoria, str(exc), pagina=pagina)
            break

        if not itens:
            break

        instante = agora()
        for indice, raw_item in enumerate(itens):
            try:
                produtos.append(transformar_item(raw_item, nome_categoria, instante))
            except ValueError as exc:
                registrar_falha(falhas, nome_categoria, str(exc), pagina=pagina, indice=indice)

            if len(produtos) >= LIMITE_POR_CATEGORIA:
                return produtos

        if len(itens) < TAMANHO_PAGINA:
            break

        if pagina < MAX_PAGINAS_POR_CATEGORIA:
            dormir(PAUSA_ENTRE_REQUISICOES)

    return produtos


def carregar_fixture(caminho):
    """Carrega fixture local: objeto categoria -> lista de HTMLs ou páginas."""
    dados = json.loads(Path(caminho).read_text(encoding="utf-8"))
    if not isinstance(dados, dict):
        raise ValueError("fixture_deve_ser_objeto")

    def buscar(url, *, headers, timeout):
        # Localiza por chave da categoria contida na URL
        for chave in CATEGORIAS:
            if chave in url or CATEGORIAS[chave] in url:
                paginas = dados.get(chave, [])
                if not paginas:
                    raise ErroColeta("categoria_sem_paginas_na_fixture")
                # Extrai número da página ou usa primeira
                page_match = re.search(r"page=(\d+)", url)
                idx = int(page_match.group(1)) - 1 if page_match else 0
                if idx >= len(paginas):
                    raise ErroColeta("pagina_ausente_na_fixture")
                return paginas[idx]
        # Se for chave direta
        chave = url.split("?")[0].rsplit("/", 1)[-1]
        paginas = dados.get(chave, [])
        if not paginas:
            raise ErroColeta("pagina_ausente_na_fixture")
        return paginas[0]

    return buscar


def salvar_atomico(caminho, escrever):
    """Substitui cada arquivo apenas depois de sua escrita completa."""
    caminho = Path(caminho)
    temporario = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="",
                                         dir=caminho.parent, delete=False) as arquivo:
            temporario = Path(arquivo.name)
            escrever(arquivo)
        temporario.replace(caminho)
    finally:
        if temporario is not None:
            temporario.unlink(missing_ok=True)


def salvar_produtos(produtos, diretorio):
    salvar_atomico(diretorio / "produtos_coletados.json",
                   lambda f: json.dump(produtos, f, ensure_ascii=False, indent=2, allow_nan=False))

    def csv_escrever(arquivo):
        writer = csv.DictWriter(arquivo, fieldnames=CAMPOS)
        writer.writeheader()
        writer.writerows(produtos)

    salvar_atomico(diretorio / "produtos_coletados.csv", csv_escrever)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", type=Path, help="Resposta local: não acessa a rede")
    parser.add_argument("--output-dir", type=Path, default=Path("."))
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    try:
        buscar = carregar_fixture(args.fixture) if args.fixture else buscar_pagina_html
    except (OSError, ValueError) as exc:
        LOGGER.error("fixture_invalida: %s", type(exc).__name__)
        return 1

    args.output_dir.mkdir(parents=True, exist_ok=True)
    falhas, produtos = [], []
    dormir = (lambda _: None) if args.fixture else time.sleep

    for nome, url_cat in CATEGORIAS.items():
        produtos.extend(coletar_categoria(nome, url_cat, buscar=buscar,
                                          falhas=falhas, dormir=dormir))
        dormir(PAUSA_ENTRE_REQUISICOES)

    status = "falhou" if not produtos else ("parcial" if falhas else "concluido")

    if produtos:
        salvar_produtos(produtos, args.output_dir)

    relatorio = {
        "status": status,
        "aceitos": len(produtos),
        "falhas": falhas,
        "saida_atualizada": bool(produtos),
        "modo": "fixture" if args.fixture else "http",
        "supermercado": "Carrefour",
        "moeda_declarada": "BRL",
        "executado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    salvar_atomico(args.output_dir / "relatorio_coleta.json",
                   lambda f: json.dump(relatorio, f, ensure_ascii=False, indent=2))

    LOGGER.info("coleta carrefour status=%s aceitos=%s falhas=%s", status, len(produtos), len(falhas))
    return 1 if not produtos else (2 if falhas else 0)


if __name__ == "__main__":
    raise SystemExit(main())
