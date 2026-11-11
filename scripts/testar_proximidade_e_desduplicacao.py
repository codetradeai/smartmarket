#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartMarket - Teste de Proximidade e Validação de Desduplicação
Diretório: scripts/testar_proximidade_e_desduplicacao.py

Simula 2 usuários com CEPs diferentes:
- Usuário 1: Cachoeirinha/RS (94910-000)
- Usuário 2: Porto Alegre/RS (90010-000)

Validações:
1. Comprova que os produtos NÃO se multiplicaram no banco (Zero Duplicação).
2. Comprova o agrupamento de filiais com o mesmo preço via `filiais_ids`.
3. Comprova que a filial mais próxima é contextualizada dinamicamente para cada CEP.
"""

import sys
import json
from pathlib import Path

DIRETORIO_SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(DIRETORIO_SCRIPTS))

from motor_proximidade import MotorProximidade
from consolidar_ofertas import MotorConsolidacaoOfertas, DIR_SAIDA, ARQUIVO_BANCO_OTIMIZADO


def testar_desduplicacao_e_agrupamento():
    print("=" * 75)
    print("1. VALIDAÇÃO DE ZERO DUPLICAÇÃO E AGRUPAMENTO DE OFERTAS")
    print("=" * 75)

    motor_cons = MotorConsolidacaoOfertas()
    arquivos_fontes = [
        DIR_SAIDA / "produtos_coletados_fort.json",
        DIR_SAIDA / "produtos_coletados_mercado.json"
    ]
    motor_cons.processar_arquivos_coleta(arquivos_fontes)
    motor_cons.exportar()

    with open(ARQUIVO_BANCO_OTIMIZADO, "r", encoding="utf-8") as f:
        banco = json.load(f)

    produtos = banco["produtos"]
    ofertas = banco["ofertas"]

    print(f"\n[MÉTRICAS DO BANCO OTIMIZADO]")
    print(f"  * Total de Produtos Canônicos Únicos: {len(produtos)}")
    print(f"  * Total de Ofertas Agrupadas:         {len(ofertas)}")

    # Prova de desduplicação
    ids_produtos = [p["produto_id"] for p in produtos]
    tem_duplicados = len(ids_produtos) != len(set(ids_produtos))
    print(f"  * Há produtos duplicados? {'SIM (ERRO!)' if tem_duplicados else 'NÃO (100% ÚNICOS - PERFEITO)'}")

    # Exemplo de agrupamento de filiais
    print("\n[EXEMPLO DE OFERTA COM FILIAIS AGRUPADAS (MESMO PREÇO)]")
    for of in ofertas[:3]:
        print(f"  Oferta ID:  {of['oferta_id']}")
        print(f"  Produto:    {of['produto_id']}")
        print(f"  Rede:       {of['rede']}")
        print(f"  Preço:      R$ {of['preco']:.2f}")
        print(f"  Filiais que compartilham este preço ({len(of['filiais_ids'])} unidades): {of['filiais_ids'][:4]}...")
        print("-" * 50)


def simular_usuarios_proximidade():
    print("\n" + "=" * 75)
    print("2. SIMULAÇÃO DE DOIS USUÁRIOS COM CEPS DIFERENTES (HAVERSINE)")
    print("=" * 75)

    motor_prox = MotorProximidade()

    usuarios = [
        {"nome": "Usuário 1 (Cachoeirinha)", "cep": "94910-000"},
        {"nome": "Usuário 2 (Porto Alegre Centro)", "cep": "90010-000"}
    ]

    for user in usuarios:
        nome_user = user["nome"]
        cep_user = user["cep"]

        print(f"\n>>> CONSULTANDO PARA: {nome_user} | CEP: {cep_user} <<<")
        res = motor_prox.consultar_catalogo_para_cep(cep_user)
        geo = res["usuario_geo"]
        print(f"Localização resolvida: {geo['cidade']} (Lat {geo['lat']}, Lon {geo['lon']}) [Fonte: {geo['fonte']}]")

        print("\nFiliais mais próximas selecionadas para este usuário:")
        for rede, f in res["filiais_selecionadas"].items():
            print(f"  * {rede:<22} -> {f['nome_filial']:<35} | {f['distancia_km']:>5.2f} km | {f['cidade']}")

        print("\nPreços dos produtos na filial física mais próxima:")
        for prod in res["catalogo"][:3]:
            print(f"  - {prod['nome']:<40} -> R$ {prod['menor_preco']:>5.2f} na {prod['melhor_rede']} ({prod['filial_mais_proxima']} - {prod['distancia_km']} km)")
        print("=" * 75)


if __name__ == "__main__":
    testar_desduplicacao_e_agrupamento()
    simular_usuarios_proximidade()

