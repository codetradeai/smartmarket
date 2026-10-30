"""
SmartMarket - Scraper Stok Center / Comercial Zaffari (RS)
----------------------------------------------------------
Coleta produtos de atacarejo da rede Stok Center (Rio Grande do Sul)
utilizando a API oficial VipCommerce (services.vipcommerce.com.br/api-admin/v1)
do e-commerce stokonline.com.br.

Extrai com fidelidade:
- Nome completo e padronizado
- Preço à vista e preço promocional (em oferta)
- Descrição detalhada do produto
- URL da imagem em alta resolução nativa (CDN Magalu Objects 1000x1000)
- Marca, Categoria, SKU/Código de barras (EAN), ID externo e URL direta do produto

Saída: dois arquivos (.json e .csv) prontos para normalização e carga no banco de dados.
"""

import argparse
import csv
import json
import logging
import math
import tempfile
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Dict, List, Optional
import urllib.parse

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO DE CONSTANTES E ENDPOINTS VIPCOMMERCE STOK CENTER
# ---------------------------------------------------------------------------
BASE_URL = "https://services.vipcommerce.com.br/api-admin/v1"
DOMAIN = "stokonline.com.br"
STOREFRONT_BASE_URL = "https://stokonline.com.br"
ORG_ID = "130"
FILIAL_ID = "1"
CENTRO_DISTRIBUICAO_ID = "1"
AUTH_KEY = "df072f85df9bf7dd71b6811c34bdbaa4f219d98775b56cff9dfa5f8ca1bf8469"
IMG_CDN_BASE = "https://produto-assets-vipcommerce-com-br.br-se1.magaluobjects.com/1000x1000"

CATEGORIAS = {
    "Arroz": "arroz",
    "Feijao": "feijao",
    "Leite": "leite",
    "Cafe": "cafe",
    "Acucar": "acucar",
    "Oleo": "oleo",
    "Farinha": "farinha",
    "Massa": "massa",
    "Cerveja": "cerveja",
    "Refrigerante": "refrigerante",
    "Sabao": "sabao",
    "Carne": "carne",
}

LIMITE_POR_CATEGORIA = 20
TAMANHO_PAGINA = 20
PAUSA_ENTRE_REQUISICOES = 1.0
MAX_PAGINAS_POR_CATEGORIA = 5

HEADERS_BASE = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (SmartMarket RS Bot)",
    "Accept": "application/json, text/plain, */*",
    "Origin": STOREFRONT_BASE_URL,
    "Referer": f"{STOREFRONT_BASE_URL}/",
    "DomainKey": DOMAIN,
    "OrganizationId": ORG_ID,
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
    """Falha de transporte, autenticação ou resposta inválida da fonte."""


_TOKEN_CACHE: Optional[str] = None


def obter_token_autenticacao(
    *,
    base_url: str = BASE_URL,
    org_id: str = ORG_ID,
    domain: str = DOMAIN,
    key: str = AUTH_KEY,
    forcar_renovacao: bool = False,
    timeout: int = 15,
) -> str:
    """Obtém ou reutiliza token JWT de autenticação pública da loja VipCommerce."""
    global _TOKEN_CACHE
    if _TOKEN_CACHE and not forcar_renovacao:
        return _TOKEN_CACHE

    import requests

    login_url = f"{base_url}/org/{org_id}/auth/loja/login"
    payload = {
        "domain": domain,
        "username": "loja",
        "key": key,
    }
    headers = {
        **HEADERS_BASE,
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(login_url, json=payload, headers=headers, timeout=timeout)
        resp.raise_for_status()
        dados = resp.json()
        token = dados.get("data")
        if not token or not isinstance(token, str):
            raise ErroColeta(f"token_invalido_na_resposta: {dados}")
        _TOKEN_CACHE = token
        return token
    except (requests.RequestException, ValueError) as exc:
        raise ErroColeta(f"falha_ao_autenticar_stok: {exc}") from exc


def buscar_pagina_termo(
    termo: str,
    pagina: int = 1,
    *,
    token: Optional[str] = None,
    timeout: int = 15,
) -> dict:
    """Busca produtos por termo usando a API VipCommerce Stok Center."""
    import requests

    if not token:
        token = obter_token_autenticacao(timeout=timeout)

    headers = {
        **HEADERS_BASE,
        "Authorization": f"Bearer {token}",
    }
    session_id = str(uuid.uuid4())
    url = (
        f"{BASE_URL}/org/{ORG_ID}/filial/{FILIAL_ID}/centro_distribuicao/"
        f"{CENTRO_DISTRIBUICAO_ID}/loja/buscas/produtos/termo/{urllib.parse.quote(termo)}"
    )
    params = {
        "page": pagina,
        "session": session_id,
    }

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=timeout)
        if resp.status_code == 401:
            token = obter_token_autenticacao(forcar_renovacao=True, timeout=timeout)
            headers["Authorization"] = f"Bearer {token}"
            resp = requests.get(url, headers=headers, params=params, timeout=timeout)
        resp.raise_for_status()
        return resp.json(parse_float=Decimal)
    except (requests.RequestException, ValueError) as exc:
        raise ErroColeta(type(exc).__name__) from exc


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


def extrair_imagem_hd(imagem_id: Optional[str]) -> Optional[str]:
    """Monta URL de imagem em alta definição (1000x1000) a partir do ID/hash."""
    if not imagem_id or not isinstance(imagem_id, str):
        return None
    limpo = imagem_id.strip()
    if not limpo:
        return None
    if limpo.startswith("http://") or limpo.startswith("https://"):
        return limpo
    return f"{IMG_CDN_BASE}/{limpo}"


def carregar_fixture(caminho: Path):
    """Carrega dados estáticos de fixture para testes offline."""
    with open(caminho, "r", encoding="utf-8") as f:
        dados = json.load(f)

    def buscar_fixture(termo: str, pagina: int = 1):
        if termo in dados:
            return dados[termo]
        return {"data": {"produtos": []}}

    return buscar_fixture


def processar_item(
    item: Dict[str, Any],
    categoria: str,
    data_coleta: str,
) -> Optional[Dict[str, Any]]:
    """Processa e valida um item retornado da API VipCommerce Stok Center."""
    if not isinstance(item, dict):
        return None

    if item.get("disponivel") is False:
        return None

    nome = item.get("descricao") or item.get("nome")
    if not nome or not str(nome).strip():
        return None
    nome = str(nome).strip()

    preco_bruto = item.get("preco")
    try:
        preco_normal = preco_positivo(preco_bruto)
    except ValueError:
        return None

    em_oferta = bool(item.get("em_oferta"))
    oferta = item.get("oferta") if isinstance(item.get("oferta"), dict) else None
    preco_final = preco_normal

    # Captura ofertas de Clube Stok e promoções ativas
    if oferta:
        preco_antigo_raw = oferta.get("preco_antigo")
        if preco_antigo_raw:
            try:
                p_antigo = preco_positivo(preco_antigo_raw)
                if p_antigo >= preco_normal:
                    preco_normal = p_antigo
            except ValueError:
                pass

        candidatos_oferta = [oferta.get("preco_oferta"), oferta.get("menor_preco")]
        for cand in candidatos_oferta:
            if cand is not None:
                try:
                    p_of = preco_positivo(cand)
                    if 0 < p_of < preco_final:
                        preco_final = p_of
                        em_oferta = True
                except ValueError:
                    pass

    # Fallback para preco_promocional direto na raiz
    preco_promo_raiz = item.get("preco_promocional")
    if preco_promo_raiz:
        try:
            p_pr = preco_positivo(preco_promo_raiz)
            if 0 < p_pr < preco_final:
                preco_final = p_pr
                em_oferta = True
        except ValueError:
            pass

    slug = item.get("link") or ""
    produto_id = item.get("produto_id") or item.get("id") or item.get("codigo_barras")
    if not produto_id:
        return None

    marca = item.get("marca")
    if isinstance(marca, dict):
        marca = marca.get("nome")
    marca = str(marca).strip() if marca else None

    imagem_url = extrair_imagem_hd(item.get("imagem"))
    url_produto = f"{STOREFRONT_BASE_URL}/produtos/{slug}" if slug else STOREFRONT_BASE_URL

    return {
        "nome_bruto": nome,
        "preco": round(preco_final, 2),
        "preco_normal": round(preco_normal, 2),
        "em_promocao": em_oferta,
        "marca": marca,
        "categoria": categoria,
        "slug": str(slug),
        "id_produto_origem": str(produto_id),
        "supermercado": "Stok Center",
        "data_coleta": data_coleta,
        "imagem_url": imagem_url,
        "descricao": nome,
        "url_produto": url_produto,
    }


def coletar_categoria(
    categoria_nome: str,
    termo_busca: str,
    limite: int,
    data_coleta: str,
    *,
    buscar_fn=buscar_pagina_termo,
    pausa: float = PAUSA_ENTRE_REQUISICOES,
    max_paginas: int = MAX_PAGINAS_POR_CATEGORIA,
) -> List[Dict[str, Any]]:
    """Coleta produtos para uma categoria/termo no Stok Center."""
    produtos: List[Dict[str, Any]] = []
    ids_vistos = set()
    pagina = 1

    while len(produtos) < limite and pagina <= max_paginas:
        try:
            resposta = buscar_fn(termo_busca, pagina=pagina)
        except ErroColeta:
            break

        dados = resposta.get("data")
        if isinstance(dados, dict):
            itens = dados.get("produtos", [])
        elif isinstance(dados, list):
            itens = dados
        else:
            itens = []

        if not itens:
            break

        novos = 0
        for item in itens:
            prod = processar_item(item, categoria_nome, data_coleta)
            if not prod:
                continue
            if prod["id_produto_origem"] in ids_vistos:
                continue
            ids_vistos.add(prod["id_produto_origem"])
            produtos.append(prod)
            novos += 1
            if len(produtos) >= limite:
                break

        if novos == 0 or len(itens) < TAMANHO_PAGINA:
            break

        pagina += 1
        if pausa > 0 and len(produtos) < limite:
            time.sleep(pausa)

    return produtos


def executar(
    categorias: Optional[Dict[str, str]] = None,
    limite_por_categoria: int = LIMITE_POR_CATEGORIA,
    *,
    buscar_fn=buscar_pagina_termo,
    pausa: float = PAUSA_ENTRE_REQUISICOES,
    data_coleta: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Executa a rotina completa de coleta do Stok Center."""
    cats = categorias or CATEGORIAS
    data_iso = data_coleta or datetime.now(timezone.utc).isoformat()
    todos = []
    ids_globais = set()

    for cat_nome, termo in cats.items():
        prods = coletar_categoria(
            cat_nome,
            termo,
            limite_por_categoria,
            data_iso,
            buscar_fn=buscar_fn,
            pausa=pausa,
        )
        for p in prods:
            if p["id_produto_origem"] not in ids_globais:
                ids_globais.add(p["id_produto_origem"])
                todos.append(p)

    return todos


def salvar_arquivos(
    produtos: List[Dict[str, Any]],
    output_dir: Path,
    nome_base: str = "coleta_stok",
) -> None:
    """Gravação atômica em JSON e CSV de saída para rotina e consumo."""
    output_dir.mkdir(parents=True, exist_ok=True)
    destinos_json = [output_dir / f"{nome_base}.json", output_dir / "produtos_coletados.json"]
    destinos_csv = [output_dir / f"{nome_base}.csv", output_dir / "produtos_coletados.csv"]

    for d_json in destinos_json:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=output_dir, delete=False) as f:
            json.dump(produtos, f, ensure_ascii=False, indent=2)
            temp = Path(f.name)
        temp.replace(d_json)

    for d_csv in destinos_csv:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="", dir=output_dir, delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=CAMPOS)
            writer.writeheader()
            writer.writerows(produtos)
            temp = Path(f.name)
        temp.replace(d_csv)

    LOGGER.info("Arquivos Stok Center gerados em '%s'", output_dir)


def main(argv: Optional[List[str]] = None) -> int:
    """Ponto de entrada via linha de comando compatível com o orquestrador."""
    parser = argparse.ArgumentParser(description="Scraper Stok Center / Comercial Zaffari RS")
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
            LOGGER.error("Falha ao carregar fixture Stok Center: %s", exc)
            return 1
    else:
        buscar_fn = buscar_pagina_termo
        pausa = PAUSA_ENTRE_REQUISICOES

    produtos = executar(limite_por_categoria=args.limite, buscar_fn=buscar_fn, pausa=pausa)
    salvar_arquivos(produtos, args.output_dir)
    print(f"Sucesso! {len(produtos)} produtos do Stok Center salvos em {args.output_dir}")
    return 0 if produtos else 1


if __name__ == "__main__":
    raise SystemExit(main())
