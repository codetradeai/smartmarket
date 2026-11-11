#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartMarket - Automação de Preenchimento e Captura de Sessão (Playwright)
Diretório: scripts/autenticador_interativo.py

Função:
Abre o navegador visível com proteções anti-bot para redes que exigem validação (como Carrefour).
Preenche AUTOMATICAMENTE o e-mail oficial (smartmarketmaisprati@gmail.com) e CEP de Cachoeirinha/RS,
pausando no terminal APENAS no momento exato do CAPTCHA ou token de e-mail.
Salva o storage_state completo no JSON de sessão após a conclusão.
"""

import sys
import time
import argparse
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("[ERRO] Playwright não instalado.")
    sys.exit(1)

DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
EMAIL_OFICIAL = "smartmarketmaisprati@gmail.com"
CEP_PADRAO = "94910000"  # Cachoeirinha / RS

CONFIGURACOES = {
    "carrefour": {
        "nome": "Carrefour Mercado",
        "url_login": "https://mercado.carrefour.com.br/login",
        "url_home": "https://mercado.carrefour.com.br/",
        "arquivo_sessao": DIRETORIO_SCRIPTS / "sessao_mercado.json",
        "seletor_email": "input[type='email'], input[name='email'], input[placeholder*='e-mail' i], input[placeholder*='email' i]",
        "seletor_cep": "input[name*='cep' i], input[placeholder*='cep' i], input[type='tel']"
    },
    "fort": {
        "nome": "Fort Atacadista",
        "url_login": "https://www.deliveryfort.com.br/entrar",
        "url_home": "https://www.deliveryfort.com.br/",
        "arquivo_sessao": DIRETORIO_SCRIPTS / "sessao_fort.json",
        "seletor_email": "input[type='email'], input[name='email'], input[placeholder*='e-mail' i]",
        "seletor_cep": "input[name*='cep' i], input[placeholder*='cep' i]"
    }
}


def preencher_e_autenticar(rede_key: str):
    config = CONFIGURACOES.get(rede_key)
    if not config:
        print(f"[ERRO] Rede não suportada. Opções: {list(CONFIGURACOES.keys())}")
        return

    print("=" * 65)
    print(f"AUTOMAÇÃO DE LOGIN / SESSÃO: {config['nome']}")
    print("=" * 65)
    print(f"E-mail pré-preenchido: {EMAIL_OFICIAL}")
    print(f"CEP pré-preenchido:    {CEP_PADRAO} (Cachoeirinha/RS)")
    print("=" * 65)

    with sync_playwright() as p:
        args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
            "--no-sandbox",
            "--start-maximized"
        ]

        browser = p.chromium.launch(headless=False, args=args)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            locale="pt-BR",
            no_viewport=True
        )

        page = context.new_page()
        # Injeta anti-bot
        page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en'] });
        """)

        print(f"\n1. Acessando {config['nome']}...")
        try:
            page.goto(config["url_login"], wait_until="domcontentloaded", timeout=35000)
        except Exception:
            print("Redirecionando para a página principal...")
            page.goto(config["url_home"], wait_until="domcontentloaded", timeout=35000)

        time.sleep(3)

        # 2. Tentar preenchimento automático do e-mail
        print("2. Verificando campos de entrada...")
        email_input = page.query_selector(config["seletor_email"])
        if email_input:
            try:
                print(f"   [Auto-Fill] Preenchendo e-mail: {EMAIL_OFICIAL}")
                email_input.click()
                email_input.fill(EMAIL_OFICIAL)
                time.sleep(1)
            except Exception as e:
                print(f"   Aviso ao preencher e-mail: {e}")
        else:
            print("   Campo de e-mail direto não visível imediatamente (possível fluxo em etapas ou modal).")

        # 3. Tentar preenchimento automático de CEP se modal estiver presente
        cep_input = page.query_selector(config["seletor_cep"])
        if cep_input:
            try:
                print(f"   [Auto-Fill] Preenchendo CEP: {CEP_PADRAO}")
                cep_input.click()
                cep_input.fill(CEP_PADRAO)
            except Exception:
                pass

        print("\n" + "#" * 65)
        print("AÇÃO MANUAL DO USUÁRIO NECESSÁRIA AGORA:")
        print("1. Se houver CAPTCHA na tela, resolva-o no navegador.")
        print("2. Se o site enviar um código (token OTP) para o e-mail, insira-o.")
        print("3. Assim que a vitrine com os preços dos produtos carregar, volte aqui.")
        print("#" * 65 + "\n")

        try:
            input("Pressione [ENTER] AQUI no terminal para SALVAR a sessão e fechar...")
        except EOFError:
            print("[INFO] Finalizando...")

        # Salva o storage state completo
        arquivo_saida = config["arquivo_sessao"]
        context.storage_state(path=str(arquivo_saida))
        print(f"\n[SUCESSO] Sessão salva em: {arquivo_saida}")
        print("Os scrapers automáticos já podem consumir esta sessão gravada.")

        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automação de Preenchimento de Login SmartMarket")
    parser.add_argument("--rede", choices=["carrefour", "fort"], default="carrefour", help="Rede alvo")
    args = parser.parse_args()

    preencher_e_autenticar(args.rede)

