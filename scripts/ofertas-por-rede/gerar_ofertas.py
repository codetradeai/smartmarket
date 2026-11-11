"""Gera o resumo de ofertas por rede usado no card flutuante da segunda dobra (variante "Lente").

Lê o catálogo estático publicado em `frontend/public/catalogo/produtos.*.json` (o mesmo que o app baixa)
e grava `frontend/src/components/ui/ofertasPorRede.json` com, para cada rede, o total de itens e até 3
produtos de destaque. Só usa preços que existem no catálogo, nada é inventado.

Regra de "destaque": primeiro os itens com desconto real (promo e preço abaixo do preço normal), do
maior desconto para o menor; se faltarem, completa com itens de cesta básica (arroz, leite, café, feijão,
açúcar, óleo), na ordem do nome. Sem desconto, o campo `desconto` fica nulo e a tela chama de "Itens
coletados" em vez de "ofertas".

Uso (na raiz do repositório):  python scripts/ofertas-por-rede/gerar_ofertas.py
"""

import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CATALOGO = RAIZ / "frontend" / "public" / "catalogo"
SAIDA = RAIZ / "frontend" / "src" / "components" / "ui" / "ofertasPorRede.json"

REDES = ["asun", "stok", "atacadao", "master"]
BASICOS = re.compile(r"\b(arroz|leite|caf[eé]|feij[aã]o|a[cç][uú]car|[oó]leo)\b", re.IGNORECASE)
LIMITE = 3


def desconto(preco, normal, promo):
    if not promo or not normal or normal <= preco:
        return None
    return round((1 - preco / normal) * 100)


def resumo_da_rede(produtos, rede):
    itens = []
    for p in produtos:
        preco = (p.get("prices") or {}).get(rede)
        if not isinstance(preco, (int, float)) or preco <= 0:
            continue
        itens.append({"nome": p["name"], "preco": round(float(preco), 2), "desconto": desconto(preco, p.get("precoNormal"), p.get("promo"))})
    com_desconto = sorted((i for i in itens if i["desconto"]), key=lambda i: (-i["desconto"], i["nome"]))
    escolhidos = com_desconto[:LIMITE]
    if len(escolhidos) < LIMITE:
        usados = {i["nome"] for i in escolhidos}
        basicos = sorted((i for i in itens if i["nome"] not in usados and BASICOS.search(i["nome"])), key=lambda i: i["nome"])
        escolhidos += basicos[: LIMITE - len(escolhidos)]
    if len(escolhidos) < LIMITE:
        usados = {i["nome"] for i in escolhidos}
        escolhidos += [i for i in sorted(itens, key=lambda i: i["nome"]) if i["nome"] not in usados][: LIMITE - len(escolhidos)]
    return {"itens": len(itens), "comDesconto": len(com_desconto), "ofertas": escolhidos}


def main():
    arquivos = sorted(CATALOGO.glob("produtos.*.json"))
    if not arquivos:
        print(f"Catálogo não encontrado em {CATALOGO}", file=sys.stderr)
        return 1
    produtos = json.loads(arquivos[0].read_text(encoding="utf-8"))
    dados = {rede: resumo_da_rede(produtos, rede) for rede in REDES}
    SAIDA.write_text(json.dumps(dados, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for rede, d in dados.items():
        print(f"{rede:9s} {d['itens']:>5d} itens, {d['comDesconto']:>4d} com desconto, {len(d['ofertas'])} em destaque")
    print(f"\nGravado em {SAIDA.relative_to(RAIZ)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
