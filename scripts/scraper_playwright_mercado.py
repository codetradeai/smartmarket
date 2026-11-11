#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartMarket - Scraper Carrefour Mercado / VTEX via Playwright (com Storage State & Anti-Bot).
Diretório: scripts/scraper_playwright_mercado.py

Carrega automaticamente a sessão salva em `scripts/sessao_mercado.json` (cookies de região,
vtex_segment, CEP de Cachoeirinha/RS 94910-000 e localStorage), aplica evasão anti-bot
e extrai produtos e preços reais da vitrine sem necessidade de login.
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

DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(DIRETORIO_SCRIPTS))
try:
    from gerenciador_sessoes import aplicar_evasao_antibot, gerar_sessao_regiao_injetada
except ImportError:
    aplicar_evasao_antibot = None
    gerar_sessao_regiao_injetada = None

ARQUIVO_SESSAO_PADRAO = DIRETORIO_SCRIPTS / "sessao_mercado.json"
CEP_PADRAO = "94910000"

CATEGORIAS_PADRAO = [
    {"nome": "Graos_Arrozes_Feijoes", "url": "https://mercado.carrefour.com.br/alimentos-basicos"},
    {"nome": "Leites", "url": "https://mercado.carrefour.com.br/leites-e-iogurtes"},
]

CAMPOS_CONTRATO_V1 = [
    "nome_bruto", "preco", "preco_normal", "em_promocao", "marca",
    "categoria", "slug", "id_produto_origem", "supermercado", "data_coleta",
    "is_clube", "clube_nome", "imagem_url"
]


def normalizar_preco(valor_raw: Any) -> Optional[float]:
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


class ScraperPlaywrightMercado:
    def __init__(self, arquivo_sessao: Optional[Path] = None, headless: bool = True, timeout_ms: int = 35000):
        self.arquivo_sessao = arquivo_sessao or ARQUIVO_SESSAO_PADRAO
        self.headless = headless
        self.timeout_ms = timeout_ms
        self.produtos_capturados: Dict[str, Dict[str, Any]] = {}

    def _garantir_sessao_valida(self):
        if not self.arquivo_sessao.exists() or self.arquivo_sessao.stat().st_size < 50:
            print(f"[INFO] Sessão '{self.arquivo_sessao.name}' ausente. Gerando sessão de região padrão (RS)...")
            if gerar_sessao_regiao_injetada:
                gerar_sessao_regiao_injetada("mercado")
            else:
                raise RuntimeError("Módulo gerenciador_sessoes não disponível.")

    def coletar(self, categorias: Optional[List[Dict[str, str]]] = None, limite_produtos: int = 20) -> List[Dict[str, Any]]:
        self._garantir_sessao_valida()
        cats = categorias or CATEGORIAS_PADRAO

        print(f"\n--- Iniciando Coleta Playwright Carrefour Mercado / RS (Headless: {self.headless}) ---")
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

            # 1. Acesso à Home para aquecer sessão e garantir bypass anti-bot
            print("[Passo 1] Acessando Home Carrefour para estabelecer sessão...")
            try:
                page.goto("https://mercado.carrefour.com.br/", wait_until="domcontentloaded", timeout=self.timeout_ms)
                time.sleep(2)
                # Garante LocalStorage de CEP Cachoeirinha
                page.evaluate(f"""
                    localStorage.setItem('postalCode', '{CEP_PADRAO}');
                    localStorage.setItem('shipping_cep', '{CEP_PADRAO}');
                    localStorage.setItem('selected_region', 'RS_CACHOEIRINHA');
                """)
            except Exception as e:
                print(f"[Aviso Home]: {e}")

            # 2. Navegação nas Categorias
            for cat in cats:
                if len(self.produtos_capturados) >= limite_produtos:
                    break

                cat_nome = cat["nome"]
                cat_url = cat["url"]
                print(f"\n[Acessando Categoria] {cat_nome}: {cat_url}")

                try:
                    page.goto(cat_url, wait_until="domcontentloaded", timeout=self.timeout_ms)
                    time.sleep(random.uniform(3.0, 4.5))

                    page.evaluate("window.scrollBy(0, 800);")
                    time.sleep(1.5)

                    self._extrair_cards_js(page, cat_nome)
                    print(f"Total de produtos acumulados: {len(self.produtos_capturados)}")
                except Exception as e:
                    print(f"[ERRO] Falha ao navegar em {cat_url}: {e}")

            # Atualiza o arquivo de sessão com os cookies frescos de navegação
            context.storage_state(path=str(self.arquivo_sessao))
            browser.close()

        resultado = list(self.produtos_capturados.values())[:limite_produtos]
        return resultado

    def _extrair_cards_js(self, page: Page, categoria_nome: str):
        """Extrai produtos da vitrine Carrefour com nomes limpos em UTF-8 e preços normalizados."""
        try:
            raw_prods = page.evaluate('''() => {
                const results = [];
                const links = document.querySelectorAll('a[href*="/p"], a[href*="/produto/"]');
                for (const a of links) {
                    const text = a.innerText.trim();
                    const href = a.getAttribute('href');
                    const img = a.querySelector('img') ? a.querySelector('img').src : '';
                    if (text && text.includes('R$')) {
                        results.push({ href, lines: text.split('\\n').map(s => s.trim()).filter(Boolean), img });
                    }
                }
                return results;
            }''')

            for item in raw_prods:
                href = item.get("href") or ""
                lines = item.get("lines") or []
                img_url = item.get("img") or None

                if not lines or len(lines) < 2:
                    continue

                # A primeira linha normalmente é o nome do produto
                nome = lines[0]

                # Procura linhas com padrão de preço R$
                preco_val = None
                preco_normal_val = None
                is_promo = False

                precos_encontrados = []
                for l in lines[1:]:
                    p = normalizar_preco(l)
                    if p:
                        precos_encontrados.append(p)
                    if "-%" in l or "%" in l:
                        is_promo = True

                if not precos_encontrados:
                    continue

                if len(precos_encontrados) >= 2:
                    is_promo = True
                    preco_val = min(precos_encontrados)
                    preco_normal_val = max(precos_encontrados)
                else:
                    preco_val = precos_encontrados[0]

                # Extrai ID do slug
                slug_limpo = href.split("?")[0].rstrip("/")
                id_origem = slug_limpo.split("-")[-1] if "-" in slug_limpo else f"carrefour_{abs(hash(nome)) % 1000000}"

                if id_origem in self.produtos_capturados:
                    continue

                prod = {
                    "nome_bruto": nome,
                    "preco": preco_val,
                    "preco_normal": preco_normal_val,
                    "em_promocao": is_promo,
                    "marca": None,
                    "categoria": categoria_nome,
                    "slug": slug_limpo,
                    "id_produto_origem": id_origem,
                    "supermercado": "Carrefour Mercado",
                    "data_coleta": datetime.now(timezone.utc).isoformat(),
                    "is_clube": False,
                    "clube_nome": None,
                    "imagem_url": img_url
                }
                self.produtos_capturados[id_origem] = prod

        except Exception as e:
            print(f"[Aviso extração JS]: {e}")

    def salvar_saidas(self, produtos: List[Dict[str, Any]], dir_saida: Path):
        dir_saida.mkdir(parents=True, exist_ok=True)
        json_path = dir_saida / "produtos_coletados_mercado.json"
        csv_path = dir_saida / "produtos_coletados_mercado.csv"

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
    parser = argparse.ArgumentParser(description="Scraper Playwright Carrefour Mercado / VTEX (RS)")
    parser.add_argument("--sessao", type=str, default=str(ARQUIVO_SESSAO_PADRAO), help="Caminho do arquivo sessao_mercado.json")
    parser.add_argument("--limite", type=int, default=15, help="Limite máximo de produtos a coletar")
    parser.add_argument("--headed", action="store_true", help="Executa o navegador visível (não headless)")
    parser.add_argument("--saida-dir", type=str, default=str(DIRETORIO_SCRIPTS / "saida"), help="Diretório de saída")

    args = parser.parse_args()

    scraper = ScraperPlaywrightMercado(
        arquivo_sessao=Path(args.sessao),
        headless=not args.headed
    )

    prods = scraper.coletar(limite_produtos=args.limite)
    scraper.salvar_saidas(prods, Path(args.saida_dir))

    if prods:
        print("\nExemplo de produtos coletados do Carrefour Mercado:")
        for p in prods[:5]:
            promo_str = f"(De R$ {p['preco_normal']:.2f})" if p['preco_normal'] else ""
            print(f"  - {p['nome_bruto']} | R$ {p['preco']:.2f} {promo_str} | Promo: {p['em_promocao']} | ID: {p['id_produto_origem']}")
    else:
        print("[AVISO] Nenhum produto capturado nesta execução.")
