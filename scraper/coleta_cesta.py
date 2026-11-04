"""Coleta da cesta de demonstração: preço real do mesmo produto (mesmo EAN) em Atacadão, Master e Stok.

Para cada candidato (produto do catálogo coletado numa dessas redes):
1. busca o produto na rede de origem para obter o EAN (Master/Stok: busca por nome, aceitando só o
   mesmo id de origem; Atacadão: busca por productId);
2. procura o EAN nas outras duas redes;
3. aplica a regra de embalagem do casamento (confirmado / revisar).

Regras: robots.txt conferido antes (só coleta onde é permitido), um único limitador por host com
mínimo de 2 s, User-Agent com contato de SMARTMARKET_CONTATO, parada no primeiro 403/429 (a saída
parcial é gravada). Cada preço registra a data e hora da resposta (UTC).

Não altera o data.js nem o banco: grava só a saída bruta em scraper/saida/.
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import coleta_atacadao
import coleta_master
import coleta_stok
import relatorio_casamento as rc
from casamento import embalagens_compativeis
from ean import ean_canonico

DIR_SAIDA = Path(__file__).resolve().parent / "saida"
REDES_VIP = {"master": coleta_master, "stok": coleta_stok}
REDES = ("atacadao", "master", "stok")


def agora_utc():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ------------------------------------------------------------------ robots.txt
def endpoints():
    """(rede, método, URL) de cada endpoint que a cesta usa."""
    saida = [("atacadao", "GET", rc.URL_ATACADAO_BUSCA)]
    for rede, mod in REDES_VIP.items():
        saida.append((rede, "POST", f"{mod.BASE_URL}/org/{mod.ORG_ID}/auth/loja/login"))
        saida.append((rede, "GET", f"{mod.BASE_URL}/org/{mod.ORG_ID}/filial/{mod.FILIAL_ID}/centro_distribuicao/"
                                   f"{mod.CENTRO_DISTRIBUICAO_ID}/loja/buscas/produtos/termo/x"))
    return saida


def decidir_robots(status, texto, url, ua):
    """Decisão para uma URL a partir da resposta do robots.txt (RFC 9309).

    2xx: aplica as regras. 4xx (ex.: 404): sem restrições. 5xx ou falha: tudo bloqueado.
    """
    if status is None or status >= 500:
        return False, f"robots.txt indisponível ({status}); tratado como bloqueado"
    if 400 <= status < 500:
        return True, f"robots.txt {status}: sem restrições"
    rp = RobotFileParser()
    rp.parse(texto.splitlines())
    ok = rp.can_fetch(ua, url)
    return ok, "permitido pelo robots.txt" if ok else "bloqueado pelo robots.txt"


def verificar_robots(sessao, buscar=None):
    """Baixa o robots.txt de cada host (1 vez, pelo limitador) e decide cada endpoint."""
    import requests
    buscar = buscar or (lambda url: requests.get(url, headers={"User-Agent": sessao.user_agent}, timeout=20))
    por_host, resultado = {}, []
    for rede, metodo, url in endpoints():
        partes = urlsplit(url)
        robots = f"{partes.scheme}://{partes.netloc}/robots.txt"
        if robots not in por_host:
            sessao.antes(robots)
            try:
                r = buscar(robots)
                por_host[robots] = (r.status_code, r.text if r.status_code < 300 else "")
            except Exception:  # noqa: BLE001 - falha de rede vira "bloqueado"
                por_host[robots] = (None, "")
        status, texto = por_host[robots]
        ok, motivo = decidir_robots(status, texto, url, sessao.user_agent)
        resultado.append({"rede": rede, "metodo": metodo, "endpoint": url, "robots": robots,
                          "status_robots": status, "permitido": ok, "motivo": motivo})
    return resultado


# ------------------------------------------------------------------ consultas
def _registro_vip(rede, item, instante):
    reg = REDES_VIP[rede].processar_item(item, "", instante)
    if not reg:
        return None
    return {"rede": rede, "id_origem": reg["id_produto_origem"], "nome": reg["nome_bruto"],
            "ean": ean_canonico(reg.get("codigo_barras")), "preco": reg["preco"],
            "preco_normal": reg["preco_normal"], "em_promocao": reg["em_promocao"], "coletado_em": instante}


def _registro_atacadao(raw, instante):
    try:
        reg = coleta_atacadao.transformar_produto(raw, "", datetime.fromisoformat(instante))
    except ValueError:
        return None
    return {"rede": "atacadao", "id_origem": str(reg["id_produto_origem"]), "nome": reg["nome_bruto"],
            "ean": ean_canonico(reg.get("codigo_barras")), "preco": reg["preco"],
            "preco_normal": reg["preco_normal"], "em_promocao": reg["em_promocao"], "coletado_em": instante}


def buscar_atacadao(sessao, fq):
    """Lista de produtos VTEX para o filtro fq; None se a sessão parou."""
    import requests
    url = rc.URL_ATACADAO_BUSCA
    if not sessao.antes(url):
        return None
    r = requests.get(url, params={"fq": fq}, headers={"User-Agent": sessao.user_agent, "Accept": "application/json"},
                     timeout=25)
    if not sessao.depois(url, r.status_code):
        return None
    return (r.json() if r.status_code in (200, 206) else []), agora_utc()


class Consultas:
    """Consultas às redes, com um token por loja VipCommerce (login sob o mesmo limitador)."""

    def __init__(self, sessao):
        self.sessao, self.tokens = sessao, {}

    def _token(self, rede):
        if rede not in self.tokens:
            self.tokens[rede] = rc.login_vip(REDES_VIP[rede], self.sessao)
        return self.tokens[rede]

    def vip(self, rede, termo):
        token = self._token(rede)
        if token is None:
            return None
        lista = rc.buscar_vip(REDES_VIP[rede], token, termo, self.sessao)
        if lista is None:
            return None
        instante = agora_utc()
        return [r for r in (_registro_vip(rede, it, instante) for it in lista) if r]

    def atacadao(self, fq):
        res = buscar_atacadao(self.sessao, fq)
        if res is None:
            return None
        lista, instante = res
        return [r for r in (_registro_atacadao(p, instante) for p in lista) if r]

    def na_origem(self, cand):
        rede = cand["rede"]
        if rede == "atacadao":
            achados = self.atacadao(f"productId:{cand['idOrigem']}")
        else:
            achados = self.vip(rede, cand["nome"])
        if achados is None:
            return None
        return next((a for a in achados if str(a["id_origem"]) == str(cand["idOrigem"])), False)

    def por_ean(self, rede, ean):
        termo = rc.termo_de_consulta(ean)
        achados = self.atacadao(f"alternateIds_Ean:{termo}") if rede == "atacadao" else self.vip(rede, termo)
        if achados is None:
            return None
        return next((a for a in achados if a["ean"] == ean), False)


def status_par(nome_a, nome_b):
    ok, motivo = embalagens_compativeis(nome_a, nome_b)
    return ("confirmado", None) if ok else ("revisar", motivo)


def coletar(candidatos, sessao, consultas=None, progresso=None):
    """Percorre os candidatos; para no primeiro bloqueio ou falha de rede. Devolve os resultados (parciais se parou).

    Falha de rede (timeout, conexão) não é tentada de novo: a coleta para, o item fica como
    "erro_rede" e sessao.erro_rede guarda a mensagem.
    """
    consultas = consultas or Consultas(sessao)
    resultados = []
    for i, cand in enumerate(candidatos, 1):
        item = {"id": cand["id"], "rede_origem": cand["rede"], "id_origem": cand["idOrigem"],
                "nome_catalogo": cand["nome"], "ean": None, "precos": {}, "pares": [], "situacao": None}
        try:
            parar = _processar(cand, item, sessao, consultas)
        except OSError as exc:  # requests.RequestException herda de OSError (IOError)
            sessao.erro_rede = f"{type(exc).__name__}: {exc}"
            sessao.parar.set()
            item["situacao"] = "erro_rede"
            parar = True
        resultados.append(item)
        if progresso:
            progresso(i, item)
        if parar or sessao.parar.is_set():
            break
    return resultados


def _processar(cand, item, sessao, consultas):
    """Preenche o item; devolve True se a coleta deve parar."""
    origem = consultas.na_origem(cand)
    if origem is None:
        item["situacao"] = "interrompido"
        return True
    if origem is False:
        item["situacao"] = "nao_encontrado_na_origem"
        return False
    item["precos"][cand["rede"]] = origem
    if not origem["ean"]:
        item["situacao"] = "sem_ean_valido"
        return False
    item["ean"] = origem["ean"]
    for rede in REDES:
        if rede == cand["rede"]:
            continue
        achado = consultas.por_ean(rede, origem["ean"])
        if achado is None:
            break
        if achado:
            item["precos"][rede] = achado
    for rede, reg in item["precos"].items():
        if rede != cand["rede"]:
            st, motivo = status_par(origem["nome"], reg["nome"])
            item["pares"].append({"rede_a": cand["rede"], "rede_b": rede, "status": st, "motivo": motivo})
    item["situacao"] = "interrompido" if sessao.parar.is_set() else "ok"
    return sessao.parar.is_set()


def resumo(resultados):
    com_ean = [r for r in resultados if r["ean"]]
    em_2 = [r for r in com_ean if len(r["precos"]) >= 2]
    pares = [p for r in resultados for p in r["pares"]]
    confirmados_2 = [r for r in em_2 if any(p["status"] == "confirmado" for p in r["pares"])]
    return {
        "candidatos_processados": len(resultados),
        "com_ean_valido": len(com_ean),
        "com_preco_em_2_ou_mais_redes": len(em_2),
        "com_preco_em_3_redes": sum(1 for r in com_ean if len(r["precos"]) == 3),
        "produtos_com_par_confirmado": len(confirmados_2),
        "pares_confirmado": sum(1 for p in pares if p["status"] == "confirmado"),
        "pares_revisar": sum(1 for p in pares if p["status"] == "revisar"),
        "situacoes": {s: sum(1 for r in resultados if r["situacao"] == s)
                      for s in sorted({r["situacao"] for r in resultados})},
    }


def main(argv=None):
    import time
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--candidatos", type=Path, default=DIR_SAIDA / "cesta_candidatos.json")
    parser.add_argument("--saida", type=Path, default=DIR_SAIDA)
    parser.add_argument("--so-robots", action="store_true", help="Só confere o robots.txt e mostra o resultado")
    parser.add_argument("--limite", type=int, help="Processa só os N primeiros candidatos")
    args = parser.parse_args(argv)

    try:
        sessao = rc.Sessao()
    except rc.ErroConfiguracao as exc:
        print(f"ERRO: {exc}")
        return 2

    robots = verificar_robots(sessao)
    for r in robots:
        print(f"[robots] {r['rede']:8} {r['metodo']:4} {r['endpoint']}\n          -> {r['motivo']} ({r['robots']})")
    if args.so_robots:
        return 0
    if not all(r["permitido"] for r in robots):
        print("ERRO: há endpoint bloqueado pelo robots.txt; nada foi coletado.")
        return 3

    candidatos = json.loads(args.candidatos.read_text(encoding="utf-8"))[: args.limite]
    inicio, t0 = agora_utc(), time.monotonic()
    args.saida.mkdir(parents=True, exist_ok=True)
    destino = args.saida / f"cesta_{inicio.replace(':', '').replace('-', '').replace('+0000', 'Z')}.json"
    parciais = []

    def gravar(final):
        saida = montar_saida(sessao, robots, candidatos, parciais, inicio, time.monotonic() - t0, final)
        temp = destino.with_suffix(".tmp")
        temp.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temp.replace(destino)
        return saida

    def progresso(i, it):
        parciais.append(it)
        gravar(final=False)  # gravação incremental: uma queda não perde o que já foi coletado
        print(f"[{i}/{len(candidatos)}] {it['id']} {it['situacao']} ean={it['ean']} redes={sorted(it['precos'])}",
              flush=True)

    coletar(candidatos, sessao, progresso=progresso)
    saida = gravar(final=True)
    meta = saida["meta"]
    print(json.dumps({"saida": str(destino), **saida["resumo"], "requisicoes": meta["requisicoes_por_host"],
                      "requisicoes_total": meta["requisicoes_total"], "duracao_s": meta["duracao_s"],
                      "bloqueio": meta["bloqueio"], "erro_rede": meta["erro_rede"]}, ensure_ascii=False, indent=2))
    if sessao.bloqueio:
        return 4
    return 5 if meta["erro_rede"] else 0


def montar_saida(sessao, robots, candidatos, resultados, inicio, duracao_s, final):
    bloqueio = sessao.bloqueio
    return {
        "meta": {
            "inicio": inicio, "fim": agora_utc() if final else None, "concluida": final,
            "duracao_s": round(duracao_s, 1),
            "user_agent": sessao.user_agent, "intervalo_minimo_s": sessao.limitador.intervalo,
            "requisicoes_por_host": dict(sessao.limitador.contagem),
            "requisicoes_total": sum(sessao.limitador.contagem.values()),
            "robots": robots,
            "bloqueio": None if not bloqueio else {"host": bloqueio.host, "status": bloqueio.status, "url": bloqueio.url},
            "erro_rede": getattr(sessao, "erro_rede", None),
            "candidatos": len(candidatos),
        },
        "resumo": resumo(resultados),
        "resultados": resultados,
    }


if __name__ == "__main__":
    sys.exit(main())
