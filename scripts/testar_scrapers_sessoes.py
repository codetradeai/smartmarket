#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Teste e Validação das Sessões e Scrapers Playwright.
Diretório: scripts/testar_scrapers_sessoes.py
"""

import sys
import json
from pathlib import Path

DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(DIRETORIO_SCRIPTS))

from gerenciador_sessoes import auditar_sessao, CONFIGS_REDES
from scraper_playwright_fort import ScraperPlaywrightFort
from scraper_playwright_mercado import ScraperPlaywrightMercado


def validar_arquivos_sessao():
    print("=" * 60)
    print("1. VALIDAÇÃO DOS ARQUIVOS DE SESSÃO (.JSON)")
    print("=" * 60)

    sucesso = True
    for rede, cfg in CONFIGS_REDES.items():
        arq = cfg["arquivo_sessao"]
        print(f"\nChecando {cfg['nome']} ({arq.name})...")
        if not arq.exists():
            print(f"[FALHA] Arquivo {arq} não existe!")
            sucesso = False
            continue

        try:
            with open(arq, "r", encoding="utf-8") as f:
                dados = json.load(f)
            cookies = dados.get("cookies", [])
            origins = dados.get("origins", [])
            print(f"  [OK] JSON válido. {len(cookies)} cookies e {len(origins)} origens de storage.")
            auditar_sessao(arq)
        except Exception as e:
            print(f"  [FALHA] Erro ao ler JSON de {arq}: {e}")
            sucesso = False

    return sucesso


def testar_scrapers():
    print("\n" + "=" * 60)
    print("2. EXECUÇÃO DE TESTE DOS SCRAPERS PLAYWRIGHT (HEADLESS)")
    print("=" * 60)

    # 1. Teste Fort Atacadista
    print("\n>>> Testando Scraper Fort Atacadista...")
    scraper_fort = ScraperPlaywrightFort(headless=True, timeout_ms=25000)
    prods_fort = scraper_fort.coletar(
        categorias=[{"nome": "Mercearia", "url": "https://www.deliveryfort.com.br/mercearia"}],
        limite_produtos=5
    )
    print(f"Fort: {len(prods_fort)} produtos capturados.")
    for p in prods_fort[:3]:
        promo_txt = f"(De R$ {p['preco_normal']:.2f})" if p.get('preco_normal') else ""
        print(f"  * {p['nome_bruto']} -> R$ {p['preco']:.2f} {promo_txt}")

    scraper_fort.salvar_saidas(prods_fort, DIRETORIO_SCRIPTS / "saida")

    # 2. Teste Carrefour Mercado
    print("\n>>> Testando Scraper Carrefour Mercado...")
    scraper_mercado = ScraperPlaywrightMercado(headless=True, timeout_ms=25000)
    prods_mercado = scraper_mercado.coletar(
        categorias=[{"nome": "Graos_Arrozes_Feijoes", "url": "https://mercado.carrefour.com.br/alimentos-basicos"}],
        limite_produtos=5
    )
    print(f"Carrefour Mercado: {len(prods_mercado)} produtos capturados.")
    for p in prods_mercado[:3]:
        promo_txt = f"(De R$ {p['preco_normal']:.2f})" if p.get('preco_normal') else ""
        print(f"  * {p['nome_bruto']} -> R$ {p['preco']:.2f} {promo_txt}")

    scraper_mercado.salvar_saidas(prods_mercado, DIRETORIO_SCRIPTS / "saida")

    print("\n" + "=" * 60)
    print("RESUMO DA VALIDAÇÃO DOS SCRAPERS (100% AUTOMÁTICOS):")
    print(f"- Fort Atacadista:   {'SUCESSO (' + str(len(prods_fort)) + ' produtos)' if prods_fort else 'FALHA'}")
    print(f"- Carrefour Mercado: {'SUCESSO (' + str(len(prods_mercado)) + ' produtos)' if prods_mercado else 'FALHA'}")
    print("=" * 60)


if __name__ == "__main__":
    if validar_arquivos_sessao():
        testar_scrapers()
    else:
        print("[ERRO] Arquivos de sessão inválidos. Teste abortado.")
        sys.exit(1)
