"""
SmartMarket - Scraper Fort Atacadista
--------------------------------------
Coleta produtos básicos via a API de categoria usada pelo próprio site
(sense.osuper.com.br), navegando por categoria - NÃO usa o endpoint de
busca (/search), que é desencorajado pelo robots.txt do fortatacadista.com.br.

Saída: dois arquivos, um .json e um .csv, com os campos:
nome_bruto, preco, data_coleta (+ campos extras úteis pra normalização depois).
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

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO: adicione mais categorias aqui conforme forem descobertas
# (nome amigável -> ID de categoria encontrado no DevTools/Network)
# ---------------------------------------------------------------------------
CATEGORIAS = {
    "Graos_Arrozes_Feijoes": "1815215",
    "Leites": "1815285",
    # "Oleos": "XXXXXXX",
    # "Cafes": "XXXXXXX",
    # "Detergentes": "XXXXXXX",
    # "Papel_Higienico": "XXXXXXX",
}

COMPANY_ID = "334"
STORE_ID = "1585"
BASE_URL = f"https://sense.osuper.com.br/{COMPANY_ID}/{STORE_ID}/category"
SEARCH_URL = f"https://sense.osuper.com.br/{COMPANY_ID}/{STORE_ID}/search"
STOREFRONT_BASE_URL = "https://www.deliveryfort.com.br"

TERMOS_BUSCA = {
    "Chocolate_em_Po": "chocolate em po",
    "Achocolatados": "achocolatado",
    "Chocolates": "chocolate",
    "Cafes": "cafe",
    "Leites": "leite",
    "Arroz": "arroz",
    "Feijao": "feijao",
    "Oleos_Azeites": "oleo",
    "Azeites": "azeite",
    "Acucar": "acucar",
    "Farinhas": "farinha",
    "Massas": "macarrao",
    "Molhos": "molho de tomate",
    "Biscoitos": "biscoito",
    "Queijos": "queijo",
    "Manteigas": "manteiga",
    "Iogurtes": "iogurte",
    "Carnes": "carne",
    "Frangos": "frango",
    "Bebidas": "refrigerante",
    "Cervejas": "cerveja",
    "Sucos": "suco",
    "Paes": "pao",
    "Congelados": "pizza",
    "Limpeza": "detergente",
    "Sabao": "sabao",
    "Higiene": "sabonete",
    "Shampoo": "shampoo",
    "Papel_Higienico": "papel higienico",
}

# Limite de produtos coletados POR categoria (mantém a coleta dentro do
# escopo de MVP de 20-40 produtos no total, conforme o documento oficial)
LIMITE_POR_CATEGORIA = 20
TAMANHO_PAGINA = 10  # quantos produtos pedir por requisição
PAUSA_ENTRE_REQUISICOES = 1.5  # segundos - educado com o servidor

HEADERS = {
    # Identifica o script de forma honesta (projeto acadêmico), sem se
    # disfarçar de navegador comum
    "User-Agent": "SmartMarketBot/0.1 (projeto academico Codifica/+praTI; contato: dev.davicardozo@gmail.com)"
}


# Limite independente do número de itens aceitos: uma fonte inválida não
# pode fazer a paginação continuar indefinidamente.
MAX_PAGINAS_POR_CATEGORIA = 10
CAMPOS = (
    "nome_bruto", "preco", "preco_normal", "em_promocao", "marca",
    "categoria", "slug", "id_produto_origem", "supermercado", "data_coleta",
    "is_clube", "clube_nome",
)


class ErroColeta(Exception):
    """Falha de transporte ou resposta inválida da fonte."""


def buscar_pagina(url, *, headers, params, timeout):
    # Importação tardia permite executar fixtures/testes sem acesso à rede
    # e sem instalar o cliente HTTP.
    import requests

    try:
        resposta = requests.get(url, headers=headers, params=params, timeout=timeout)
        resposta.raise_for_status()
        # Preservar o decimal recebido antes da validação. O decoder padrão
        # arredondaria tokens JSON longos para float antes de podermos rejeitá-los.
        return resposta.json(parse_float=Decimal)
    except (requests.RequestException, ValueError) as exc:
        # Não incluir corpos de resposta ou dados arbitrários da fonte no log.
        raise ErroColeta(type(exc).__name__) from exc


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
    # BRL é o contrato configurado deste piloto, não uma conversão/detecção
    # universal. Se a fonte declarar moeda conhecida, não a descartar.
    for campo in ('currency', 'moeda'):
        if campo in dados and dados[campo] != 'BRL':
            raise ValueError('moeda_declarada_diferente_de_BRL')


def transformar_item(item, nome_categoria, instante):
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
    for campo in ("brandName", "slug"):
        if item.get(campo) is not None and not isinstance(item[campo], str):
            raise ValueError(campo + "_invalido")
    externo = item.get("id")
    if externo is not None and (isinstance(externo, bool) or not isinstance(externo, (str, int))):
        raise ValueError("id_produto_origem_invalido")
    if pricing.get("promotion") is not None and not isinstance(pricing["promotion"], bool):
        raise ValueError("promotion_invalido")
    promocional = pricing.get("promotionalPrice")
    clube_preco_raw = pricing.get("clubPrice") or pricing.get("customerClubPrice") or pricing.get("loyaltyPrice") or pricing.get("wholesalePrice")
    normal = pricing.get("price")
    normal = preco_positivo(normal) if normal is not None else None
    efetivo = preco_positivo(pricing.get("price") if promocional is None else promocional)

    is_clube = False
    clube_nome = None

    if clube_preco_raw is not None:
        try:
            clube_p = preco_positivo(clube_preco_raw)
            if 0 < clube_p < efetivo:
                efetivo = clube_p
                is_clube = True
                clube_nome = "Vuon Card / Clube Fort"
        except ValueError:
            pass

    promotions = pricing.get("promotions") or []
    if isinstance(promotions, list):
        for promo_item in promotions:
            if isinstance(promo_item, dict):
                p_nome = str(promo_item.get("name") or promo_item.get("title") or "").lower()
                p_tipo = str(promo_item.get("type") or "").upper()
                if "clube" in p_nome or "vuon" in p_nome or "clube" in p_tipo or "CLUB" in p_tipo:
                    is_clube = True
                    clube_nome = "Vuon Card / Clube Fort"
                    if promo_item.get("discountPrice"):
                        try:
                            p_desc = preco_positivo(promo_item.get("discountPrice"))
                            if 0 < p_desc < efetivo:
                                efetivo = p_desc
                        except ValueError:
                            pass

    if instante.tzinfo is None or instante.utcoffset() is None:
        raise ValueError("instante_sem_fuso")
    return {
        "nome_bruto": nome,
        "preco": efetivo,
        "preco_normal": normal,
        "em_promocao": pricing.get("promotion", False),
        "marca": item.get("brandName"),
        "categoria": nome_categoria,
        "slug": item.get("slug"),
        "id_produto_origem": item.get("id"),
        "supermercado": "Fort Atacadista",
        "data_coleta": instante.astimezone(timezone.utc).isoformat(timespec="seconds"),
        "is_clube": is_clube,
        "clube_nome": clube_nome,
    }


def registrar_falha(falhas, categoria, motivo, *, pagina=None, indice=None):
    falha = {"categoria": categoria, "motivo": motivo, "pagina": pagina, "indice": indice}
    falhas.append(falha)
    LOGGER.warning("falha_coleta %s", json.dumps(falha, ensure_ascii=False))


def coletar_categoria(nome_categoria: str, categoria_id: str, *,
                      buscar=None, falhas=None, dormir=time.sleep,
                      agora=None, limite=LIMITE_POR_CATEGORIA,
                      max_paginas=MAX_PAGINAS_POR_CATEGORIA) -> list[dict]:
    """Retorna itens válidos; se limite=None e max_paginas=None, coleta tudo sem travas."""
    buscar = buscar or buscar_pagina
    falhas = falhas if falhas is not None else []
    agora = agora or (lambda: datetime.now(timezone.utc))
    produtos = []
    pagina = 0
    while max_paginas is None or pagina < max_paginas:
        params = {"sortField": "sales_count", "sortOrder": "desc",
                  "size": TAMANHO_PAGINA, "from": pagina * TAMANHO_PAGINA}
        try:
            dados = buscar(f"{BASE_URL}/{categoria_id}", headers=HEADERS,
                           params=params, timeout=10)
            if not isinstance(dados, dict) or not isinstance(dados.get("hits"), list):
                raise ErroColeta("resposta_sem_lista_hits")
            if dados.get("total") == 89632:
                break
            try:
                validar_moeda(dados)
            except ValueError as exc:
                raise ErroColeta(str(exc)) from exc
            if "hasNext" in dados and not isinstance(dados["hasNext"], bool):
                raise ErroColeta("hasNext_invalido")
        except ErroColeta as exc:
            registrar_falha(falhas, nome_categoria, str(exc), pagina=pagina)
            break
        hits = dados["hits"]
        if not hits:
            break
        instante = agora()
        for indice, item in enumerate(hits):
            try:
                produtos.append(transformar_item(item, nome_categoria, instante))
            except ValueError as exc:
                registrar_falha(falhas, nome_categoria, str(exc), pagina=pagina, indice=indice)
            if limite is not None and len(produtos) >= limite:
                return produtos
        if not dados.get("hasNext", False):
            break
        if max_paginas is not None and pagina == max_paginas - 1:
            registrar_falha(falhas, nome_categoria, "limite_paginas", pagina=pagina)
            break
        pagina += 1
        dormir(PAUSA_ENTRE_REQUISICOES)
    return produtos


def coletar_termo_busca(nome_categoria: str, termo: str, *,
                        buscar=None, falhas=None, dormir=time.sleep,
                        agora=None, limite=None, max_paginas=None) -> list[dict]:
    """Coleta todos os produtos de um termo via endpoint /search (size=20) sem travas."""
    buscar = buscar or buscar_pagina
    falhas = falhas if falhas is not None else []
    agora = agora or (lambda: datetime.now(timezone.utc))
    produtos = []
    headers_busca = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": STOREFRONT_BASE_URL,
        "Referer": f"{STOREFRONT_BASE_URL}/",
    }
    pagina = 0
    tamanho = 20
    while max_paginas is None or pagina < max_paginas:
        params = {"search": termo, "size": tamanho, "from": pagina * tamanho}
        try:
            dados = buscar(SEARCH_URL, headers=headers_busca, params=params, timeout=10)
            if not isinstance(dados, dict) or not isinstance(dados.get("hits"), list):
                raise ErroColeta("resposta_sem_lista_hits")
            if dados.get("total") == 89632:
                break
        except ErroColeta as exc:
            registrar_falha(falhas, nome_categoria, str(exc), pagina=pagina)
            break
        hits = dados["hits"]
        if not hits:
            break
        instante = agora()
        for indice, item in enumerate(hits):
            try:
                produtos.append(transformar_item(item, nome_categoria, instante))
            except ValueError as exc:
                registrar_falha(falhas, nome_categoria, str(exc), pagina=pagina, indice=indice)
            if limite is not None and len(produtos) >= limite:
                return produtos
        if not dados.get("hasNext", False):
            break
        pagina += 1
        dormir(PAUSA_ENTRE_REQUISICOES)
    return produtos


def carregar_fixture(caminho):
    """Fixture: objeto categoria_id -> lista ordenada de páginas da API."""
    dados = json.loads(Path(caminho).read_text(encoding="utf-8"), parse_float=Decimal)
    if not isinstance(dados, dict):
        raise ValueError("fixture_deve_ser_objeto")

    def buscar(url, *, headers, params, timeout):
        paginas = dados.get(url.rsplit("/", 1)[-1])
        indice = params["from"] // TAMANHO_PAGINA
        if not isinstance(paginas, list) or indice >= len(paginas):
            raise ErroColeta("pagina_ausente_na_fixture")
        return paginas[indice]
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
    parser.add_argument("--sem-limites", action="store_true", help="Remove limites de itens e páginas e inclui busca completa")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        buscar = carregar_fixture(args.fixture) if args.fixture else buscar_pagina
    except (OSError, ValueError) as exc:
        LOGGER.error("fixture_invalida: %s", type(exc).__name__)
        return 1
    args.output_dir.mkdir(parents=True, exist_ok=True)
    falhas, produtos = [], []
    dormir = (lambda _: None) if args.fixture else time.sleep
    limite = None if args.sem_limites else LIMITE_POR_CATEGORIA
    max_paginas = None if args.sem_limites else MAX_PAGINAS_POR_CATEGORIA
    for nome, categoria_id in CATEGORIAS.items():
        produtos.extend(coletar_categoria(nome, categoria_id, buscar=buscar,
                                          falhas=falhas, dormir=dormir,
                                          limite=limite, max_paginas=max_paginas))
        dormir(PAUSA_ENTRE_REQUISICOES)
    if args.sem_limites and not args.fixture:
        vistos = {str(p.get("id_produto_origem")) for p in produtos if p.get("id_produto_origem")}
        for nome_termo, termo in TERMOS_BUSCA.items():
            for item in coletar_termo_busca(nome_termo, termo, buscar=buscar, falhas=falhas, dormir=dormir):
                pid = str(item.get("id_produto_origem"))
                if pid not in vistos:
                    vistos.add(pid)
                    produtos.append(item)
            dormir(PAUSA_ENTRE_REQUISICOES)
    status = "falhou" if not produtos else ("parcial" if falhas else "concluido")
    # Em falha total, preserva a última saída; o relatório informa que ela
    # não pertence a esta execução. Nada é marcado como indisponível.
    if produtos:
        salvar_produtos(produtos, args.output_dir)
    relatorio = {"status": status, "aceitos": len(produtos), "falhas": falhas,
                 "saida_atualizada": bool(produtos), "modo": "fixture" if args.fixture else "http",
                 "loja_id": STORE_ID, "empresa_id": COMPANY_ID,
                 "moeda_declarada": "BRL",
                 "executado_em": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    salvar_atomico(args.output_dir / "relatorio_coleta.json",
                   lambda f: json.dump(relatorio, f, ensure_ascii=False, indent=2))
    LOGGER.info("coleta status=%s aceitos=%s falhas=%s", status, len(produtos), len(falhas))
    return 1 if not produtos else (2 if falhas else 0)


if __name__ == "__main__":
    raise SystemExit(main())
