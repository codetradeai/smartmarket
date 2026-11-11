import os
import sys
import time
import json
import uuid
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
    "arroz tio joao", "arroz camil", "arroz blue ville", "arroz prato fino",
    "feijao tio joao", "feijao camil", "feijao caldo de ouro", "feijao arbaza",
    "cafe melitta", "cafe 3 coracoes", "cafe pilao", "cafe nescafe",
    "leite elege", "leite tirol", "leite italac", "leite pia", "manteiga elege", "leite moca",
    "oleo soya", "oleo liza", "oleo concordia",
    "acucar uniao", "acucar da barra", "acucar caravelas", "farinha orquidea", "farinha dona benta",
    "macarrao isabela", "macarrao renata", "macarrao barilla",
    "coca cola", "guarana antarctica", "refrigerante fruki", "cerveja polar", "cerveja brahma", "cerveja heineken",
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


class ColetorVipCommerceMarcas:
    def __init__(self):
        self.filiais_map = carregar_filiais_catalogo()
        self.novos = []

    def coletar_master(self):
        rede = "Master Supermercados"
        print(f"\n[VipCommerce] Coletando marcas em {rede}...", flush=True)
        filiais_ids = self.filiais_map.get(rede, ["master_default"])
        ids_vistos = set()
        itens = []

        try:
            hdrs = {
                **HEADERS_BASE,
                "DomainKey": "mastersupermercados.com.br",
                "OrganizationId": "193",
                "Origin": "https://mastersupermercados.com.br",
                "Referer": "https://mastersupermercados.com.br/",
            }
            url_auth = "https://services.vipcommerce.com.br/api-admin/v1/org/193/auth/loja/login"
            payload = {
                "domain": "mastersupermercados.com.br",
                "username": "loja",
                "key": "2919013e840d024694602f7413d08f0269ff22490ac9a2c3cf8527a4d3345155",
            }
            r_auth = requests.post(url_auth, json=payload, headers=hdrs, timeout=12)
            token = r_auth.json().get("data")
            if not token:
                print("[Erro] Token Master não obtido.", flush=True)
                return
            hdrs["Authorization"] = f"Bearer {token}"

            for termo in TERMOS_DIRECIONADOS:
                try:
                    session_id = str(uuid.uuid4())
                    url_busca = f"https://services.vipcommerce.com.br/api-admin/v1/org/193/filial/1/centro_distribuicao/1/loja/buscas/produtos/termo/{urllib.parse.quote(termo)}?page=1&session={session_id}"
                    resp = requests.get(url_busca, headers=hdrs, timeout=10)
                    if resp.status_code == 200:
                        prods = resp.json().get("data", {}).get("produtos", [])
                        for p in prods:
                            pid = str(p.get("id") or "")
                            if pid in ids_vistos:
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
                                    "categoria": "Mercearia",
                                    "supermercado": rede,
                                    "imagem_url": img_url,
                                    "codigo_barras": p.get("codigo_barras"),
                                    "filiais_ids": filiais_ids,
                                    "data_coleta": agora_utc(),
                                })
                    time.sleep(0.4)
                except Exception:
                    pass

        except Exception as e:
            print(f"[Erro Master] {e}", flush=True)

        print(f"[Master Supermercados] Coletados {len(itens)} itens direcionados.", flush=True)
        self.novos.extend(itens)

    def coletar_stok(self):
        rede = "Stok Center"
        print(f"\n[VipCommerce] Coletando marcas em {rede}...", flush=True)
        filiais_ids = self.filiais_map.get(rede, ["stok_default"])
        ids_vistos = set()
        itens = []

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
                return
            hdrs["Authorization"] = f"Bearer {token}"

            for termo in TERMOS_DIRECIONADOS:
                try:
                    session_id = str(uuid.uuid4())
                    url_busca = f"https://services.vipcommerce.com.br/api-admin/v1/org/130/filial/1/centro_distribuicao/1/loja/buscas/produtos/termo/{urllib.parse.quote(termo)}?page=1&session={session_id}"
                    resp = requests.get(url_busca, headers=hdrs, timeout=10)
                    if resp.status_code == 200:
                        prods = resp.json().get("data", {}).get("produtos", [])
                        for p in prods:
                            pid = str(p.get("id") or "")
                            if pid in ids_vistos:
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
                                    "categoria": "Mercearia",
                                    "supermercado": rede,
                                    "imagem_url": img_url,
                                    "codigo_barras": p.get("codigo_barras"),
                                    "filiais_ids": filiais_ids,
                                    "data_coleta": agora_utc(),
                                })
                    time.sleep(0.4)
                except Exception:
                    pass

        except Exception as e:
            print(f"[Erro Stok] {e}", flush=True)

        print(f"[Stok Center] Coletados {len(itens)} itens direcionados.", flush=True)
        self.novos.extend(itens)

    def salvar(self):
        # Carrega o que já coletou na vtex e junta com vipcommerce
        atuais = []
        if ARQUIVO_SAIDA_DIRECIONADA.exists():
            with open(ARQUIVO_SAIDA_DIRECIONADA, "r", encoding="utf-8") as f:
                atuais = json.load(f)

        atuais.extend(self.novos)
        with open(ARQUIVO_SAIDA_DIRECIONADA, "w", encoding="utf-8") as f:
            json.dump(atuais, f, ensure_ascii=False, indent=2)
        print(f"\n[Arquivo Final] Salvo com {len(atuais)} produtos direcionados em {ARQUIVO_SAIDA_DIRECIONADA}")


if __name__ == "__main__":
    c = ColetorVipCommerceMarcas()
    c.coletar_master()
    c.coletar_stok()
    c.salvar()

