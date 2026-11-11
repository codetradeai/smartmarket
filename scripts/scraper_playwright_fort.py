#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartMarket - Scraper Fort Atacadista via Playwright (com Storage State & Anti-Bot).
Diretório: scripts/scraper_playwright_fort.py

Carrega automaticamente a sessão salva em `scripts/sessao_fort.json` (cookies de região,
loja Canoas/RS e localStorage), aplica evasão anti-bot para superar o Cloudflare
e intercepta respostas da API OSuper (sense.osuper.com.br / XHR) em tempo de execução.
"""

import os
import sys
import csv
import json
import time
import random
import argparse
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Any, Optional

try:
    from playwright.sync_api import sync_playwright, BrowserContext, Page, Response
except ImportError:
    print("[ERRO] Playwright não instalado. Instale com: pip install playwright && playwright install chromium")
    sys.exit(1)

# Importa o gerenciador de sessões caso precise gerar ou auditar
DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(DIRETORIO_SCRIPTS))
try:
    from gerenciador_sessoes import aplicar_evasao_antibot, gerar_sessao_regiao_injetada, CONFIGS_REDES
except ImportError:
    aplicar_evasao_antibot = None
    gerar_sessao_regiao_injetada = None

ARQUIVO_SESSAO_PADRAO = DIRETORIO_SCRIPTS / "sessao_fort.json"
URL_BASE_FORT = "https://www.deliveryfort.com.br"

CATEGORIAS_PADRAO = [
    {"nome": "Mercearia", "url": "https://www.deliveryfort.com.br/mercearia"},
    {"nome": "Bebidas", "url": "https://www.deliveryfort.com.br/bebidas"},
    {"nome": "Graos_Arrozes_Feijoes", "url": "https://www.deliveryfort.com.br/mercearia/graos-e-cereais"},
]

CAMPOS_CONTRATO_V1 = [
    "nome_bruto", "preco", "preco_normal", "em_promocao", "marca",
    "categoria", "slug", "id_produto_origem", "supermercado", "data_coleta",
    "is_clube", "clube_nome", "imagem_url"
]


def normalizar_preco(valor_raw: Any) -> Optional[float]:
    """Converte valores variados em float com 2 casas decimais no padrão BRL."""
    if valor_raw is None:
        return None
    try:
        if isinstance(valor_raw, (int, float)):
            d = Decimal(str(valor_raw))
        else:
            s = str(valor_raw).replace("R$", "").replace("\xa0", "").strip()
            if "," in s and "." in s:
                s = s.replace(".", "").replace(",", ".")
            elif "," in s:
                s = s.replace(",", ".")
            d = Decimal(s)
        if d <= 0:
            return None
        return float(d.quantize(Decimal("0.01")))
    except (InvalidOperation, ValueError):
        return None


class ScraperPlaywrightFort:
    def __init__(self, arquivo_sessao: Optional[Path] = None, headless: bool = True, timeout_ms: int = 30000):
        self.arquivo_sessao = arquivo_sessao or ARQUIVO_SESSAO_PADRAO
        self.headless = headless
        self.timeout_ms = timeout_ms
        self.produtos_capturados: Dict[str, Dict[str, Any]] = {}

    def _garantir_sessao_valida(self):
        """Garante que o arquivo de sessão existe e é um JSON válido."""
        if not self.arquivo_sessao.exists() or self.arquivo_sessao.stat().st_size < 50:
            print(f"[INFO] Sessão '{self.arquivo_sessao.name}' ausente ou vazia. Gerando sessão de região padrão (RS)...")
            if gerar_sessao_regiao_injetada:
                gerar_sessao_regiao_injetada("fort")
            else:
                raise RuntimeError("Módulo gerenciador_sessoes não disponível para gerar sessão base.")

        # Testa se é JSON válido
        try:
            with open(self.arquivo_sessao, "r", encoding="utf-8") as f:
                json.load(f)
        except Exception as e:
            print(f"[AVISO] Arquivo {self.arquivo_sessao.name} inválido ({e}). Regenerando...")
            if gerar_sessao_regiao_injetada:
                gerar_sessao_regiao_injetada("fort")

    def coletar(self, categorias: Optional[List[Dict[str, str]]] = None, limite_produtos: int = 20) -> List[Dict[str, Any]]:
        self._garantir_sessao_valida()
        cats = categorias or CATEGORIAS_PADRAO

        print(f"\n--- Iniciando Coleta Playwright Fort Atacadista (Headless: {self.headless}) ---")
        print(f"Arquivo de sessão: {self.arquivo_sessao.name}")

        with sync_playwright() as p:
            args = [
                "--disable-blink-features=AutomationControlled",
                "--disable-features=IsolateOrigins,site-per-process",
                "--no-sandbox"
            ]
            browser = p.chromium.launch(headless=self.headless, args=args)

            context = browser.new_context(
                storage_state=str(self.arquivo_sessao),
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                viewport={"width": 1366, "height": 768},
                locale="pt-BR"
            )

            page = context.new_page()
            if aplicar_evasao_antibot:
                aplicar_evasao_antibot(context, page)

            # Handler para interceptar respostas da API OSuper
            def tratar_resposta(response: Response):
                url = response.url
                # Identifica chamadas da API OSuper / Sense de busca ou categoria
                if ("sense.osuper.com.br" in url or "/api/" in url or "category" in url or "search" in url) and response.status == 200:
                    try:
                        ct = response.headers.get("content-type", "")
                        if "json" in ct:
                            data = response.json()
                            self._processar_payload_api(data)
                    except Exception:
                        pass

            page.on("response", tratar_resposta)

            for cat in cats:
                if len(self.produtos_capturados) >= limite_produtos:
                    break

                cat_nome = cat["nome"]
                cat_url = cat["url"]
                print(f"\n[Acessando Categoria] {cat_nome}: {cat_url}")

                try:
                    page.goto(cat_url, wait_until="domcontentloaded", timeout=self.timeout_ms)
                    # Pausa natural com jitter
                    time.sleep(random.uniform(2.5, 4.0))

                    # Scroll suave para disparar carregamento preguiçoso e requisições XHR
                    page.evaluate("window.scrollBy(0, 800);")
                    time.sleep(1.5)

                    # Fallback de extração via DOM caso a API interna não seja interceptada
                    self._extrair_do_dom(page, cat_nome)

                    print(f"Total de produtos acumulados até agora: {len(self.produtos_capturados)}")
                except Exception as e:
                    print(f"[ERRO] Falha ao navegar em {cat_url}: {e}")

            browser.close()

        resultado = list(self.produtos_capturados.values())[:limite_produtos]
        return resultado

    def _processar_payload_api(self, data: Any):
        """Interpreta os hits da API OSuper/Sense."""
        hits = []
        if isinstance(data, dict):
            if "hits" in data and isinstance(data["hits"], list):
                hits = data["hits"]
            elif "products" in data and isinstance(data["products"], list):
                hits = data["products"]
            elif "data" in data and isinstance(data["data"], list):
                hits = data["data"]

        for item in hits:
            if not isinstance(item, dict):
                continue

            id_origem = str(item.get("id") or item.get("productId") or item.get("sku") or "")
            nome = item.get("name") or item.get("title")
            if not nome or not id_origem:
                continue

            # Pricing OSuper
            pricing = item.get("pricing", {})
            preco_raw = pricing.get("price") or item.get("price")
            preco_promo_raw = pricing.get("promotionalPrice")
            is_promo = bool(pricing.get("promotion") or (preco_promo_raw and preco_promo_raw < preco_raw))

            preco_final = normalizar_preco(preco_promo_raw if is_promo and preco_promo_raw else preco_raw)
            preco_normal = normalizar_preco(preco_raw) if is_promo else None

            if not preco_final:
                continue

            marca = item.get("brand") or pricing.get("brand")
            slug = item.get("slug") or item.get("url")
            img_url = item.get("image") or item.get("imageUrl")
            if isinstance(img_url, list) and img_url:
                img_url = img_url[0]

            prod = {
                "nome_bruto": str(nome).strip(),
                "preco": preco_final,
                "preco_normal": preco_normal,
                "em_promocao": is_promo,
                "marca": str(marca).strip() if marca else None,
                "categoria": "Mercearia",
                "slug": slug,
                "id_produto_origem": id_origem,
                "supermercado": "Fort Atacadista",
                "data_coleta": datetime.now(timezone.utc).isoformat(),
                "is_clube": False,
                "clube_nome": None,
                "imagem_url": str(img_url) if img_url else None
            }
            self.produtos_capturados[id_origem] = prod

    def _extrair_do_dom(self, page: Page, categoria_nome: str):
        """Fallback: raspa cards de produtos diretamente do HTML se o XHR estiver em cache."""
        try:
            cards = page.query_selector_all("[data-testid='product-card'], .product-card, .card-product, article")
            for card in cards:
                try:
                    nome_el = card.query_selector("h2, h3, .product-title, .title, [class*='title'], [class*='name']")
                    preco_el = card.query_selector(".price, [class*='price'], [class*='preco'], span strong")
                    img_el = card.query_selector("img")

                    if not nome_el or not preco_el:
                        continue

                    nome_texto = nome_el.inner_text().strip()
                    preco_texto = preco_el.inner_text().strip()
                    preco_val = normalizar_preco(preco_texto)

                    if not preco_val or not nome_texto:
                        continue

                    prod_id = f"dom_fort_{abs(hash(nome_texto)) % 1000000}"
                    if prod_id in self.produtos_capturados:
                        continue

                    img_src = img_el.get_attribute("src") if img_el else None

                    self.produtos_capturados[prod_id] = {
                        "nome_bruto": nome_texto,
                        "preco": preco_val,
                        "preco_normal": None,
                        "em_promocao": False,
                        "marca": None,
                        "categoria": categoria_nome,
                        "slug": None,
                        "id_produto_origem": prod_id,
                        "supermercado": "Fort Atacadista",
                        "data_coleta": datetime.now(timezone.utc).isoformat(),
                        "is_clube": False,
                        "clube_nome": None,
                        "imagem_url": img_src
                    }
                except Exception:
                    continue
        except Exception as e:
            pass

    def salvar_saidas(self, produtos: List[Dict[str, Any]], dir_saida: Path):
        dir_saida.mkdir(parents=True, exist_ok=True)
        json_path = dir_saida / "produtos_coletados_fort.json"
        csv_path = dir_saida / "produtos_coletados_fort.csv"

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(produtos, f, indent=2, ensure_ascii=False)

        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=CAMPOS_CONTRATO_V1)
            writer.writeheader()
            for p in produtos:
                linha = {k: p.get(k) for k in CAMPOS_CONTRATO_V1}
                writer.writerow(linha)

        print(f"\n[SUCESSO] {len(produtos)} produtos exportados para:")
        print(f"  - JSON: {json_path}")
        print(f"  - CSV:  {csv_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scraper Playwright Fort Atacadista (RS)")
    parser.add_argument("--sessao", type=str, default=str(ARQUIVO_SESSAO_PADRAO), help="Caminho do arquivo sessao_fort.json")
    parser.add_argument("--limite", type=int, default=15, help="Limite máximo de produtos a coletar")
    parser.add_argument("--headed", action="store_true", help="Executa o navegador visível (não headless)")
    parser.add_argument("--saida-dir", type=str, default=str(DIRETORIO_SCRIPTS / "saida"), help="Diretório de saída")

    args = parser.parse_args()

    scraper = ScraperPlaywrightFort(
        arquivo_sessao=Path(args.sessao),
        headless=not args.headed
    )

    prods = scraper.coletar(limite_produtos=args.limite)
    scraper.salvar_saidas(prods, Path(args.saida_dir))

    if prods:
        print("\nExemplo de produtos coletados do Fort:")
        for p in prods[:5]:
            print(f"  - {p['nome_bruto']} | R$ {p['preco']:.2f} | Promo: {p['em_promocao']} (Origem: {p['id_produto_origem']})")
    else:
        print("[AVISO] Nenhum produto capturado nesta execução.")

