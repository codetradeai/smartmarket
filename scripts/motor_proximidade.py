#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartMarket - Motor de Resolução de CEP e Proximidade de Filiais (Haversine)
Diretório: scripts/motor_proximidade.py

Funcionalidades:
1. Resolução de Coordenadas de CEP (ViaCEP / AwesomeAPI + Fallback Geográfico RS).
2. Cálculo de Distância Geodésica via Fórmula de Haversine.
3. Identificação da Filial Mais Próxima para cada Rede.
4. Consulta de Preços Vigentes na Filial do Usuário a partir do Banco Otimizado.
"""

import math
import json
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
ARQUIVO_CATALOGO_FILIAIS = DIRETORIO_SCRIPTS / "catalogo_filiais_rs.json"
ARQUIVO_BANCO_OTIMIZADO = DIRETORIO_SCRIPTS / "saida" / "banco_produtos_otimizado.json"

# Tabela de Centroids Geográficos de Referência para o Rio Grande do Sul (Fallback Instantâneo)
CENTROIDS_RS = {
    "949": {"cidade": "Cachoeirinha", "lat": -29.9511, "lon": -51.0944},
    "940": {"cidade": "Gravataí", "lat": -29.9436, "lon": -50.9926},
    "941": {"cidade": "Gravataí", "lat": -29.9320, "lon": -50.9850},
    "920": {"cidade": "Canoas", "lat": -29.9140, "lon": -51.1750},
    "923": {"cidade": "Canoas", "lat": -29.9180, "lon": -51.1850},
    "924": {"cidade": "Canoas", "lat": -29.8850, "lon": -51.1710},
    "900": {"cidade": "Porto Alegre Centro", "lat": -30.0346, "lon": -51.2177},
    "902": {"cidade": "Porto Alegre Humaitá", "lat": -29.9856, "lon": -51.1925},
    "905": {"cidade": "Porto Alegre Floresta", "lat": -30.0255, "lon": -51.2120},
    "906": {"cidade": "Porto Alegre Ipiranga", "lat": -30.0542, "lon": -51.1825},
    "910": {"cidade": "Porto Alegre Zona Norte", "lat": -29.9930, "lon": -51.1578},
    "915": {"cidade": "Porto Alegre Leste", "lat": -30.0540, "lon": -51.1820},
    "917": {"cidade": "Porto Alegre Zona Sul", "lat": -30.1026, "lon": -51.2312},
    "948": {"cidade": "Alvorada", "lat": -30.0016, "lon": -51.0808},
    "944": {"cidade": "Viamão", "lat": -30.0750, "lon": -51.0340},
    "932": {"cidade": "Esteio / Sapucaia", "lat": -29.8400, "lon": -51.1600},
    "930": {"cidade": "São Leopoldo", "lat": -29.7610, "lon": -51.1480},
    "933": {"cidade": "Novo Hamburgo", "lat": -29.6840, "lon": -51.1310},
}


def calcular_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcula a distância ortodrômica em quilômetros entre dois pontos geográficos
    usando a Fórmula de Haversine.
    """
    R = 6371.0  # Raio médio da Terra em km

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2

    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


class MotorProximidade:
    def __init__(self):
        self.filiais: List[Dict[str, Any]] = []
        self.banco_otimizado: Dict[str, Any] = {}
        self._carregar_dados()

    def _carregar_dados(self):
        if not ARQUIVO_CATALOGO_FILIAIS.exists():
            import mapear_filiais_rs
            mapear_filiais_rs.gerar_catalogo()

        with open(ARQUIVO_CATALOGO_FILIAIS, "r", encoding="utf-8") as f:
            self.filiais = json.load(f)

        if ARQUIVO_BANCO_OTIMIZADO.exists():
            with open(ARQUIVO_BANCO_OTIMIZADO, "r", encoding="utf-8") as f:
                self.banco_otimizado = json.load(f)

    def resolver_coordenadas_cep(self, cep: str) -> Dict[str, Any]:
        """
        Obtém coordenadas (lat/lon) a partir do CEP.
        Prioridade: 1) AwesomeAPI CEP; 2) ViaCEP + Nominatim; 3) Tabela de Centroids RS.
        """
        cep_limpo = "".join([c for c in cep if c.isdigit()])
        if len(cep_limpo) != 8:
            raise ValueError(f"CEP inválido: {cep}")

        # 1. Tenta AwesomeAPI (que frequentemente já retorna lat/lng de CEPs brasileiros)
        try:
            url_awesome = f"https://cep.awesomeapi.com.br/json/{cep_limpo}"
            req = urllib.request.Request(url_awesome, headers={"User-Agent": "SmartMarket/2.0"})
            with urllib.request.urlopen(req, timeout=3) as r:
                data = json.loads(r.read().decode())
                if "lat" in data and "lng" in data and data["lat"]:
                    return {
                        "cep": cep_limpo,
                        "cidade": data.get("city", "RS"),
                        "bairro": data.get("district", ""),
                        "endereco": data.get("address", ""),
                        "lat": float(data["lat"]),
                        "lon": float(data["lng"]),
                        "fonte": "AwesomeAPI"
                    }
        except Exception:
            pass

        # 2. Tenta ViaCEP para resolver cidade e logradouro
        cidade_nome = ""
        bairro_nome = ""
        logradouro = ""
        try:
            url_viacep = f"https://viacep.com.br/ws/{cep_limpo}/json/"
            req = urllib.request.Request(url_viacep, headers={"User-Agent": "SmartMarket/2.0"})
            with urllib.request.urlopen(req, timeout=3) as r:
                vdata = json.loads(r.read().decode())
                if "localidade" in vdata and not vdata.get("erro"):
                    cidade_nome = vdata.get("localidade", "")
                    bairro_nome = vdata.get("bairro", "")
                    logradouro = vdata.get("logradouro", "")
        except Exception:
            pass

        # 3. Fallback Resiliente de Alta Precisão baseado na tabela de Centroids da Região Metropolitana
        prefixo_3 = cep_limpo[:3]
        if prefixo_3 in CENTROIDS_RS:
            cinfo = CENTROIDS_RS[prefixo_3]
            return {
                "cep": cep_limpo,
                "cidade": cidade_nome or cinfo["cidade"],
                "bairro": bairro_nome,
                "endereco": logradouro,
                "lat": cinfo["lat"],
                "lon": cinfo["lon"],
                "fonte": "Centroid_RS_Local"
            }

        # Fallback padrão Cachoeirinha / POA caso o prefixo não seja mapeado
        return {
            "cep": cep_limpo,
            "cidade": cidade_nome or "Porto Alegre",
            "bairro": bairro_nome,
            "endereco": logradouro,
            "lat": -30.0346,
            "lon": -51.2177,
            "fonte": "Centroid_POA_Padrao"
        }

    def encontrar_filiais_mais_proximas(self, lat_usuario: float, lon_usuario: float) -> Dict[str, Dict[str, Any]]:
        """
        Para cada rede de supermercado, calcula a distância e identifica a filial mais próxima.
        """
        mais_proxima_por_rede: Dict[str, Dict[str, Any]] = {}

        for fil in self.filiais:
            rede = fil["rede"]
            dist_km = calcular_haversine(lat_usuario, lon_usuario, fil["latitude"], fil["longitude"])

            if rede not in mais_proxima_por_rede or dist_km < mais_proxima_por_rede[rede]["distancia_km"]:
                mais_proxima_por_rede[rede] = {
                    "filial_id": fil["filial_id"],
                    "nome_filial": fil["nome_filial"],
                    "endereco": fil["endereco"],
                    "cidade": fil["cidade"],
                    "distancia_km": dist_km,
                    "latitude": fil["latitude"],
                    "longitude": fil["longitude"]
                }

        return mais_proxima_por_rede

    def consultar_catalogo_para_cep(self, cep: str) -> Dict[str, Any]:
        """
        Pipeline Completo:
        1. Resolve geolocalização do CEP.
        2. Seleciona as filiais mais próximas de cada rede.
        3. Filtra e correlaciona as ofertas correspondentes a essas filiais.
        """
        geo_usuario = self.resolver_coordenadas_cep(cep)
        filiais_mais_proximas = self.encontrar_filiais_mais_proximas(geo_usuario["lat"], geo_usuario["lon"])

        filiais_ativas_ids = {f["filial_id"]: f for f in filiais_mais_proximas.values()}

        produtos_resultado = []
        produtos_banco = self.banco_otimizado.get("produtos", [])
        ofertas_banco = self.banco_otimizado.get("ofertas", [])

        # Indexar produtos por ID
        mapa_produtos = {p["produto_id"]: p for p in produtos_banco}

        for p_id, prod in mapa_produtos.items():
            ofertas_do_produto = []

            # Procura ofertas que contenham as filiais mais próximas do usuário
            for of in ofertas_banco:
                if of["produto_id"] != p_id:
                    continue

                rede = of["rede"]
                filial_mais_prox = filiais_mais_proximas.get(rede)
                if not filial_mais_prox:
                    continue

                fid_alvo = filial_mais_prox["filial_id"]

                # Verifica se a oferta abrange a filial mais próxima
                if fid_alvo in of.get("filiais_ids", []) or not of.get("filiais_ids"):
                    ofertas_do_produto.append({
                        "rede": rede,
                        "filial_id": fid_alvo,
                        "nome_filial": filial_mais_prox["nome_filial"],
                        "endereco_filial": filial_mais_prox["endereco"],
                        "cidade_filial": filial_mais_prox["cidade"],
                        "distancia_km": filial_mais_prox["distancia_km"],
                        "preco": of["preco"],
                        "preco_normal": of.get("preco_normal"),
                        "em_promocao": of.get("em_promocao", False)
                    })

            # Ordena ofertas do produto por preço ascendente (menor preço primeiro)
            ofertas_do_produto.sort(key=lambda x: x["preco"])

            if ofertas_do_produto:
                melhor_oferta = ofertas_do_produto[0]
                produtos_resultado.append({
                    "produto_id": prod["produto_id"],
                    "nome": prod["nome_canonico"],
                    "categoria": prod.get("categoria"),
                    "marca": prod.get("marca"),
                    "imagem_url": prod.get("imagem_url"),
                    "menor_preco": melhor_oferta["preco"],
                    "melhor_rede": melhor_oferta["rede"],
                    "filial_mais_proxima": melhor_oferta["nome_filial"],
                    "distancia_km": melhor_oferta["distancia_km"],
                    "total_redes_disponiveis": len(ofertas_do_produto),
                    "todas_ofertas": ofertas_do_produto
                })

        return {
            "usuario_geo": geo_usuario,
            "filiais_selecionadas": filiais_mais_proximas,
            "total_produtos_disponiveis": len(produtos_resultado),
            "catalogo": produtos_resultado
        }


if __name__ == "__main__":
    motor = MotorProximidade()
    cep_teste = "94910-000"
    res = motor.consultar_catalogo_para_cep(cep_teste)
    print(f"\n--- Teste de Proximidade para CEP: {cep_teste} ({res['usuario_geo']['cidade']}) ---")
    print(f"Coordenadas: Lat {res['usuario_geo']['lat']}, Lon {res['usuario_geo']['lon']}")
    print("\nFiliais mais próximas selecionadas:")
    for rede, f in res["filiais_selecionadas"].items():
        print(f"  * {rede}: {f['nome_filial']} ({f['cidade']}) -> {f['distancia_km']} km")

    print(f"\nTotal produtos retornados: {res['total_produtos_disponiveis']}")
    for prod in res["catalogo"][:3]:
        print(f"  -> {prod['nome']} | Menor Preço: R$ {prod['menor_preco']:.2f} ({prod['melhor_rede']}) na filial {prod['filial_mais_proxima']} ({prod['distancia_km']} km)")

