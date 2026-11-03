"""Casamento de produtos entre redes.

Regras (conservadoras, sem chave tolerante):
1. EAN válido idêntico (GTIN canônico) => mesmo produto, origem do vínculo "ean".
2. Sem EAN: só a chave IDÊNTICA marca + nome + unidade/quantidade => origem "nome".
   Se a mesma chave aponta para mais de um produto distinto por EAN, o vínculo é
   ambíguo e não é feito. Itens com EAN nunca são fundidos por nome com outro EAN.

Cada vínculo registra a origem do casamento ("ean" ou "nome").

Mesmo EAN não basta para comparar preço: se a quantidade ou o número de unidades da
embalagem diferem (ex.: 45g vs 6 unidades), o par é marcado status="revisar" e não
deve aparecer no comparador. Pares sem divergência ficam status="confirmado".
"""
import argparse
import itertools
import json
import re
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

from ean import ean_canonico
from normalizacao import MEDIDA, normalizar_produto, texto_normalizado

ORIGEM_EAN = "ean"
ORIGEM_NOME = "nome"
STATUS_CONFIRMADO = "confirmado"
STATUS_REVISAR = "revisar"

# "6 unidades", "12 latas", "6x350ml": número de itens dentro da embalagem
_PACOTE = re.compile(
    r"(?<![\w.,])(\d+)\s*(?:unidades?|unids?|un|latas?|garrafas?|saches?|frascos?|caixas?|pacotes?|pcs?)\b"
    r"|(?<![\w.,])(\d+)\s*[x×]\s*(?=\d)")

_FATOR = {"kg": Decimal(1000), "g": Decimal(1), "mg": Decimal("0.001"),
          "l": Decimal(1000), "ml": Decimal(1), "un": Decimal(1)}
_BASE = {"kg": "g", "g": "g", "mg": "g", "l": "ml", "ml": "ml", "un": "un"}


def chave_nome_identica(registro):
    """(marca, tokens do nome sem a medida, quantidade, unidade-base) ou None se não for confiável."""
    try:
        p = normalizar_produto(registro)
    except ValueError:
        return None
    if p["pendencias"] or not p["marca"] or p["quantidade"] is None:
        return None
    nome_sem_medida = MEDIDA.sub(" ", p["nome_normalizado"])
    tokens = tuple(sorted(re.sub(r"[^a-z0-9 ]", " ", nome_sem_medida).split()))
    unidade = p["unidade"].lower()
    quantidade = p["quantidade"] * _FATOR[unidade]
    return (texto_normalizado(p["marca"]), tokens, str(quantidade.normalize()), _BASE[unidade])


def assinatura_embalagem(nome):
    """(conjunto de medidas em g/ml, número de unidades da embalagem). Sem número => 1 unidade."""
    n = texto_normalizado(nome or "")
    medidas = set()
    for valor, unidade in MEDIDA.findall(n):
        u = unidade.lower()
        if u == "un":
            continue
        medidas.add((str((Decimal(valor.replace(",", ".")) * _FATOR[u]).normalize()), _BASE[u]))
    pack = 1
    for m in _PACOTE.finditer(n):
        pack = max(pack, int(m.group(1) or m.group(2)))
    return frozenset(medidas), pack


def embalagens_compativeis(nome_a, nome_b):
    """(True, None) ou (False, motivo). Medida ausente num dos lados não prova divergência."""
    (ma, pa), (mb, pb) = assinatura_embalagem(nome_a), assinatura_embalagem(nome_b)
    if ma and mb and ma != mb:
        return False, "quantidade_diferente"
    if pa != pb:
        return False, "embalagem_diferente"
    return True, None


def _item(registro, rede):
    return {"rede": rede, "id_origem": str(registro.get("id_produto_origem")),
            "nome": registro.get("nome_bruto"), "marca": registro.get("marca"),
            "ean": ean_canonico(registro.get("codigo_barras")),
            "chave": chave_nome_identica(registro)}


def _rotulo_nome(chave):
    marca, tokens, quantidade, unidade = chave
    return f"nome:{marca}|{' '.join(tokens)}|{quantidade}{unidade}"


def casar(registros_por_rede):
    """registros_por_rede: {rede: [registro, ...]} no formato do Contrato de Extração.

    Devolve {"produtos": [...], "sem_vinculo": [...], "ambiguos": [...]}.
    """
    itens = [_item(r, rede) for rede, lista in registros_por_rede.items() for r in lista]
    grupos_ean = defaultdict(list)
    sem_ean = []
    for it in itens:
        if it["ean"]:
            grupos_ean[it["ean"]].append(it)
        else:
            sem_ean.append(it)

    # chave de nome -> EANs distintos que a possuem (detecta ambiguidade)
    chave_para_eans = defaultdict(set)
    for ean, membros in grupos_ean.items():
        for m in membros:
            if m["chave"]:
                chave_para_eans[m["chave"]].add(ean)

    produtos = {("ean", ean): [dict(m, origem=ORIGEM_EAN) for m in membros]
                for ean, membros in grupos_ean.items()}

    grupos_nome = defaultdict(list)
    ambiguos, sem_vinculo = [], []
    for it in sem_ean:
        if not it["chave"]:
            sem_vinculo.append(it)
            continue
        eans = chave_para_eans.get(it["chave"], set())
        if len(eans) == 1:
            produtos[("ean", next(iter(eans)))].append(dict(it, origem=ORIGEM_NOME))
        elif len(eans) > 1:
            ambiguos.append(it)
        else:
            grupos_nome[it["chave"]].append(it)
    for chave, membros in grupos_nome.items():
        if len(membros) > 1:
            produtos[("nome", chave)] = [dict(m, origem=ORIGEM_NOME) for m in membros]
        else:
            sem_vinculo.append(membros[0])

    saida = []
    for (tipo, ident), membros in produtos.items():
        saida.append({
            "produto": f"ean:{ident}" if tipo == "ean" else _rotulo_nome(ident),
            "redes": sorted({m["rede"] for m in membros}),
            "vinculos": [{"rede": m["rede"], "id_origem": m["id_origem"],
                          "nome": m["nome"], "origem": m["origem"]} for m in membros],
        })

    pares = []
    for membros in produtos.values():
        for x, y in itertools.combinations(membros, 2):
            if x["rede"] == y["rede"]:
                continue
            ok, motivo = embalagens_compativeis(x["nome"], y["nome"])
            pares.append({
                "a": {"rede": x["rede"], "id_origem": x["id_origem"], "nome": x["nome"]},
                "b": {"rede": y["rede"], "id_origem": y["id_origem"], "nome": y["nome"]},
                "origem": ORIGEM_EAN if x["origem"] == y["origem"] == ORIGEM_EAN else ORIGEM_NOME,
                "status": STATUS_CONFIRMADO if ok else STATUS_REVISAR,
                "motivo": motivo,
            })
    for p in saida:
        ids = {(v["rede"], v["id_origem"]) for v in p["vinculos"]}
        p["revisar"] = any(q["status"] == STATUS_REVISAR and (q["a"]["rede"], q["a"]["id_origem"]) in ids
                           and (q["b"]["rede"], q["b"]["id_origem"]) in ids for q in pares)

    def resumir(lista):
        return [{"rede": i["rede"], "id_origem": i["id_origem"], "nome": i["nome"]} for i in lista]

    return {"produtos": saida, "pares": pares, "sem_vinculo": resumir(sem_vinculo), "ambiguos": resumir(ambiguos)}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--entrada", nargs="+", required=True, type=Path,
                        help="Arquivos JSON de coleta (um por rede, no Contrato de Extração)")
    parser.add_argument("--saida", required=True, type=Path)
    args = parser.parse_args(argv)
    por_rede = {}
    for caminho in args.entrada:
        for r in json.loads(caminho.read_text(encoding="utf-8")):
            por_rede.setdefault(str(r.get("supermercado") or caminho.stem), []).append(r)
    resultado = casar(por_rede)
    args.saida.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(resultado['produtos'])} produtos, {len(resultado['sem_vinculo'])} sem vínculo, "
          f"{len(resultado['ambiguos'])} ambíguos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
