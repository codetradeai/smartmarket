"""Gera frontend/src/data/equivalentes.json: grupos de produtos equivalentes entre redes.

Lê frontend/src/data.js, aplica as camadas de casamento de casamento_camadas.py e grava o arquivo no
contrato abaixo, de forma determinística e idempotente (mesmo data.js => mesmos bytes):

    {
      "versao": "<sha256 curto do conteúdo dos grupos>",
      "grupos": [ {"id": "g1", "confianca": "confirmado"|"provavel", "camada": "T0".."T4", "itens": ["p12", "p3456"]} ]
    }

Cada grupo tem 2 ou mais itens de redes diferentes (ids "p<N>" do catálogo, que são estáveis) e um id aparece
em no máximo um grupo. "confirmado" pode entrar na comparação e no "menor preço"; "provavel" só é mostrado com
o selo "provável mesmo produto" e nunca conta para o "menor preço". A decisão de confiança por camada está
documentada em casamento_camadas.py.

Uso (da raiz do repositório):
    python scraper/gerar_equivalentes.py              # regrava o arquivo se mudou
    python scraper/gerar_equivalentes.py --verificar  # exit 1 se o arquivo versionado estiver desatualizado

Não altera o data.js nem o banco.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import casamento_camadas as cc

RAIZ = Path(__file__).resolve().parent.parent
DATA_JS = RAIZ / "frontend" / "src" / "data.js"
SAIDA = RAIZ / "frontend" / "src" / "data" / "equivalentes.json"
MARCADOR_PRODUCTS = "export const PRODUCTS = "


def carregar_produtos(caminho):
    """Lê PRODUCTS do data.js e devolve (registros do casamento, quantidade ignorada por falta de preço/rede)."""
    texto = Path(caminho).read_text(encoding="utf-8").replace("\r\n", "\n")
    corpo = texto[texto.index(MARCADOR_PRODUCTS) + len(MARCADOR_PRODUCTS):]
    produtos = json.loads(corpo[:corpo.rindex("]") + 1])
    registros, ignorados = [], 0
    for p in produtos:
        precos = p.get("prices") or {}
        if not precos:  # sem preço não há o que comparar
            ignorados += 1
            continue
        rede = next(iter(precos))
        registros.append({"id": p["id"], "nome": p.get("name"), "marca": p.get("brand"), "cat": p.get("category"),
                          "unidade": p.get("unit"), "rede": rede, "preco": precos[rede],
                          "idOrigem": p.get("idOrigem"), "imageUrl": p.get("imageUrl")})
    return registros, ignorados


def calcular_versao(grupos):
    canonico = json.dumps(grupos, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonico.encode("utf-8")).hexdigest()[:12]


def serializar(grupos):
    """Texto final: um grupo por linha (diffs legíveis), LF, ordem fixa das chaves, termina com quebra de linha."""
    linhas = [json.dumps({"id": g["id"], "confianca": g["confianca"], "camada": g["camada"], "itens": g["itens"]},
                         ensure_ascii=False, separators=(", ", ": ")) for g in grupos]
    corpo = ",\n".join("    " + linha for linha in linhas)
    return '{\n  "versao": "%s",\n  "grupos": [\n%s\n  ]\n}\n' % (calcular_versao(grupos), corpo)


def gerar(data_js=DATA_JS, destino=SAIDA, gravar=True):
    """Casa o catálogo e grava o arquivo. Devolve {'texto', 'mudou', 'estatisticas', 'ignorados_sem_preco'}."""
    registros, ignorados = carregar_produtos(data_js)
    resultado = cc.casar_registros(registros)
    texto = serializar(resultado["grupos"])
    destino = Path(destino)
    atual = destino.read_bytes() if destino.exists() else None
    novo = texto.encode("utf-8")
    mudou = atual != novo
    if mudou and gravar:
        destino.parent.mkdir(parents=True, exist_ok=True)
        with open(destino, "wb") as arq:  # bytes: o fim de linha não varia com o sistema
            arq.write(novo)
    return {"texto": texto, "mudou": mudou, "estatisticas": resultado["estatisticas"], "ignorados_sem_preco": ignorados}


def _resumo(r):
    e = r["estatisticas"]
    linhas = [f"{e['grupos']} grupos cobrindo {e['produtos_cobertos']} de {e['produtos_no_catalogo']} produtos "
              f"({r['ignorados_sem_preco']} sem preço ignorados)"]
    for camada in cc.ORDEM_CAMADAS:
        c = e["por_camada"][camada]
        linhas.append(f"  {camada} ({cc.CONFIANCA_POR_CAMADA[camada]}): {c['grupos']} grupos, {c['produtos']} produtos")
    for conf, c in e["por_confianca"].items():
        linhas.append(f"  total {conf}: {c['grupos']} grupos, {c['produtos']} produtos")
    return "\n".join(linhas)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Gera frontend/src/data/equivalentes.json a partir do data.js")
    ap.add_argument("--data-js", default=str(DATA_JS))
    ap.add_argument("--saida", default=str(SAIDA))
    ap.add_argument("--verificar", action="store_true", help="não grava; sai com 1 se o arquivo estiver desatualizado")
    args = ap.parse_args(argv)
    r = gerar(args.data_js, args.saida, gravar=not args.verificar)
    print(_resumo(r))
    if args.verificar:
        if r["mudou"]:
            print(f"DESATUALIZADO: {args.saida}. Rode: python scraper/gerar_equivalentes.py", file=sys.stderr)
            return 1
        print("equivalentes.json em dia")
        return 0
    print("arquivo regravado" if r["mudou"] else "arquivo já estava em dia (nada a gravar)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
