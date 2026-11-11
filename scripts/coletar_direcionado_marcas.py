#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartMarket - Coleta Direcionada por Top Marcas e Termos de Alta Interseção
Diretório: scripts/coletar_direcionado_marcas.py

Realiza consultas rápidas nas APIs VTEX, VipCommerce e OSuper focando
nos produtos líderes de venda no RS para garantir máxima sobreposição entre redes.
"""

import os
import sys
import time
import json
import urllib.parse
from pathlib import Path
from datetime import datetime, timezone
import requests

DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
DIR_SAIDA = DIRETORIO_SCRIPTS / "saida"
ARQUIVO_CATALOGO_FILIAIS = DIRETORIO_SCRIPTS / "catalogo_filiais_rs.json"
ARQUIVO_SAIDA_DIRECIONADA = DIR_SAIDA / "coleta_marcas_direcionada.json"

HEADERS_BASE = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}

TERMOS_DIRECIONADOS = [
    # Grãos e Básicos
    "arroz tio joao", "arroz camil", "arroz blue ville", "arroz prato fino",
    "feijao tio joao", "feijao camil", "feijao caldo de ouro", "feijao arbaza",
    # Cafés
    "cafe melitta", "cafe 3 coracoes", "cafe pilao", "cafe nescafe",
    # Laticínios
    "leite elege", "leite tirol", "leite italac", "leite pia", "manteiga elege", "leite moca",
    # Óleos e Gorduras
    "oleo soya", "oleo liza", "oleo concordia",
    # Açúcar e Farinhas
    "acucar uniao", "acucar da barra", "acucar caravelas", "farinha orquidea", "farinha dona benta",
    # Massas
    "macarrao isabela", "macarrao renata", "macarrao barilla",
    # Bebidas
    "coca cola", "guarana antarctica", "refrigerante fruki", "cerveja polar", "cerveja brahma", "cerveja heineken",
    # Limpeza e Higiene
    "sabao omo", "sabao tixan", "sabao brilhante", "detergente ype", "papel neve", "papel personal"
]


def agora_utc():
    return datetime.now(timezone.utc).isoformat()


def carregar_filiais_catalogo():
    if not ARQUIVO_CATALOGO_FILIAIS.exists():
        return {}
    with open(ARQUIVO_CATALOGO_FILIAIS, "r", encoding="utf-8") as f:
        filiais = json.load(f)
    por_rede = {}
    for fil in filiais:
        r = fil["rede"]
        if r not in por_rede:
            por_rede[r] = []
        por_rede[r].append(fil["filial_id"])
    return por_rede


class ColetorDirecionadoMarcas:
    def __init__(self):
        self.filiais_map = carregar_filiais_catalogo()
        self.todos_produtos = []
        self.total_por_rede = {}

    def ids_filiais(self, rede: str):
        return self.filiais_map.get(rede, [f"{rede.lower()}_default"])

    def coletar_vtex(self, nome_rede: str, dominio_vtex: str):
        print(f"\n[VTEX] Coletando marcas em {nome_rede} ({dominio_vtex})...", flush=True)
        itens = []
        ids_vistos = set()
        filiais_ids = self.ids_filiais(nome_rede)

        for termo in TERMOS_DIRECIONADOS:
            try:
                url = f"https://{dominio_vtex}/api/catalog_system/pub/products/search/{urllib.parse.quote(termo)}?_from=0&_to=6"
                resp = requests.get(url, headers=HEADERS_BASE, timeout=10)
                if resp.status_code in (200, 206):
                    prods = resp.json()
                    if isinstance(prods, list):
                        for p in prods:
                            pid = str(p.get("productId") or "")
                            if pid in ids_vistos:
                                continue
                            items_vtex = p.get("items", [])
                            if not items_vtex:
                                continue
                            nome = p.get("productName", "").strip()
                            seller = items_vtex[0].get("sellers", [{}])[0]
                            comm = seller.get("commertialOffer", {})
                            preco = float(comm.get("Price") or 0.0)
                            preco_list = float(comm.get("ListPrice") or preco)
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
                                    "categoria": "Mercearia",
                                    "supermercado": nome_rede,
                                    "imagem_url": img_url,
                                    "codigo_barras": ean,
                                    "filiais_ids": filiais_ids,
                                    "data_coleta": agora_utc(),
                                })
                time.sleep(0.5)
            except Exception as e:
                pass

        print(f"[{nome_rede}] Coletados {len(itens)} itens direcionados.", flush=True)
        self.todos_produtos.extend(itens)
        self.total_por_rede[nome_rede] = len(itens)

    def coletar_vipcommerce(self, nome_rede: str, domain_key: str, org_id: str, bearer: str):
        print(f"\n[VipCommerce] Coletando marcas em {nome_rede}...", flush=True)
        itens = []
        ids_vistos = set()
        filiais_ids = self.ids_filiais(nome_rede)

        headers = {
            **HEADERS_BASE,
            "DomainKey": domain_key,
            "OrganizationId": org_id,
            "Authorization": f"Bearer {bearer}",
            "Origin": f"https://www.{domain_key}.com.br",
            "Referer": f"https://www.{domain_key}.com.br/",
        }

        for termo in TERMOS_DIRECIONADOS:
            try:
                url = f"https://api.vipcommerce.com.br/v4/products/search?term={urllib.parse.quote(termo)}&page=1&limit=6"
                resp = requests.get(url, headers=headers, timeout=10)
                if resp.status_code == 200:
                    dados = resp.json().get("data", {})
                    prods = dados.get("items", []) if isinstance(dados, dict) else (dados if isinstance(dados, list) else [])
                    for p in prods:
                        pid = str(p.get("id") or p.get("productId") or "")
                        if pid in ids_vistos:
                            continue
                        nome = p.get("name") or p.get("title") or ""
                        preco = float(p.get("price") or p.get("salePrice") or 0.0)
                        if preco > 0 and nome:
                            ids_vistos.add(pid)
                            imagens = p.get("images", [])
                            img_url = imagens[0] if isinstance(imagens, list) and imagens else None
                            ean = p.get("ean") or p.get("barcode")
                            itens.append({
                                "id_produto_origem": pid,
                                "nome_bruto": nome,
                                "preco": preco,
                                "preco_normal": float(p.get("regularPrice") or preco),
                                "em_promocao": bool(p.get("promotional")),
                                "marca": p.get("brand", {}).get("name") if isinstance(p.get("brand"), dict) else str(p.get("brand") or ""),
                                "categoria": "Mercearia",
                                "supermercado": nome_rede,
                                "imagem_url": img_url,
                                "codigo_barras": ean,
                                "filiais_ids": filiais_ids,
                                "data_coleta": agora_utc(),
                            })
                time.sleep(0.5)
            except Exception as e:
                pass

        print(f"[{nome_rede}] Coletados {len(itens)} itens direcionados.", flush=True)
        self.todos_produtos.extend(itens)
        self.total_por_rede[nome_rede] = len(itens)

    def executar(self):
        # 1. Atacadão
        self.coletar_vtex("Atacadão", "www.atacadao.com.br")

        # 2. Zaffari / Bourbon
        self.coletar_vtex("Zaffari / Bourbon", "www.zaffari.com.br")

        # 3. Supermercados Rissul
        self.coletar_vtex("Supermercados Rissul", "www.rissul.com.br")

        # 4. Master Supermercados
        self.coletar_vipcommerce(
            "Master Supermercados",
            "mastersupermercados",
            "1004",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.tK1h_k0v4X8jX7P-Y4j0k"
        )

        # 5. Stok Center
        self.coletar_vipcommerce(
            "Stok Center",
            "stokcenter",
            "2002",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.stok_center_token"
        )

        print("\n" + "=" * 60)
        print("COLETA DIRECIONADA CONCLUÍDA!")
        print("=" * 60)
        for r, total in self.total_por_rede.items():
            print(f"- {r.ljust(25)}: {total} itens")
        print(f"TOTAL DIRECIONADO COLETADO: {len(self.todos_produtos)} itens")

        DIR_SAIDA.mkdir(parents=True, exist_ok=True)
        with open(ARQUIVO_SAIDA_DIRECIONADA, "w", encoding="utf-8") as f:
            json.dump(self.todos_produtos, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    c = ColetorDirecionadoMarcas()
    c.executar()

