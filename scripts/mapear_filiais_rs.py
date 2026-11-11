#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartMarket - Mapeamento e Catálogo Georreferenciado de Filiais (RS)
Diretório: scripts/mapear_filiais_rs.py

Estrutura e georreferencia todas as filiais das 8 redes de supermercados
na Região Metropolitana de Porto Alegre e Vale dos Sinos (Cachoeirinha, Gravataí,
Canoas, Porto Alegre, Alvorada, Viamão, Esteio, Sapucaia, São Leopoldo e Novo Hamburgo).
"""

import json
from pathlib import Path

DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
ARQUIVO_CATALOGO = DIRETORIO_SCRIPTS / "catalogo_filiais_rs.json"

CATALOGO_FILIAIS = [
    # -------------------------------------------------------------------------
    # 1. Fort Atacadista
    # -------------------------------------------------------------------------
    {
        "filial_id": "fort_1585",
        "rede_id": 1,
        "rede": "Fort Atacadista",
        "nome_filial": "Fort Atacadista - Canoas / Grande POA",
        "endereco": "Av. Getúlio Vargas, 10597, Mal. Rondon",
        "cidade": "Canoas",
        "uf": "RS",
        "cep_base": "92420-000",
        "latitude": -29.8850,
        "longitude": -51.1710,
        "parametros_scraping": {
            "plataforma": "OSuper",
            "company_id": "334",
            "store_id": "1585",
            "cidades_atendidas": ["Canoas", "Cachoeirinha", "Porto Alegre", "Esteio", "Sapucaia"]
        }
    },
    {
        "filial_id": "fort_1586",
        "rede_id": 1,
        "rede": "Fort Atacadista",
        "nome_filial": "Fort Atacadista - Viamão",
        "endereco": "Rodovia Tapir Rocha (ERS-040), 2750",
        "cidade": "Viamão",
        "uf": "RS",
        "cep_base": "94415-000",
        "latitude": -30.0750,
        "longitude": -51.0340,
        "parametros_scraping": {
            "plataforma": "OSuper",
            "company_id": "334",
            "store_id": "1586",
            "cidades_atendidas": ["Viamão", "Alvorada", "Porto Alegre Leste"]
        }
    },

    # -------------------------------------------------------------------------
    # 2. Atacadão
    # -------------------------------------------------------------------------
    {
        "filial_id": "atacadao_740",
        "rede_id": 4,
        "rede": "Atacadão",
        "nome_filial": "Atacadão - Cachoeirinha",
        "endereco": "Av. Frederico Augusto Ritter, 200, Industrial",
        "cidade": "Cachoeirinha",
        "uf": "RS",
        "cep_base": "94930-000",
        "latitude": -29.9468,
        "longitude": -51.1070,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "seller_id": "atacadaobr740",
            "region_id": "v2.528E4DC08EDA4F5F21C058A921F527DF",
            "cidades_atendidas": ["Cachoeirinha", "Gravataí", "Alvorada", "Canoas"]
        }
    },
    {
        "filial_id": "atacadao_88",
        "rede_id": 4,
        "rede": "Atacadão",
        "nome_filial": "Atacadão - Porto Alegre Sertório",
        "endereco": "Av. Sertório, 6767, Sarandi",
        "cidade": "Porto Alegre",
        "uf": "RS",
        "cep_base": "91040-621",
        "latitude": -29.9922,
        "longitude": -51.1578,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "seller_id": "atacadaobr88",
            "region_id": "v2.528E4DC08EDA4F5F21C058A921F527DF",
            "cidades_atendidas": ["Porto Alegre", "Canoas"]
        }
    },
    {
        "filial_id": "atacadao_847",
        "rede_id": 4,
        "rede": "Atacadão",
        "nome_filial": "Atacadão - Porto Alegre Humaitá",
        "endereco": "Av. A. J. Renner, 1603, Humaitá",
        "cidade": "Porto Alegre",
        "uf": "RS",
        "cep_base": "90250-000",
        "latitude": -29.9856,
        "longitude": -51.1925,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "seller_id": "atacadaobr847",
            "region_id": "v2.528E4DC08EDA4F5F21C058A921F527DF",
            "cidades_atendidas": ["Porto Alegre", "Canoas"]
        }
    },
    {
        "filial_id": "atacadao_gravatai",
        "rede_id": 4,
        "rede": "Atacadão",
        "nome_filial": "Atacadão - Gravataí",
        "endereco": "Rodovia RS-118, 5500, Neópolis",
        "cidade": "Gravataí",
        "uf": "RS",
        "cep_base": "94180-000",
        "latitude": -29.9230,
        "longitude": -51.0250,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "seller_id": "atacadaobrgravatai",
            "region_id": "v2.528E4DC08EDA4F5F21C058A921F527DF",
            "cidades_atendidas": ["Gravataí", "Cachoeirinha", "Viamão"]
        }
    },

    # -------------------------------------------------------------------------
    # 3. Asun Supermercados
    # -------------------------------------------------------------------------
    {
        "filial_id": "asun_1560",
        "rede_id": 3,
        "rede": "Asun Supermercados",
        "nome_filial": "Asun - Cachoeirinha Centro",
        "endereco": "Av. General Flores da Cunha, 1050, Vila Veranopolis",
        "cidade": "Cachoeirinha",
        "uf": "RS",
        "cep_base": "94910-001",
        "latitude": -29.9490,
        "longitude": -51.1010,
        "parametros_scraping": {
            "plataforma": "OSuper",
            "company_id": "319",
            "store_id": "1560",
            "cidades_atendidas": ["Cachoeirinha", "Gravataí"]
        }
    },
    {
        "filial_id": "asun_1555",
        "rede_id": 3,
        "rede": "Asun Supermercados",
        "nome_filial": "Asun - Gravataí Parada 68",
        "endereco": "Av. Dorival Cândido Luz de Oliveira, 5500",
        "cidade": "Gravataí",
        "uf": "RS",
        "cep_base": "94060-000",
        "latitude": -29.9410,
        "longitude": -51.0420,
        "parametros_scraping": {
            "plataforma": "OSuper",
            "company_id": "319",
            "store_id": "1555",
            "cidades_atendidas": ["Gravataí", "Cachoeirinha"]
        }
    },
    {
        "filial_id": "asun_1540",
        "rede_id": 3,
        "rede": "Asun Supermercados",
        "nome_filial": "Asun - Porto Alegre Cavalhada",
        "endereco": "Av. Cavalhada, 2985, Cavalhada",
        "cidade": "Porto Alegre",
        "uf": "RS",
        "cep_base": "91740-001",
        "latitude": -30.1026,
        "longitude": -51.2312,
        "parametros_scraping": {
            "plataforma": "OSuper",
            "company_id": "319",
            "store_id": "1540",
            "cidades_atendidas": ["Porto Alegre Sul"]
        }
    },
    {
        "filial_id": "asun_1550",
        "rede_id": 3,
        "rede": "Asun Supermercados",
        "nome_filial": "Asun - Alvorada",
        "endereco": "Av. Presidente Getúlio Vargas, 2450",
        "cidade": "Alvorada",
        "uf": "RS",
        "cep_base": "94810-000",
        "latitude": -30.0020,
        "longitude": -51.0820,
        "parametros_scraping": {
            "plataforma": "OSuper",
            "company_id": "319",
            "store_id": "1550",
            "cidades_atendidas": ["Alvorada", "Porto Alegre Leste"]
        }
    },

    # -------------------------------------------------------------------------
    # 4. Carrefour Mercado
    # -------------------------------------------------------------------------
    {
        "filial_id": "carrefour_passo_dareia",
        "rede_id": 2,
        "rede": "Carrefour Mercado",
        "nome_filial": "Carrefour Hipermercado - Passo D'Areia",
        "endereco": "Av. Assis Brasil, 4320, São Sebastião",
        "cidade": "Porto Alegre",
        "uf": "RS",
        "cep_base": "91010-004",
        "latitude": -30.0050,
        "longitude": -51.1550,
        "parametros_scraping": {
            "plataforma": "VTEX/ReactRouter",
            "region_id": "v2.528E4DC08EDA4F5F21C058A921F527DF",
            "cidades_atendidas": ["Porto Alegre", "Alvorada", "Cachoeirinha"]
        }
    },
    {
        "filial_id": "carrefour_partenon",
        "rede_id": 2,
        "rede": "Carrefour Mercado",
        "nome_filial": "Carrefour Hipermercado - Partenon",
        "endereco": "Av. Bento Gonçalves, 5050, Partenon",
        "cidade": "Porto Alegre",
        "uf": "RS",
        "cep_base": "91540-000",
        "latitude": -30.0540,
        "longitude": -51.1820,
        "parametros_scraping": {
            "plataforma": "VTEX/ReactRouter",
            "region_id": "v2.4AA14217697DFF7C87355CAB2FE816D5",
            "cidades_atendidas": ["Porto Alegre Centro/Sul", "Viamão"]
        }
    },
    {
        "filial_id": "carrefour_canoas",
        "rede_id": 2,
        "rede": "Carrefour Mercado",
        "nome_filial": "Carrefour Hipermercado - Canoas",
        "endereco": "Av. Guilherme Schell, 6750, Centro",
        "cidade": "Canoas",
        "uf": "RS",
        "cep_base": "92310-000",
        "latitude": -29.9180,
        "longitude": -51.1850,
        "parametros_scraping": {
            "plataforma": "VTEX/ReactRouter",
            "region_id": "v2.528E4DC08EDA4F5F21C058A921F527DF",
            "cidades_atendidas": ["Canoas", "Esteio", "Cachoeirinha"]
        }
    },

    # -------------------------------------------------------------------------
    # 5. Zaffari / Bourbon
    # -------------------------------------------------------------------------
    {
        "filial_id": "zaffari_bourbon_ipiranga",
        "rede_id": 6,
        "rede": "Zaffari / Bourbon",
        "nome_filial": "Bourbon Hipermercado - Ipiranga",
        "endereco": "Av. Ipiranga, 5200, Jardim Botânico",
        "cidade": "Porto Alegre",
        "uf": "RS",
        "cep_base": "90610-000",
        "latitude": -30.0542,
        "longitude": -51.1825,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "cidades_atendidas": ["Porto Alegre", "Viamão"]
        }
    },
    {
        "filial_id": "zaffari_bourbon_wallig",
        "rede_id": 6,
        "rede": "Zaffari / Bourbon",
        "nome_filial": "Bourbon Hipermercado - Wallig",
        "endereco": "Av. Assis Brasil, 2611, Cristo Redentor",
        "cidade": "Porto Alegre",
        "uf": "RS",
        "cep_base": "91010-000",
        "latitude": -30.0120,
        "longitude": -51.1630,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "cidades_atendidas": ["Porto Alegre Norte", "Alvorada", "Cachoeirinha"]
        }
    },
    {
        "filial_id": "zaffari_canoas",
        "rede_id": 6,
        "rede": "Zaffari / Bourbon",
        "nome_filial": "Zaffari - ParkShopping Canoas",
        "endereco": "Av. Farroupilha, 4545, Mal. Rondon",
        "cidade": "Canoas",
        "uf": "RS",
        "cep_base": "92020-475",
        "latitude": -29.9050,
        "longitude": -51.1680,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "cidades_atendidas": ["Canoas", "Esteio", "Cachoeirinha"]
        }
    },
    {
        "filial_id": "zaffari_gravatai",
        "rede_id": 6,
        "rede": "Zaffari / Bourbon",
        "nome_filial": "Zaffari - Gravataí Centro",
        "endereco": "Rua Anápio Gomes, 1441, Centro",
        "cidade": "Gravataí",
        "uf": "RS",
        "cep_base": "94010-080",
        "latitude": -29.9425,
        "longitude": -50.9915,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "cidades_atendidas": ["Gravataí", "Cachoeirinha"]
        }
    },

    # -------------------------------------------------------------------------
    # 6. Supermercados Rissul
    # -------------------------------------------------------------------------
    {
        "filial_id": "rissul_cachoeirinha",
        "rede_id": 7,
        "rede": "Supermercados Rissul",
        "nome_filial": "Rissul - Cachoeirinha",
        "endereco": "Av. General Flores da Cunha, 4001, Bom Princípio",
        "cidade": "Cachoeirinha",
        "uf": "RS",
        "cep_base": "94950-001",
        "latitude": -29.9380,
        "longitude": -51.0820,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "cidades_atendidas": ["Cachoeirinha", "Gravataí"]
        }
    },
    {
        "filial_id": "rissul_canoas",
        "rede_id": 7,
        "rede": "Supermercados Rissul",
        "nome_filial": "Rissul - Canoas Santos Ferreira",
        "endereco": "Av. Santos Ferreira, 2800, Marechal Rondon",
        "cidade": "Canoas",
        "uf": "RS",
        "cep_base": "92025-000",
        "latitude": -29.9260,
        "longitude": -51.1550,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "cidades_atendidas": ["Canoas", "Esteio"]
        }
    },
    {
        "filial_id": "rissul_gravatai",
        "rede_id": 7,
        "rede": "Supermercados Rissul",
        "nome_filial": "Rissul - Gravataí Parada 79",
        "endereco": "Av. Dorival Cândido Luz de Oliveira, 765",
        "cidade": "Gravataí",
        "uf": "RS",
        "cep_base": "94030-001",
        "latitude": -29.9430,
        "longitude": -51.0650,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "cidades_atendidas": ["Gravataí", "Cachoeirinha"]
        }
    },
    {
        "filial_id": "rissul_sao_leopoldo",
        "rede_id": 7,
        "rede": "Supermercados Rissul",
        "nome_filial": "Rissul - São Leopoldo Feitoria",
        "endereco": "Av. Feitoria, 350, São José",
        "cidade": "São Leopoldo",
        "uf": "RS",
        "cep_base": "93052-000",
        "latitude": -29.7710,
        "longitude": -51.1410,
        "parametros_scraping": {
            "plataforma": "VTEX",
            "cidades_atendidas": ["São Leopoldo", "Sapucaia", "Novo Hamburgo"]
        }
    },

    # -------------------------------------------------------------------------
    # 7. Stok Center
    # -------------------------------------------------------------------------
    {
        "filial_id": "stok_canoas",
        "rede_id": 8,
        "rede": "Stok Center",
        "nome_filial": "Stok Center - Canoas",
        "endereco": "Av. Getúlio Vargas, 6110, Centro",
        "cidade": "Canoas",
        "uf": "RS",
        "cep_base": "92010-011",
        "latitude": -29.9140,
        "longitude": -51.1750,
        "parametros_scraping": {
            "plataforma": "VipCommerce",
            "org_id": "130",
            "filial_id": "1",
            "cidades_atendidas": ["Canoas", "Porto Alegre", "Cachoeirinha", "Esteio"]
        }
    },
    {
        "filial_id": "stok_alvorada",
        "rede_id": 8,
        "rede": "Stok Center",
        "nome_filial": "Stok Center - Alvorada",
        "endereco": "Av. Presidente Getúlio Vargas, 4800, Americana",
        "cidade": "Alvorada",
        "uf": "RS",
        "cep_base": "94814-000",
        "latitude": -30.0050,
        "longitude": -51.0710,
        "parametros_scraping": {
            "plataforma": "VipCommerce",
            "org_id": "130",
            "filial_id": "1",
            "cidades_atendidas": ["Alvorada", "Viamão", "Porto Alegre Leste"]
        }
    },
    {
        "filial_id": "stok_gravatai",
        "rede_id": 8,
        "rede": "Stok Center",
        "nome_filial": "Stok Center - Gravataí",
        "endereco": "Rodovia RS-020, 2500, Vera Cruz",
        "cidade": "Gravataí",
        "uf": "RS",
        "cep_base": "94100-250",
        "latitude": -29.9320,
        "longitude": -50.9850,
        "parametros_scraping": {
            "plataforma": "VipCommerce",
            "org_id": "130",
            "filial_id": "1",
            "cidades_atendidas": ["Gravataí", "Cachoeirinha"]
        }
    },

    # -------------------------------------------------------------------------
    # 8. Master Supermercados
    # -------------------------------------------------------------------------
    {
        "filial_id": "master_shopping_total",
        "rede_id": 5,
        "rede": "Master Supermercados",
        "nome_filial": "Master Supermercados - Shopping Total",
        "endereco": "Av. Cristóvão Colombo, 545, Floresta",
        "cidade": "Porto Alegre",
        "uf": "RS",
        "cep_base": "90560-003",
        "latitude": -30.0255,
        "longitude": -51.2120,
        "parametros_scraping": {
            "plataforma": "VipCommerce",
            "org_id": "193",
            "filial_id": "1",
            "cidades_atendidas": ["Porto Alegre Centro/Norte", "Canoas"]
        }
    },
    {
        "filial_id": "master_centro",
        "rede_id": 5,
        "rede": "Master Supermercados",
        "nome_filial": "Master Supermercados - Centro Histórico",
        "endereco": "Av. Borges de Medeiros, 720, Centro Histórico",
        "cidade": "Porto Alegre",
        "uf": "RS",
        "cep_base": "90020-020",
        "latitude": -30.0330,
        "longitude": -51.2280,
        "parametros_scraping": {
            "plataforma": "VipCommerce",
            "org_id": "193",
            "filial_id": "1",
            "cidades_atendidas": ["Porto Alegre Centro"]
        }
    }
]


def gerar_catalogo():
    with open(ARQUIVO_CATALOGO, "w", encoding="utf-8") as f:
        json.dump(CATALOGO_FILIAIS, f, indent=2, ensure_ascii=False)

    print(f"[OK] Catálogo georreferenciado gerado com {len(CATALOGO_FILIAIS)} filiais do RS.")
    print(f"Salvo em: {ARQUIVO_CATALOGO}")


if __name__ == "__main__":
    gerar_catalogo()

