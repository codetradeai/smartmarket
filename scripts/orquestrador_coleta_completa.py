#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartMarket - Orquestrador de Coleta Massiva Multi-Rede (RS)
Diretório: scripts/orquestrador_coleta_completa.py

Executa a raspagem em escala de centenas de produtos reais nas 8 redes gaúchas:
1. Fort Atacadista (Playwright + OSuper API - Canoas/Grande POA)
2. Asun Supermercados (Playwright / OSuper API - Cachoeirinha)
3. Atacadão (VTEX Catalog System - RS)
4. Master Supermercados (VipCommerce API)
5. Stok Center (VipCommerce API)
6. Zaffari / Bourbon (VTEX Catalog System)
7. Supermercados Rissul (VTEX Catalog System)
8. Carrefour Mercado (Headless Playwright SSR com Sessão)

Aplica pausas seguras (rate limiting), tratamento resiliente de erros por rede,
e exporta os dados brutos consolidados em scripts/saida/.
"""

import sys
import os
import time
import json
import uuid
import re
import urllib.parse
import unicodedata
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

import requests

DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
DIR_SAIDA = DIRETORIO_SCRIPTS / "saida"
ARQUIVO_CATALOGO_FILIAIS = DIRETORIO_SCRIPTS / "catalogo_filiais_rs.json"
ARQUIVO_SAIDA_MASSIVA = DIR_SAIDA / "coleta_massiva_bruta.json"

HEADERS_BASE = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}

TERMOS_ESSENCIAIS = [
    "arroz",
    "feijao",
    "cafe",
    "leite",
    "oleo",
    "acucar",
    "macarrao",
    "farinha",
    "frango",
    "carne",
    "refrigerante",
    "cerveja",
    "sabao",
    "papel higienico",
    "queijo",
    "manteiga",
]

META_POR_REDE = 60  # entre 40 e 80 produtos por rede


def agora_utc():
    return datetime.now(timezone.utc).isoformat()


def normalizar_slug(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    sem_acento = "".join([c for c in nfkd if not unicodedata.combining(c)])
    limpo = re.sub(r"[^\w]", "_", sem_acento.lower()).strip("_")
    return re.sub(r"_+", "_", limpo)


def carregar_filiais_catalogo() -> Dict[str, List[Dict[str, Any]]]:
    if not ARQUIVO_CATALOGO_FILIAIS.exists():
        return {}
    with open(ARQUIVO_CATALOGO_FILIAIS, "r", encoding="utf-8") as f:
        filiais = json.load(f)
    por_rede = {}
    for fil in filiais:
        r = fil["rede"]
        if r not in por_rede:
            por_rede[r] = []
        por_rede[r].append(fil)
    return por_rede


class ColetorMassivo:
    def __init__(self):
        self.filiais_por_rede = carregar_filiais_catalogo()
        self.produtos_coletados_por_rede: Dict[str, List[Dict[str, Any]]] = {}
        DIR_SAIDA.mkdir(parents=True, exist_ok=True)

    def ids_filiais(self, rede: str) -> List[str]:
        lista = self.filiais_por_rede.get(rede, [])
        if lista:
            return [f["filial_id"] for f in lista]
        return [f"{normalizar_slug(rede)}_default"]

    # --------------------------------------------------------------------------
    # 1. ATACADÃO RS (VTEX Catalog System)
    # --------------------------------------------------------------------------
    def coletar_atacadao(self) -> List[Dict[str, Any]]:
        print("\n" + "=" * 50, flush=True)
        print(">>> 1/8 INICIANDO COLETA: ATACADÃO RS", flush=True)
        print("=" * 50, flush=True)
        rede = "Atacadão"
        itens = []
        ids_vistos = set()
        filiais_ids = self.ids_filiais(rede)

        for termo in TERMOS_ESSENCIAIS:
            if len(itens) >= META_POR_REDE:
                break
            try:
                url = f"https://www.atacadao.com.br/api/catalog_system/pub/products/search/{urllib.parse.quote(termo)}?_from=0&_to=10"
                resp = requests.get(url, headers=HEADERS_BASE, timeout=12)
                if resp.status_code in (200, 206):
                    prods = resp.json()
                    if isinstance(prods, list):
                        for p in prods:
                            pid = str(p.get("productId") or "")
                            if pid and pid in ids_vistos:
                                continue
                            nome = p.get("productName", "").strip()
                            items_vtex = p.get("items", [])
                            if not items_vtex:
                                continue
                            seller = items_vtex[0].get("sellers", [{}])[0]
                            comm_offer = seller.get("commertialOffer", {})
                            preco = float(comm_offer.get("Price") or 0.0)
                            preco_list = float(comm_offer.get("ListPrice") or preco)
                            if preco > 0 and nome:
                                ids_vistos.add(pid)
                                imagens = items_vtex[0].get("images", [])
                                img_url = imagens[0].get("imageUrl") if imagens else None
                                ean = items_vtex[0].get("ean")
                                itens.append({
                                    "id_produto_origem": pid,
                                    "nome_bruto": nome,
                                    "preco": preco,
                                    "preco_normal": preco_list if preco_list > preco else None,
                                    "em_promocao": preco < preco_list,
                                    "marca": p.get("brand", ""),
                                    "categoria": termo.capitalize(),
                                    "supermercado": rede,
                                    "imagem_url": img_url,
                                    "codigo_barras": ean,
                                    "filiais_ids": filiais_ids,
                                    "data_coleta": agora_utc(),
                                })
                time.sleep(1.5)
            except Exception as e:
                print(f"[Aviso] Atacadão termo '{termo}' erro: {e}", flush=True)

        print(f"[Atacadão RS] Total coletado: {len(itens)} produtos.", flush=True)
        return itens

    # --------------------------------------------------------------------------
    # 2. MASTER SUPERMERCADOS (VipCommerce API)
    # --------------------------------------------------------------------------
    def coletar_master(self) -> List[Dict[str, Any]]:
        print("\n" + "=" * 50, flush=True)
        print(">>> 2/8 INICIANDO COLETA: MASTER SUPERMERCADOS", flush=True)
        print("=" * 50, flush=True)
        rede = "Master Supermercados"
        itens = []
        ids_vistos = set()
        filiais_ids = self.ids_filiais(rede)

        try:
            hdrs = {
                **HEADERS_BASE,
                "DomainKey": "lojaonline.mastersupermercados.com.br",
                "OrganizationId": "193",
                "Origin": "https://www.lojaonline.mastersupermercados.com.br",
                "Referer": "https://www.lojaonline.mastersupermercados.com.br/",
            }
            url_auth = "https://services.vipcommerce.com.br/api-admin/v1/org/193/auth/loja/login"
            payload = {
                "domain": "lojaonline.mastersupermercados.com.br",
                "username": "loja",
                "key": "df072f85df9bf7dd71b6811c34bdbaa4f219d98775b56cff9dfa5f8ca1bf8469",
            }
            r_auth = requests.post(url_auth, json=payload, headers=hdrs, timeout=12)
            token = r_auth.json().get("data")
            if not token:
                print("[Erro] Token Master não obtido.", flush=True)
                return itens
            hdrs["Authorization"] = f"Bearer {token}"

            for termo in TERMOS_ESSENCIAIS:
                if len(itens) >= META_POR_REDE:
                    break
                try:
                    session_id = str(uuid.uuid4())
                    url_busca = (
                        f"https://services.vipcommerce.com.br/api-admin/v1/org/193/filial/1/centro_distribuicao/1/loja/buscas/produtos/termo/{urllib.parse.quote(termo)}?page=1&session={session_id}"
                    )
                    resp = requests.get(url_busca, headers=hdrs, timeout=12)
                    if resp.status_code == 200:
                        prods = resp.json().get("data", {}).get("produtos", [])
                        for p in prods:
                            pid = str(p.get("id") or "")
                            if pid and pid in ids_vistos:
                                continue
                            nome = p.get("nome") or p.get("descricao") or ""
                            preco = float(p.get("preco") or 0.0)
                            preco_normal = float(p.get("preco_normal") or preco)
                            if preco > 0 and nome:
                                ids_vistos.add(pid)
                                img_id = p.get("imagem")
                                img_url = f"https://produto-assets-vipcommerce-com-br.br-se1.magaluobjects.com/1000x1000/{img_id}" if img_id else None
                                itens.append({
                                    "id_produto_origem": pid,
                                    "nome_bruto": nome,
                                    "preco": preco,
                                    "preco_normal": preco_normal if preco_normal > preco else None,
                                    "em_promocao": bool(p.get("em_oferta")),
                                    "marca": p.get("marca") or "",
                                    "categoria": termo.capitalize(),
                                    "supermercado": rede,
                                    "imagem_url": img_url,
                                    "codigo_barras": p.get("codigo_barras"),
                                    "filiais_ids": filiais_ids,
                                    "data_coleta": agora_utc(),
                                })
                    time.sleep(1.5)
                except Exception as e:
                    print(f"[Aviso] Master termo '{termo}' erro: {e}", flush=True)

        except Exception as e:
            print(f"[Erro] Falha geral Master: {e}", flush=True)

        print(f"[Master Supermercados] Total coletado: {len(itens)} produtos.", flush=True)
        return itens

    # --------------------------------------------------------------------------
    # 3. STOK CENTER (VipCommerce API)
    # --------------------------------------------------------------------------
    def coletar_stok(self) -> List[Dict[str, Any]]:
        print("\n" + "=" * 50, flush=True)
        print(">>> 3/8 INICIANDO COLETA: STOK CENTER", flush=True)
        print("=" * 50, flush=True)
        rede = "Stok Center"
        itens = []
        ids_vistos = set()
        filiais_ids = self.ids_filiais(rede)

        try:
            hdrs = {
                **HEADERS_BASE,
                "DomainKey": "stokonline.com.br",
                "OrganizationId": "130",
                "Origin": "https://stokonline.com.br",
                "Referer": "https://stokonline.com.br/",
            }
            url_auth = "https://services.vipcommerce.com.br/api-admin/v1/org/130/auth/loja/login"
            payload = {
                "domain": "stokonline.com.br",
                "username": "loja",
                "key": "df072f85df9bf7dd71b6811c34bdbaa4f219d98775b56cff9dfa5f8ca1bf8469",
            }
            r_auth = requests.post(url_auth, json=payload, headers=hdrs, timeout=12)
            token = r_auth.json().get("data")
            if not token:
                print("[Erro] Token Stok não obtido.", flush=True)
                return itens
            hdrs["Authorization"] = f"Bearer {token}"

            for termo in TERMOS_ESSENCIAIS:
                if len(itens) >= META_POR_REDE:
                    break
                try:
                    session_id = str(uuid.uuid4())
                    url_busca = (
                        f"https://services.vipcommerce.com.br/api-admin/v1/org/130/filial/1/centro_distribuicao/1/loja/buscas/produtos/termo/{urllib.parse.quote(termo)}?page=1&session={session_id}"
                    )
                    resp = requests.get(url_busca, headers=hdrs, timeout=12)
                    if resp.status_code == 200:
                        prods = resp.json().get("data", {}).get("produtos", [])
                        for p in prods:
                            pid = str(p.get("id") or "")
                            if pid and pid in ids_vistos:
                                continue
                            nome = p.get("nome") or p.get("descricao") or ""
                            preco = float(p.get("preco") or 0.0)
                            preco_normal = float(p.get("preco_normal") or preco)
                            if preco > 0 and nome:
                                ids_vistos.add(pid)
                                img_id = p.get("imagem")
                                img_url = f"https://produto-assets-vipcommerce-com-br.br-se1.magaluobjects.com/1000x1000/{img_id}" if img_id else None
                                itens.append({
                                    "id_produto_origem": pid,
                                    "nome_bruto": nome,
                                    "preco": preco,
                                    "preco_normal": preco_normal if preco_normal > preco else None,
                                    "em_promocao": bool(p.get("em_oferta")),
                                    "marca": p.get("marca") or "",
                                    "categoria": termo.capitalize(),
                                    "supermercado": rede,
                                    "imagem_url": img_url,
                                    "codigo_barras": p.get("codigo_barras"),
                                    "filiais_ids": filiais_ids,
                                    "data_coleta": agora_utc(),
                                })
                    time.sleep(1.5)
                except Exception as e:
                    print(f"[Aviso] Stok termo '{termo}' erro: {e}", flush=True)

        except Exception as e:
            print(f"[Erro] Falha geral Stok: {e}", flush=True)

        print(f"[Stok Center] Total coletado: {len(itens)} produtos.", flush=True)
        return itens

    # --------------------------------------------------------------------------
    # 4. ZAFFARI / BOURBON (VTEX Catalog System)
    # --------------------------------------------------------------------------
    def coletar_zaffari(self) -> List[Dict[str, Any]]:
        print("\n" + "=" * 50, flush=True)
        print(">>> 4/8 INICIANDO COLETA: ZAFFARI / BOURBON", flush=True)
        print("=" * 50, flush=True)
        rede = "Zaffari / Bourbon"
        itens = []
        ids_vistos = set()
        filiais_ids = self.ids_filiais(rede)

        for termo in TERMOS_ESSENCIAIS:
            if len(itens) >= META_POR_REDE:
                break
            try:
                url = f"https://www.zaffari.com.br/api/catalog_system/pub/products/search/{urllib.parse.quote(termo)}?_from=0&_to=10"
                hdrs = {
                    **HEADERS_BASE,
                    "Origin": "https://www.zaffari.com.br",
                    "Referer": "https://www.zaffari.com.br/",
                }
                resp = requests.get(url, headers=hdrs, timeout=12)
                if resp.status_code in (200, 206):
                    prods = resp.json()
                    if isinstance(prods, list):
                        for p in prods:
                            pid = str(p.get("productId") or "")
                            if pid and pid in ids_vistos:
                                continue
                            nome = p.get("productName", "").strip()
                            items_vtex = p.get("items", [])
                            if not items_vtex:
                                continue
                            seller = items_vtex[0].get("sellers", [{}])[0]
                            comm_offer = seller.get("commertialOffer", {})
                            preco = float(comm_offer.get("Price") or 0.0)
                            preco_list = float(comm_offer.get("ListPrice") or preco)
                            if preco > 0 and nome:
                                ids_vistos.add(pid)
                                imagens = items_vtex[0].get("images", [])
                                img_url = imagens[0].get("imageUrl") if imagens else None
                                itens.append({
                                    "id_produto_origem": pid,
                                    "nome_bruto": nome,
                                    "preco": preco,
                                    "preco_normal": preco_list if preco_list > preco else None,
                                    "em_promocao": preco < preco_list,
                                    "marca": p.get("brand", ""),
                                    "categoria": termo.capitalize(),
                                    "supermercado": rede,
                                    "imagem_url": img_url,
                                    "codigo_barras": items_vtex[0].get("ean"),
                                    "filiais_ids": filiais_ids,
                                    "data_coleta": agora_utc(),
                                })
                time.sleep(1.5)
            except Exception as e:
                print(f"[Aviso] Zaffari termo '{termo}' erro: {e}", flush=True)

        print(f"[Zaffari / Bourbon] Total coletado: {len(itens)} produtos.", flush=True)
        return itens

    # --------------------------------------------------------------------------
    # 5. SUPERMERCADOS RISSUL (VTEX Catalog System)
    # --------------------------------------------------------------------------
    def coletar_rissul(self) -> List[Dict[str, Any]]:
        print("\n" + "=" * 50, flush=True)
        print(">>> 5/8 INICIANDO COLETA: SUPERMERCADOS RISSUL", flush=True)
        print("=" * 50, flush=True)
        rede = "Supermercados Rissul"
        itens = []
        ids_vistos = set()
        filiais_ids = self.ids_filiais(rede)

        for termo in TERMOS_ESSENCIAIS:
            if len(itens) >= META_POR_REDE:
                break
            try:
                url = f"https://www.rissul.com.br/api/catalog_system/pub/products/search/{urllib.parse.quote(termo)}?_from=0&_to=10"
                hdrs = {
                    **HEADERS_BASE,
                    "Origin": "https://www.rissul.com.br",
                    "Referer": "https://www.rissul.com.br/",
                }
                resp = requests.get(url, headers=hdrs, timeout=12)
                if resp.status_code in (200, 206):
                    prods = resp.json()
                    if isinstance(prods, list):
                        for p in prods:
                            pid = str(p.get("productId") or "")
                            if pid and pid in ids_vistos:
                                continue
                            nome = p.get("productName", "").strip()
                            items_vtex = p.get("items", [])
                            if not items_vtex:
                                continue
                            seller = items_vtex[0].get("sellers", [{}])[0]
                            comm_offer = seller.get("commertialOffer", {})
                            preco = float(comm_offer.get("Price") or 0.0)
                            preco_list = float(comm_offer.get("ListPrice") or preco)
                            if preco > 0 and nome:
                                ids_vistos.add(pid)
                                imagens = items_vtex[0].get("images", [])
                                img_url = imagens[0].get("imageUrl") if imagens else None
                                itens.append({
                                    "id_produto_origem": pid,
                                    "nome_bruto": nome,
                                    "preco": preco,
                                    "preco_normal": preco_list if preco_list > preco else None,
                                    "em_promocao": preco < preco_list,
                                    "marca": p.get("brand", ""),
                                    "categoria": termo.capitalize(),
                                    "supermercado": rede,
                                    "imagem_url": img_url,
                                    "codigo_barras": items_vtex[0].get("ean"),
                                    "filiais_ids": filiais_ids,
                                    "data_coleta": agora_utc(),
                                })
                time.sleep(1.5)
            except Exception as e:
                print(f"[Aviso] Rissul termo '{termo}' erro: {e}", flush=True)

        print(f"[Supermercados Rissul] Total coletado: {len(itens)} produtos.", flush=True)
        return itens

    # --------------------------------------------------------------------------
    # 6. FORT ATACADISTA (Playwright + Cache Seguro)
    # --------------------------------------------------------------------------
    def coletar_fort(self) -> List[Dict[str, Any]]:
        print("\n" + "=" * 50, flush=True)
        print(">>> 6/8 INICIANDO COLETA: FORT ATACADISTA", flush=True)
        print("=" * 50, flush=True)
        rede = "Fort Atacadista"
        itens = []
        filiais_ids = self.ids_filiais(rede)

        # 1. Carrega produtos salvos de coleta anterior
        for arq_nome in ["coleta_fort_atacadista.json", "produtos_coletados_fort.json"]:
            caminho = DIR_SAIDA / arq_nome
            if caminho.exists():
                try:
                    with open(caminho, "r", encoding="utf-8") as f:
                        dados = json.load(f)
                        for d in dados:
                            if d.get("preco") and d.get("preco") > 0:
                                d["supermercado"] = rede
                                d["filiais_ids"] = filiais_ids
                                itens.append(d)
                except Exception:
                    pass

        # 2. Executa coleta via Playwright se tiver menos de 40
        if len(itens) < 40:
            try:
                from scraper_playwright_fort import ScraperPlaywrightFort
                scraper = ScraperPlaywrightFort(headless=True, timeout_ms=25000)
                novos = scraper.coletar(limite_produtos=META_POR_REDE)
                for n in novos:
                    n["supermercado"] = rede
                    n["filiais_ids"] = filiais_ids
                    itens.append(n)
            except Exception as e:
                print(f"[Aviso] Playwright Fort erro: {e}", flush=True)

        print(f"[Fort Atacadista] Total coletado: {len(itens)} produtos.", flush=True)
        return itens

    # --------------------------------------------------------------------------
    # 7. ASUN SUPERMERCADOS (OSuper / Playwright Cache)
    # --------------------------------------------------------------------------
    def coletar_asun(self) -> List[Dict[str, Any]]:
        print("\n" + "=" * 50, flush=True)
        print(">>> 7/8 INICIANDO COLETA: ASUN SUPERMERCADOS", flush=True)
        print("=" * 50, flush=True)
        rede = "Asun Supermercados"
        itens = []
        filiais_ids = self.ids_filiais(rede)

        # Carrega itens do scraper Asun oficial do projeto
        for arq_caminho in [
            DIR_SAIDA / "coleta_asun_supermercados.json",
            DIRETORIO_SCRIPTS.parent / "scraper" / "produtos_coletados.json",
            DIRETORIO_SCRIPTS.parent / "scraper" / "saida" / "cesta_candidatos.json"
        ]:
            if arq_caminho.exists():
                try:
                    with open(arq_caminho, "r", encoding="utf-8") as f:
                        dados = json.load(f)
                        if isinstance(dados, list):
                            for d in dados:
                                if "asun" in str(d.get("supermercado", "")).lower() or "asun" in str(d.get("url_produto", "")).lower():
                                    preco = float(d.get("preco") or 0.0)
                                    if preco > 0 and len(itens) < META_POR_REDE:
                                        d["supermercado"] = rede
                                        d["filiais_ids"] = filiais_ids
                                        itens.append(d)
                except Exception:
                    pass

        print(f"[Asun Supermercados] Total coletado: {len(itens)} produtos.", flush=True)
        return itens

    # --------------------------------------------------------------------------
    # 8. CARREFOUR MERCADO (Playwright Headless com Sessão)
    # --------------------------------------------------------------------------
    def coletar_carrefour(self) -> List[Dict[str, Any]]:
        print("\n" + "=" * 50, flush=True)
        print(">>> 8/8 INICIANDO COLETA: CARREFOUR MERCADO", flush=True)
        print("=" * 50, flush=True)
        rede = "Carrefour Mercado"
        itens = []
        filiais_ids = self.ids_filiais(rede)

        for arq_caminho in [
            DIR_SAIDA / "coleta_carrefour_mercado.json",
            DIR_SAIDA / "produtos_coletados_mercado.json"
        ]:
            if arq_caminho.exists():
                try:
                    with open(arq_caminho, "r", encoding="utf-8") as f:
                        dados = json.load(f)
                        for d in dados:
                            if d.get("preco") and d.get("preco") > 0:
                                d["supermercado"] = rede
                                d["filiais_ids"] = filiais_ids
                                itens.append(d)
                except Exception:
                    pass

        if len(itens) < 40:
            try:
                from scraper_playwright_mercado import ScraperPlaywrightMercado
                scraper = ScraperPlaywrightMercado(headless=True, timeout_ms=30000)
                novos = scraper.coletar(limite_produtos=META_POR_REDE)
                for n in novos:
                    n["supermercado"] = rede
                    n["filiais_ids"] = filiais_ids
                    itens.append(n)
            except Exception as e:
                print(f"[Aviso] Playwright Carrefour erro: {e}", flush=True)

        print(f"[Carrefour Mercado] Total coletado: {len(itens)} produtos.", flush=True)
        return itens

    # --------------------------------------------------------------------------
    # EXECUÇÃO DO PIPELINE
    # --------------------------------------------------------------------------
    def executar(self) -> Dict[str, Any]:
        print("\n==================================================================", flush=True)
        print("INICIANDO ORQUESTRADOR DE COLETA MASSIVA SMARTMARKET (8 REDES RS)", flush=True)
        print(f"Meta: {META_POR_REDE} produtos por rede em 16 categorias essenciais", flush=True)
        print("==================================================================", flush=True)

        coletores = [
            ("Atacadão", self.coletar_atacadao),
            ("Master Supermercados", self.coletar_master),
            ("Stok Center", self.coletar_stok),
            ("Zaffari / Bourbon", self.coletar_zaffari),
            ("Supermercados Rissul", self.coletar_rissul),
            ("Fort Atacadista", self.coletar_fort),
            ("Asun Supermercados", self.coletar_asun),
            ("Carrefour Mercado", self.coletar_carrefour),
        ]

        todos_itens = []
        resumo_por_rede = {}

        for nome_rede, fn in coletores:
            try:
                prods = fn()
                self.produtos_coletados_por_rede[nome_rede] = prods
                todos_itens.extend(prods)
                resumo_por_rede[nome_rede] = len(prods)

                slug = normalizar_slug(nome_rede)
                arq_rede = DIR_SAIDA / f"coleta_{slug}.json"
                with open(arq_rede, "w", encoding="utf-8") as f:
                    json.dump(prods, f, ensure_ascii=False, indent=2)

            except Exception as e:
                print(f"[ERRO CRÍTICO] Falha na rede {nome_rede}: {e}", flush=True)
                resumo_por_rede[nome_rede] = 0

            time.sleep(1.0)

        with open(ARQUIVO_SAIDA_MASSIVA, "w", encoding="utf-8") as f:
            json.dump(todos_itens, f, ensure_ascii=False, indent=2)

        print("\n" + "=" * 60, flush=True)
        print("COLETA MASSIVA CONCLUÍDA!", flush=True)
        print("=" * 60, flush=True)
        for r, total in resumo_por_rede.items():
            print(f"- {r.ljust(25)}: {total} produtos", flush=True)
        print(f"TOTAL BRUTO COLETADO     : {len(todos_itens)} produtos", flush=True)
        print(f"Arquivo salvo em         : {ARQUIVO_SAIDA_MASSIVA}", flush=True)

        return {
            "resumo_por_rede": resumo_por_rede,
            "total_bruto": len(todos_itens),
            "arquivo_saida": str(ARQUIVO_SAIDA_MASSIVA),
        }


if __name__ == "__main__":
    coletor = ColetorMassivo()
    coletor.executar()
