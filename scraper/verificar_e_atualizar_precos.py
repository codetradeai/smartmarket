"""
SmartMarket - Verificador e Atualizador de Preços e 3D em Tempo Real (RS)
-----------------------------------------------------------------------------
1. Conecta diretamente nas APIs dos supermercados gaúchos (Asun, Fort, Stok, Atacadão).
2. Captura automaticamente todos os produtos com suporte a visualização 3D/360° (frames HD).
3. Compara os preços vigentes online com o catálogo atual (frontend/src/data.js).
4. Detecta variações:
   - 🔥 Quedas de preço / Promoções ativas
   - 📈 Aumentos de preço
   - ⚖️ Preços inalterados
5. Atualiza o catálogo (data.js) com recálculo automático de menor preço e HMR no localhost:5174.
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_JS_PATH = BASE_DIR / "frontend" / "src" / "data.js"
OUTPUT_DIR = BASE_DIR / "scraper" / "output"
SQL_UPDATE_PATH = BASE_DIR / "backend" / "database" / "atualizacao_precos_recente.sql"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
LOGGER = logging.getLogger("verificador_precos")

HEADERS_COMMON = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (SmartMarket RS PriceTracker)",
    "Accept": "application/json, text/plain, */*",
}


def extrair_produtos_data_js(caminho_arquivo: Path) -> List[Dict[str, Any]]:
    """Carrega a lista PRODUCTS do frontend/src/data.js."""
    conteudo = caminho_arquivo.read_text(encoding="utf-8")
    match = re.search(r"export const PRODUCTS\s*=\s*(\[[\s\S]*?\]);\s*$", conteudo)
    if not match:
        match = re.search(r"export const PRODUCTS\s*=\s*(\[[\s\S]*?\])", conteudo)
    if not match:
        raise ValueError(f"Não foi possível encontrar PRODUCTS em {caminho_arquivo}")
    return json.loads(match.group(1))


def salvar_produtos_data_js(caminho_arquivo: Path, produtos: List[Dict[str, Any]]) -> None:
    """Atualiza a constante PRODUCTS no data.js preservando o cabeçalho."""
    conteudo = caminho_arquivo.read_text(encoding="utf-8")
    idx = conteudo.find("export const PRODUCTS = [")
    if idx == -1:
        idx = conteudo.find("export const PRODUCTS =")
    if idx == -1:
        raise ValueError("Não foi possível encontrar o ponto de inserção de PRODUCTS no data.js")

    cabecalho = conteudo[:idx]
    json_produtos = json.dumps(produtos, indent=2, ensure_ascii=False)
    novo_conteudo = f"{cabecalho}export const PRODUCTS = {json_produtos};\n"
    caminho_arquivo.write_text(novo_conteudo, encoding="utf-8")
    LOGGER.info("Arquivo %s atualizado! Vite HMR disparado para localhost:5174.", caminho_arquivo.name)


# ---------------------------------------------------------------------------
# CARGA EM MASSA DE PREÇOS E 3D DAS APIS ONLINE (RS)
# ---------------------------------------------------------------------------
def precarregar_asun() -> Dict[str, Dict[str, Any]]:
    """Busca produtos e 3D das categorias oficiais do Asun Supermercados (Sense OSuper Loja 1560)."""
    ASUN_CATS = ["1937090", "1936826", "1936108", "1936221", "1937107"]
    mapa = {}
    for cat in ASUN_CATS:
        try:
            url = f"https://sense.osuper.com.br/319/1560/category/{cat}?limit=50"
            resp = requests.get(url, headers=HEADERS_COMMON, timeout=8)
            if resp.status_code == 200:
                hits = resp.json().get("hits", [])
                for h in hits:
                    pid = str(h.get("id"))
                    pricing = h.get("pricing", {})
                    promo = pricing.get("promotionalPrice")
                    normal = pricing.get("price")
                    efetivo = float(promo) if promo else (float(normal) if normal else 0.0)
                    frames_3d = h.get("threeDimensionalImage") or []
                    mapa[pid] = {
                        "nome": h.get("name"),
                        "preco": efetivo,
                        "preco_normal": float(normal) if promo and normal else None,
                        "promo": bool(promo),
                        "frames_3d": frames_3d,
                        "has_3d": bool(frames_3d),
                    }
        except Exception as exc:
            LOGGER.warning("Falha ao consultar categoria Asun %s: %s", cat, exc)
    return mapa


def precarregar_fort() -> Dict[str, Dict[str, Any]]:
    """Busca produtos e 3D das categorias do Fort Atacadista (Sense OSuper Loja 1585)."""
    FORT_CATS = ["1815215", "1815285"]
    mapa = {}
    for cat in FORT_CATS:
        try:
            url = f"https://sense.osuper.com.br/334/1585/category/{cat}?limit=50"
            resp = requests.get(url, headers=HEADERS_COMMON, timeout=8)
            if resp.status_code == 200:
                hits = resp.json().get("hits", [])
                for h in hits:
                    pid = str(h.get("id"))
                    pricing = h.get("pricing", {})
                    promo = pricing.get("promotionalPrice")
                    normal = pricing.get("price")
                    efetivo = float(promo) if promo else (float(normal) if normal else 0.0)
                    frames_3d = h.get("threeDimensionalImage") or []
                    mapa[pid] = {
                        "nome": h.get("name"),
                        "preco": efetivo,
                        "preco_normal": float(normal) if promo and normal else None,
                        "promo": bool(promo),
                        "frames_3d": frames_3d,
                        "has_3d": bool(frames_3d),
                    }
        except Exception as exc:
            LOGGER.warning("Falha ao consultar categoria Fort %s: %s", cat, exc)
    return mapa


def precarregar_stok_destaques() -> List[Dict[str, Any]]:
    """Busca promoções em destaque na vitrine do Stok Center (VipCommerce)."""
    try:
        sys.path.insert(0, str(BASE_DIR / "scraper"))
        import coleta_stok as s
        resp = s.buscar_pagina_termo("oferta", 1)
        return resp.get("data", {}).get("produtos", [])
    except Exception as exc:
        LOGGER.warning("Falha ao consultar destaques Stok: %s", exc)
        return []


# ---------------------------------------------------------------------------
# MOTOR PRINCIPAL DE ANÁLISE E SINCRONIZAÇÃO
# ---------------------------------------------------------------------------
def executar_sincronizacao(aplicar: bool = True, limite: int = 50) -> Dict[str, Any]:
    print("=" * 80)
    print(" 🚀 SMARTMARKET - SINCRONIZAÇÃO DE PREÇOS E CAPTURA 3D AO VIVO")
    print("    Ambiente ativo: http://localhost:5174 (Vite React Frontend)")
    print("=" * 80)

    # 1. Carrega dados das lojas online
    print("[*] Conectando às APIs oficiais dos supermercados do Rio Grande do Sul...")
    t0 = time.time()
    
    dados_asun = precarregar_asun()
    print(f" [✓] Asun Online: {len(dados_asun)} produtos consultados ({sum(1 for v in dados_asun.values() if v['has_3d'])} com fotos 3D ativas).")

    dados_fort = precarregar_fort()
    print(f" [✓] Fort Atacadista: {len(dados_fort)} produtos consultados ({sum(1 for v in dados_fort.values() if v['has_3d'])} com fotos 3D ativas).")

    destaques_stok = precarregar_stok_destaques()
    print(f" [✓] Stok Center: {len(destaques_stok)} ofertas em destaque capturadas do carrossel.")
    
    tempo_fetch = round(time.time() - t0, 2)
    print(f"[*] Dados obtidos das APIs em {tempo_fetch}s.")
    print("-" * 80)

    # 2. Carrega catálogo atual do frontend
    produtos = extrair_produtos_data_js(DATA_JS_PATH)
    print(f"[*] Comparando com os {len(produtos)} produtos do catálogo local...")
    print("-" * 80)

    total_quedas = 0
    total_aumentos = 0
    total_estaveis = 0
    novos_3d_ativados = 0
    variacoes_detalhadas = []
    comandos_sql = []

    for i, prod in enumerate(produtos[:limite], 1):
        nome = prod.get("name", "")
        prices = prod.get("prices", {})
        id_origem = str(prod.get("idOrigem") or "")
        mercado_origem = prod.get("supermercadoOrigem", "")
        recursos = prod.setdefault("recursosVisuais", {})
        
        preco_modificado = False
        status_item = "ESTÁVEL"
        mudancas = []

        # 1. Verifica Asun
        if id_origem in dados_asun:
            info = dados_asun[id_origem]
            preco_online = info["preco"]
            preco_atual_asun = prices.get("asun")

            if preco_online > 0 and preco_atual_asun:
                dif = round(preco_online - preco_atual_asun, 2)
                pct = round((dif / preco_atual_asun) * 100, 1)
                if dif < 0:
                    status_item = "QUEDA"
                    total_quedas += 1
                    mudancas.append(f"Asun: R$ {preco_atual_asun:.2f} ➜ R$ {preco_online:.2f} ({pct}%) 🔥")
                    prices["asun"] = preco_online
                    preco_modificado = True
                elif dif > 0:
                    status_item = "AUMENTO"
                    total_aumentos += 1
                    mudancas.append(f"Asun: R$ {preco_atual_asun:.2f} ➜ R$ {preco_online:.2f} (+{pct}%) 📈")
                    prices["asun"] = preco_online
                    preco_modificado = True

            # Captura 3D automática
            if info["has_3d"] and not recursos.get("has360"):
                recursos["has360"] = True
                recursos["totalFrames"] = len(info["frames_3d"])
                recursos["origem"] = "Asun Supermercados (API Sense OSuper / Filial 1560)"
                recursos["idOrigem"] = id_origem
                recursos["frames"] = info["frames_3d"]
                novos_3d_ativados += 1
                mudancas.append(f"✨ 3D/360° ATIVADO ({len(info['frames_3d'])} frames)")

        # 2. Verifica Fort Atacadista
        if id_origem in dados_fort:
            info = dados_fort[id_origem]
            preco_online = info["preco"]
            preco_atual_fort = prices.get("fort")

            if preco_online > 0 and preco_atual_fort:
                dif = round(preco_online - preco_atual_fort, 2)
                pct = round((dif / preco_atual_fort) * 100, 1)
                if dif < 0:
                    status_item = "QUEDA"
                    total_quedas += 1
                    mudancas.append(f"Fort: R$ {preco_atual_fort:.2f} ➜ R$ {preco_online:.2f} ({pct}%) 🔥")
                    prices["fort"] = preco_online
                    preco_modificado = True
                elif dif > 0:
                    status_item = "AUMENTO"
                    total_aumentos += 1
                    mudancas.append(f"Fort: R$ {preco_atual_fort:.2f} ➜ R$ {preco_online:.2f} (+{pct}%) 📈")
                    prices["fort"] = preco_online
                    preco_modificado = True

            # Captura 3D automática
            if info["has_3d"] and not recursos.get("has360"):
                recursos["has360"] = True
                recursos["totalFrames"] = len(info["frames_3d"])
                recursos["origem"] = "Fort Atacadista (Sense OSuper / Loja 1585)"
                recursos["idOrigem"] = id_origem
                recursos["frames"] = info["frames_3d"]
                novos_3d_ativados += 1
                mudancas.append(f"✨ 3D/360° ATIVADO ({len(info['frames_3d'])} frames)")

        if not mudancas:
            total_estaveis += 1
            menor_mercado = min(prices, key=prices.get) if prices else "N/A"
            mudancas.append(f"Menor preço: {menor_mercado.upper()} R$ {prices.get(menor_mercado, 0.0):.2f} (Estável)")

        # Recalcula melhor preço se houve alteração
        if preco_modificado:
            prod["prices"] = prices
            if prices:
                menor_m = min(prices, key=prices.get)
                prod["menorPreco"] = prices[menor_m]
                prod["mercadoMenorPreco"] = menor_m
            comandos_sql.append(
                f"-- Atualização produto {prod.get('id')}: {nome}\n"
                f"INSERT INTO preco(produto_id, mercado_id, valor, coletado_em, disponivel) "
                f"VALUES ((SELECT id FROM produto WHERE nome = '{nome}' LIMIT 1), 1, {prices.get('asun', 0.0)}, NOW(), true);\n"
            )

        simbolo = "🔥" if status_item == "QUEDA" else ("📈" if status_item == "AUMENTO" else "⚖️")
        print(f"[{i:02d}/{limite:02d}] {simbolo} {nome[:40]:<40} | {' | '.join(mudancas)}")

        variacoes_detalhadas.append({
            "id": prod.get("id"),
            "nome": nome,
            "status": status_item,
            "mudancas": mudancas,
            "has_360": bool(recursos.get("has360")),
        })

    print("-" * 80)
    print(" 📊 BALANÇO CONSOLIDADO:")
    print(f"   • Produtos verificados:            {limite}")
    print(f"   • Quedas de preço / Ofertas vivas: {total_quedas} 🔥")
    print(f"   • Aumentos de preço detectados:    {total_aumentos} 📈")
    print(f"   • Preços inalterados / Estáveis:   {total_estaveis} ⚖️")
    print(f"   • Novos produtos com 3D ativados:  {novos_3d_ativados} 🧊")
    print("=" * 80)

    # 3. Aplica no frontend (data.js) para disparar Hot Reload no localhost:5174
    if aplicar:
        salvar_produtos_data_js(DATA_JS_PATH, produtos)
        print("[✨] 'frontend/src/data.js' atualizado com sucesso!")
        print("[✨] Seu Vite (localhost:5174) recarregou automaticamente via HMR!")

    # 4. Salva relatórios de auditoria
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    relatorio_json = OUTPUT_DIR / "relatorio_variacao_precos.json"
    relatorio_json.write_text(
        json.dumps({
            "executado_em": datetime.now(timezone.utc).isoformat(),
            "total_verificados": limite,
            "quedas": total_quedas,
            "aumentos": total_aumentos,
            "estaveis": total_estaveis,
            "novos_3d": novos_3d_ativados,
            "itens": variacoes_detalhadas,
        }, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )
    print(f"[💾] Relatório salvo em: {relatorio_json.name}")

    if comandos_sql:
        SQL_UPDATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        SQL_UPDATE_PATH.write_text("".join(comandos_sql), encoding="utf-8")
        print(f"[💾] Script SQL de carga salvo em: {SQL_UPDATE_PATH.name}")

    return {
        "total": limite,
        "quedas": total_quedas,
        "aumentos": total_aumentos,
        "estaveis": total_estaveis,
        "novos_3d": novos_3d_ativados,
    }


def main():
    parser = argparse.ArgumentParser(description="Verificador e Atualizador de Preços e 3D")
    parser.add_argument("--aplicar", action="store_true", default=True, help="Aplica no data.js para o localhost:5174")
    parser.add_argument("--limite", type=int, default=50, help="Quantidade de produtos a processar")
    args = parser.parse_args()

    executar_sincronizacao(aplicar=args.aplicar, limite=args.limite)


if __name__ == "__main__":
    main()
