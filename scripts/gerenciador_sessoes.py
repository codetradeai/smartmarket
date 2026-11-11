#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerenciador de Sessões e Autenticação Anti-Bot com Playwright.
Projeto: SmartMarket (RS)

Funcionalidades:
1. Geração de sessões de região/CEP injetadas (Cachoeirinha/RS e Região Metropolitana de Porto Alegre).
2. Captura interativa de sessões com bypass de detecção de automação (Anti-Bot).
3. Interceptação de tráfego de rede XHR/Fetch (page.on("response")).
4. Validação e auditoria de arquivos de sessão salvos (storage_state).
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from typing import Dict, Any, Optional

try:
    from playwright.sync_api import sync_playwright, BrowserContext, Page, Response
except ImportError:
    print("[ERRO] Playwright não instalado. Execute: pip install playwright && playwright install chromium")
    sys.exit(1)

DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
EMAIL_OFICIAL = "smartmarketmaisprati@gmail.com"

# Configurações de Redes e Regiões do Rio Grande do Sul
CONFIGS_REDES = {
    "fort": {
        "nome": "Fort Atacadista",
        "url": "https://www.deliveryfort.com.br/",
        "arquivo_sessao": DIRETORIO_SCRIPTS / "sessao_fort.json",
        "email_alias": "smartmarketmaisprati+fort@gmail.com",
        "dominio": ".deliveryfort.com.br",
        "loja_id": "1585",  # Canoas / Atende Cachoeirinha e Região Metropolitana
        "cidade": "Cachoeirinha",
        "cep": "94910-000",
        "cookies_regiao": [
            {"name": "selected_store", "value": "1585", "domain": ".deliveryfort.com.br", "path": "/"},
            {"name": "store_id", "value": "1585", "domain": ".deliveryfort.com.br", "path": "/"},
            {"name": "cep_entrega", "value": "94910000", "domain": ".deliveryfort.com.br", "path": "/"},
            {"name": "cidade_entrega", "value": "Cachoeirinha", "domain": ".deliveryfort.com.br", "path": "/"},
            {"name": "uf_entrega", "value": "RS", "domain": ".deliveryfort.com.br", "path": "/"},
        ],
        "local_storage": [
            {"name": "osuper_store_id", "value": "1585"},
            {"name": "osuper_zipcode", "value": "94910000"},
            {"name": "selectedStore", "value": json.dumps({"id": 1585, "name": "Fort Canoas (Cachoeirinha/RS)", "state": "RS"})}
        ]
    },
    "mercado": {
        "nome": "Carrefour Mercado / Atacadão RS",
        "url": "https://mercado.carrefour.com.br/",
        "arquivo_sessao": DIRETORIO_SCRIPTS / "sessao_mercado.json",
        "email_alias": "smartmarketmaisprati+carrefour@gmail.com",
        "dominio": ".carrefour.com.br",
        "cidade": "Cachoeirinha",
        "cep": "94910-000",
        "cookies_regiao": [
            # vtex_segment com regionId de Cachoeirinha/RS: v2.528E4DC08EDA4F5F21C058A921F527DF
            {"name": "vtex_segment", "value": "eyJjYW1wYWlnbnMiOm51bGwsImNoYW5uZWwiOiIxIiwicHJpY2VGYWJsZXMiOm51bGwsInJlZ2lvbklkIjoidjIuNTI4RTREQzA4RURBNEY1RjIxQzA1OEE5MjFGNTI3REYiLCJ1dG1fc291cmNlIjpudWxsLCJjdXJyZW5jeUNvZGUiOiJCUkwiLCJjdXJyZW5jeVN5bWJvbCI6IlIkIn0=", "domain": ".carrefour.com.br", "path": "/"},
            {"name": "has_postal_code", "value": "true", "domain": ".carrefour.com.br", "path": "/"},
            {"name": "user_postal_code", "value": "94910000", "domain": ".carrefour.com.br", "path": "/"},
            {"name": "regionId", "value": "v2.528E4DC08EDA4F5F21C058A921F527DF", "domain": ".carrefour.com.br", "path": "/"}
        ],
        "local_storage": [
            {"name": "postalCode", "value": "94910000"},
            {"name": "shipping_cep", "value": "94910000"},
            {"name": "selected_region", "value": "RS_CACHOEIRINHA"}
        ]
    }
}


def aplicar_evasao_antibot(context: BrowserContext, page: Page):
    """
    Injeta scripts e cabeçalhos para ocultar propriedades comumente utilizadas por
    WAFs e sistemas anti-bot (Cloudflare, Akamai, Datadome, reCAPTCHA).
    """
    # Mascarar navigator.webdriver
    page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
        
        // Simular plugins existentes
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
        
        // Simular linguagens brasileiras
        Object.defineProperty(navigator, 'languages', {
            get: () => ['pt-BR', 'pt', 'en-US', 'en'],
        });
        
        // Janela Chrome nativa
        window.chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {}
        };
    """)


def gerar_sessao_regiao_injetada(rede_key: str) -> Path:
    """
    Cria ou regenera um arquivo de storage_state do Playwright contendo os cookies
    e localStorage pré-configurados para a filial/CEP do RS, dispensando login.
    """
    config = CONFIGS_REDES.get(rede_key)
    if not config:
        raise ValueError(f"Rede desconhecida: {rede_key}")

    arquivo_saida = config["arquivo_sessao"]

    agora = int(time.time())
    expira_em_1_ano = agora + (365 * 24 * 3600)

    # Monta estrutura no padrão Playwright storage_state
    cookies = []
    for c in config["cookies_regiao"]:
        cookies.append({
            "name": c["name"],
            "value": c["value"],
            "domain": c["domain"],
            "path": c.get("path", "/"),
            "expires": expira_em_1_ano,
            "httpOnly": False,
            "secure": True,
            "sameSite": "Lax"
        })

    origins = [{
        "origin": config["url"].rstrip("/"),
        "localStorage": config.get("local_storage", [])
    }]

    storage_state_data = {
        "cookies": cookies,
        "origins": origins
    }

    with open(arquivo_saida, "w", encoding="utf-8") as f:
        json.dump(storage_state_data, f, indent=2, ensure_ascii=False)

    print(f"[OK] Sessão de região gerada com sucesso para '{config['nome']}': {arquivo_saida}")
    return arquivo_saida


def auditar_sessao(arquivo: Path):
    """
    Audita um arquivo de storage_state sem vazar tokens de autenticação completos.
    """
    if not arquivo.exists():
        print(f"[AVISO] Arquivo não encontrado: {arquivo}")
        return

    try:
        with open(arquivo, "r", encoding="utf-8") as f:
            data = json.load(f)

        cookies = data.get("cookies", [])
        origins = data.get("origins", [])

        print(f"\n--- Auditoria da Sessão: {arquivo.name} ---")
        print(f"Caminho: {arquivo}")
        print(f"Total de Cookies: {len(cookies)}")
        for c in cookies:
            val_len = len(str(c.get("value", "")))
            preview = (str(c.get("value", ""))[:8] + "...") if val_len > 8 else str(c.get("value", ""))
            exp = c.get("expires", "N/A")
            print(f"  * Cookie: {c.get('name')} | Domínio: {c.get('domain')} | Expira: {exp} | Len: {val_len}")

        print(f"Total de Origens (localStorage): {len(origins)}")
        for o in origins:
            origem = o.get("origin")
            keys = [item.get("name") for item in o.get("localStorage", [])]
            print(f"  * Origem: {origem} | Chaves: {keys}")
        print("-" * 50)
    except json.JSONDecodeError as e:
        print(f"[ERRO CRÍTICO] O arquivo {arquivo} não é um JSON válido: {e}")
    except Exception as e:
        print(f"[ERRO] Falha ao auditar {arquivo}: {e}")


def capturar_sessao_interativa(rede_key: str):
    """
    Abre o navegador visível com flags anti-bot para login manual
    ou seleção de CEP e grava o storage_state ao final.
    """
    config = CONFIGS_REDES.get(rede_key)
    if not config:
        print(f"[ERRO] Rede inválida. Opções: {list(CONFIGS_REDES.keys())}")
        return

    arquivo_sessao = config["arquivo_sessao"]
    print(f"\nIniciando sessão interativa para: {config['nome']}")
    print(f"E-mail de autenticação sugerido: {config['email_alias']} (ou {EMAIL_OFICIAL})")
    print("Anti-bot ativado: navegando em modo Chromium com automação mascarada.")

    with sync_playwright() as p:
        args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
            "--no-sandbox"
        ]

        browser = p.chromium.launch(
            headless=False,
            args=args
        )

        # Se já existir sessão válida, carrega para atualizar
        state_arg = str(arquivo_sessao) if (arquivo_sessao.exists() and arquivo_sessao.stat().st_size > 50) else None
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            locale="pt-BR",
            storage_state=state_arg
        )

        page = context.new_page()
        aplicar_evasao_antibot(context, page)

        # Monitor de respostas XHR/Fetch para descoberta de endpoints
        def on_response(response: Response):
            if "json" in response.headers.get("content-type", "").lower():
                url = response.url
                if any(k in url for k in ["product", "catalog", "search", "category", "price", "graphql"]):
                    print(f"  [XHR/Fetch Detectado] {response.status} -> {url[:100]}...")

        page.on("response", on_response)

        print(f"\nAcessando: {config['url']}")
        page.goto(config["url"], wait_until="domcontentloaded")

        print("\n" + "="*65)
        print("INSTRUÇÕES PARA AUTENTICAÇÃO / SELEÇÃO DE FILIAL:")
        print(f"1. Se necessário login, use: {config['email_alias']}")
        print(f"2. Selecione a filial do RS (Cachoeirinha, Canoas ou Porto Alegre - CEP: {config['cep']})")
        print("3. Quando os preços e catálogo estiverem visíveis, volte a este terminal.")
        print("="*65 + "\n")

        try:
            input("Pressione [ENTER] no terminal para salvar a sessão e fechar o navegador...")
        except EOFError:
            print("[INFO] Execução não interativa detectada. Salvando sessão atual...")

        # Salva o storage state do Playwright
        context.storage_state(path=str(arquivo_sessao))
        print(f"[SUCESSO] Sessão salva em: {arquivo_sessao}")

        browser.close()

    auditar_sessao(arquivo_sessao)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gerenciador de Sessões e Anti-Bot SmartMarket")
    parser.add_argument("--gerar-todas-regioes", action="store_true", help="Gera sessões injetadas com CEP/Região para todas as redes")
    parser.add_argument("--auditar", action="store_true", help="Audita os arquivos de sessão existentes")
    parser.add_argument("--capturar", choices=list(CONFIGS_REDES.keys()), help="Inicia navegador interativo para login/captura de sessão")

    args = parser.parse_args()

    if args.gerar_todas_regioes:
        for r in CONFIGS_REDES:
            gerar_sessao_regiao_injetada(r)
        print("\nAuditoria pós-geração:")
        for r, cfg in CONFIGS_REDES.items():
            auditar_sessao(cfg["arquivo_sessao"])
    elif args.auditar:
        for r, cfg in CONFIGS_REDES.items():
            auditar_sessao(cfg["arquivo_sessao"])
    elif args.capturar:
        capturar_sessao_interativa(args.capturar)
    else:
        # Se rodar sem parâmetros, exibe ajuda e gera as sessões de região padrão se não existirem
        print("Uso padrão do Gerenciador de Sessões.")
        for r, cfg in CONFIGS_REDES.items():
            if not cfg["arquivo_sessao"].exists() or cfg["arquivo_sessao"].stat().st_size < 100:
                print(f"Inicializando sessão base de região para {r}...")
                gerar_sessao_regiao_injetada(r)
            auditar_sessao(cfg["arquivo_sessao"])
