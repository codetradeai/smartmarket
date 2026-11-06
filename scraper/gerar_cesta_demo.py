"""Gera frontend/src/data/cesta-demo.json a partir da saída bruta da coleta da cesta.

Regras:
- só pares "confirmado" (mesmo EAN e mesma embalagem); "revisar" fica de fora;
- pares com o Atacadão ficam de fora (preço sem região definida: catálogo nacional);
- por produto: id do catálogo, nome, EAN e, por rede, o preço coletado, a data e hora da coleta em
  horário de Brasília (ISO 8601 com -03:00) e a origem do vínculo ("proprio" na rede de origem,
  "ean" na rede casada pelo código de barras).

Não calcula preço nenhum: copia o que foi coletado. Não lê nem altera o data.js.
"""
import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIR_SAIDA = RAIZ / "scraper" / "saida"
DESTINO = RAIZ / "frontend" / "src" / "data" / "cesta-demo.json"
# Brasília: UTC-3 fixo (sem horário de verão desde 2019). Fuso fixo evita depender de tzdata no Windows.
BRASILIA = timezone(timedelta(hours=-3))
EXCLUIR_REDES = {"atacadao"}


def para_brasilia(iso_utc):
    return datetime.fromisoformat(iso_utc).astimezone(BRASILIA).isoformat(timespec="seconds")


def saida_mais_recente(diretorio=DIR_SAIDA):
    arquivos = sorted(p for p in diretorio.glob("cesta_*.json") if p.name != "cesta_candidatos.json")
    if not arquivos:
        raise FileNotFoundError(f"nenhuma saída cesta_*.json em {diretorio}")
    return arquivos[-1]


def _num_id(pid):
    try:
        return int(str(pid).lstrip("p"))
    except ValueError:
        return 0


def montar(bruto, nome_arquivo=""):
    produtos = []
    for r in bruto["resultados"]:
        pares = [p for p in r.get("pares", [])
                 if p["status"] == "confirmado" and not EXCLUIR_REDES & {p["rede_a"], p["rede_b"]}]
        if not pares:
            continue
        redes = {r["rede_origem"]} | {p["rede_b"] for p in pares}
        precos = {}
        for rede in sorted(redes):
            reg = r["precos"][rede]
            precos[rede] = {
                "preco": reg["preco"],
                "coletado_em": para_brasilia(reg["coletado_em"]),
                "origem_vinculo": "proprio" if rede == r["rede_origem"] else "ean",
                "nome_na_rede": reg["nome"],
            }
        produtos.append({"id": r["id"], "nome": r["nome_catalogo"], "ean": r["ean"], "precos": precos})
    produtos.sort(key=lambda p: _num_id(p["id"]))
    meta = bruto.get("meta", {})
    return {
        "meta": {
            "rotulo": "Cesta de demonstração",
            "fonte": f"scraper/saida/{nome_arquivo}" if nome_arquivo else None,
            "coleta_inicio": para_brasilia(meta["inicio"]) if meta.get("inicio") else None,
            "coleta_fim": para_brasilia(meta["fim"]) if meta.get("fim") else None,
            "regras": "só pares confirmado (mesmo EAN e embalagem); sem pares com o Atacadão; sem revisar",
            "total_produtos": len(produtos),
        },
        "produtos": produtos,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--entrada", type=Path, help="Saída cesta_*.json (padrão: a mais recente)")
    parser.add_argument("--destino", type=Path, default=DESTINO)
    args = parser.parse_args(argv)
    entrada = args.entrada or saida_mais_recente()
    cesta = montar(json.loads(entrada.read_text(encoding="utf-8")), entrada.name)
    args.destino.parent.mkdir(parents=True, exist_ok=True)
    with open(args.destino, "w", encoding="utf-8", newline="\n") as arq:
        arq.write(json.dumps(cesta, ensure_ascii=False, indent=2) + "\n")
    print(f"{cesta['meta']['total_produtos']} produtos gravados em {args.destino}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
