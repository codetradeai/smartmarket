"""Relatório de casamento de produtos entre redes (EAN e chave idêntica).

Lê os JSON de coleta (um por rede) e gera Markdown com: produtos por rede, taxa
de EAN válido, EANs em 2+ redes, matriz de sobreposição e pares com o mesmo EAN
e nomes muito diferentes (para revisão humana).

Com --consultar-ean, procura cada EAN coletado também em Atacadão, Master e Stok
(as únicas redes cuja API permite buscar por EAN), com 1 requisição por vez, pausa
mínima de 2 s por host e User-Agent identificável.
"""
import argparse
import itertools
import json
import os
import re
import threading
import time
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

from casamento import casar, embalagens_compativeis
from ean import ean_canonico
from normalizacao import MEDIDA, texto_normalizado

PAUSA_S = 2.0  # mínimo combinado entre requisições ao mesmo host
VAR_CONTATO = "SMARTMARKET_CONTATO"


class ErroConfiguracao(RuntimeError):
    pass


def user_agent(ambiente=None):
    """User-Agent identificável. O contato vem de SMARTMARKET_CONTATO, nunca do código."""
    contato = ((ambiente if ambiente is not None else os.environ).get(VAR_CONTATO) or "").strip()
    if not contato:
        raise ErroConfiguracao(
            f"Defina a variável de ambiente {VAR_CONTATO} com um contato do projeto "
            f"(ex.: URL do repositório) antes de consultar as redes."
        )
    return f"SmartMarketBot/0.1 (projeto academico Codifica/+praTI; contato: {contato})"
REDES = ["zaffari", "rissul", "asun", "stok", "atacadao", "master", "fort", "carrefour"]
REDES_CONSULTAVEIS = ["master", "stok", "atacadao"]
ROTULOS = {"zaffari": "Zaffari", "rissul": "Rissul", "asun": "Asun", "stok": "Stok", "atacadao": "Atacadão",
           "master": "Master", "fort": "Fort", "carrefour": "Carrefour"}


def chave_rede(supermercado):
    s = texto_normalizado(str(supermercado or ""))
    for chave in ("fort", "zaffari", "rissul", "asun", "stok", "atacad", "master", "carrefour"):
        if chave in s:
            return "atacadao" if chave == "atacad" else chave
    return s or "desconhecida"


def agrupar_por_rede(registros):
    por_rede = defaultdict(list)
    for r in registros:
        por_rede[chave_rede(r.get("supermercado"))].append(r)
    return dict(por_rede)


def resumo_por_rede(por_rede):
    saida = {}
    for rede, lista in por_rede.items():
        com_ean = [r for r in lista if ean_canonico(r.get("codigo_barras"))]
        saida[rede] = {"produtos": len(lista), "com_ean": len(com_ean)}
    return saida


def eans_por_rede(por_rede):
    return {rede: {ean_canonico(r.get("codigo_barras")) for r in lista if ean_canonico(r.get("codigo_barras"))}
            for rede, lista in por_rede.items()}


def presencas(por_rede, consulta=None):
    """{ean_canonico: {rede: nome}} com o que foi coletado e, se houver, o que a consulta por EAN achou."""
    pres = defaultdict(dict)
    for rede, lista in por_rede.items():
        for r in lista:
            e = ean_canonico(r.get("codigo_barras"))
            if e:
                pres[e].setdefault(rede, r.get("nome_bruto"))
    for rede, achados in (consulta or {}).items():
        for e, nome in achados.items():
            if nome:
                pres[e].setdefault(rede, nome)
    return pres


def matriz_pares(pres, redes=REDES):
    m = Counter()
    for _, onde in pres.items():
        for a, b in itertools.combinations(sorted(onde), 2):
            m[(a, b)] += 1
    return m


def eans_em_2_ou_mais(pres):
    return sum(1 for onde in pres.values() if len(onde) >= 2)


def _tokens_nome(nome):
    n = MEDIDA.sub(" ", texto_normalizado(nome or ""))
    return set(re.sub(r"[^a-z0-9 ]", " ", n).split())


def similaridade(a, b):
    ta, tb = _tokens_nome(a), _tokens_nome(b)
    return len(ta & tb) / len(ta | tb) if ta | tb else 1.0


def pares_nomes_divergentes(pres, limite=20, corte=0.5):
    """Pares (mesmo EAN, redes diferentes) com nomes muito diferentes, do mais para o menos divergente."""
    achados = []
    for ean, onde in pres.items():
        for (ra, na), (rb, nb) in itertools.combinations(sorted(onde.items()), 2):
            s = similaridade(na, nb)
            if s < corte:
                achados.append({"ean": ean, "rede_a": ra, "nome_a": na, "rede_b": rb, "nome_b": nb, "similaridade": s})
    achados.sort(key=lambda x: (x["similaridade"], x["ean"]))
    return achados[:limite]


# ---------------------------------------------------------------- consulta por EAN
class LimitadorPorHost:
    """Um único limitador por host, compartilhado entre threads: no mínimo PAUSA_S entre requisições.

    Master e Stok usam o mesmo host (services.vipcommerce.com.br); com limitadores separados o
    host recebia o dobro de requisições. O lock do host fica preso durante a espera, então duas
    threads no mesmo host andam em fila. Também conta as requisições por host.
    """

    def __init__(self, intervalo=PAUSA_S, relogio=time.monotonic, dormir=time.sleep):
        self.intervalo = max(PAUSA_S, float(intervalo))
        self._relogio, self._dormir = relogio, dormir
        self._geral = threading.Lock()
        self._locks, self._ultima = {}, {}
        self.contagem = Counter()

    @staticmethod
    def host(url):
        return urlsplit(url).hostname or url

    def aguardar(self, url):
        h = self.host(url)
        with self._geral:
            lock = self._locks.setdefault(h, threading.Lock())
        with lock:
            ultima = self._ultima.get(h)
            if ultima is not None:
                falta = self.intervalo - (self._relogio() - ultima)
                if falta > 0:
                    self._dormir(falta)
            self._ultima[h] = self._relogio()
            self.contagem[h] += 1


class Bloqueio(RuntimeError):
    """A rede respondeu 403 ou 429: a coleta para inteira, sem nova tentativa."""

    def __init__(self, host, status, url):
        super().__init__(f"{host} respondeu {status} em {url}; coleta interrompida")
        self.host, self.status, self.url = host, status, url


class Sessao:
    """Estado compartilhado entre as threads: limitador, User-Agent e parada no primeiro bloqueio."""

    def __init__(self, limitador=None, ua=None):
        self.limitador = limitador or LimitadorPorHost()
        self.user_agent = ua or user_agent()
        self.parar = threading.Event()
        self.bloqueio = None

    def antes(self, url):
        if self.parar.is_set():
            return False
        self.limitador.aguardar(url)
        return not self.parar.is_set()

    def depois(self, url, status):
        if status in (403, 429):
            if self.bloqueio is None:
                self.bloqueio = Bloqueio(self.limitador.host(url), status, url)
            self.parar.set()
            return False
        return True


def termo_de_consulta(canonico):
    """Forma usada nas buscas por EAN: sem zeros à esquerda e com 13 dígitos quando couber."""
    s = canonico.lstrip("0")
    return s.zfill(13) if len(s) <= 13 else canonico[-14:]


URL_ATACADAO_BUSCA = "https://www.atacadao.com.br/api/catalog_system/pub/products/search"


def _consultar_atacadao(eans, ja_tem, sessao):
    import requests
    achados = {}
    for e in eans:
        if "atacadao" in ja_tem.get(e, {}):
            continue
        if not sessao.antes(URL_ATACADAO_BUSCA):
            break
        r = requests.get(URL_ATACADAO_BUSCA, params={"fq": f"alternateIds_Ean:{termo_de_consulta(e)}"},
                         headers={"User-Agent": sessao.user_agent, "Accept": "application/json"}, timeout=25)
        if not sessao.depois(URL_ATACADAO_BUSCA, r.status_code):
            break
        lista = r.json() if r.status_code in (200, 206) else []
        achados[e] = next((p["productName"] for p in lista
                           if ean_canonico((p["items"][0] or {}).get("ean")) == e), False)
    return achados


def login_vip(mod, sessao):
    """Token da loja VipCommerce, ou None se a sessão foi interrompida."""
    import requests
    url = f"{mod.BASE_URL}/org/{mod.ORG_ID}/auth/loja/login"
    if not sessao.antes(url):
        return None
    r = requests.post(url, json={"domain": mod.DOMAIN, "username": "loja", "key": mod.AUTH_KEY},
                      headers={**mod.HEADERS_BASE, "User-Agent": sessao.user_agent,
                               "Content-Type": "application/json"}, timeout=20)
    if not sessao.depois(url, r.status_code):
        return None
    return r.json().get("data")


def buscar_vip(mod, token, termo, sessao):
    """Lista de produtos da busca por termo (nome ou EAN) numa loja VipCommerce; None se interrompida."""
    import urllib.parse
    import requests
    url = (f"{mod.BASE_URL}/org/{mod.ORG_ID}/filial/{mod.FILIAL_ID}/centro_distribuicao/"
           f"{mod.CENTRO_DISTRIBUICAO_ID}/loja/buscas/produtos/termo/{urllib.parse.quote(termo)}")
    if not sessao.antes(url):
        return None
    r = requests.get(url, headers={**mod.HEADERS_BASE, "User-Agent": sessao.user_agent,
                                   "Authorization": f"Bearer {token}"}, params={"page": 1}, timeout=25)
    if not sessao.depois(url, r.status_code):
        return None
    dados = (r.json().get("data") or {}) if r.status_code == 200 else {}
    return dados.get("produtos", []) if isinstance(dados, dict) else []


def _consultar_vip(mod, rede, eans, ja_tem, sessao):
    token = login_vip(mod, sessao)
    if token is None:
        return {}
    achados = {}
    for e in eans:
        if rede in ja_tem.get(e, {}):
            continue
        lista = buscar_vip(mod, token, termo_de_consulta(e), sessao)
        if lista is None:
            break
        achados[e] = next((p.get("descricao") for p in lista
                           if ean_canonico(p.get("codigo_barras")) == e), False)
    return achados


def consultar_eans(eans, ja_tem, sessao=None):
    """Procura cada EAN em Atacadão, Master e Stok.

    Uma thread por rede, mas um único limitador por host (Master e Stok dividem o mesmo).
    Para tudo no primeiro 403/429 e levanta Bloqueio com o host e o status.
    """
    import coleta_master
    import coleta_stok
    sessao = sessao or Sessao()
    resultado = {}

    def tarefa(rede, fn):
        resultado[rede] = fn()

    fila = sorted(eans)
    ts = [
        threading.Thread(target=tarefa, args=("atacadao", lambda: _consultar_atacadao(fila, ja_tem, sessao))),
        threading.Thread(target=tarefa, args=("master", lambda: _consultar_vip(coleta_master, "master", fila, ja_tem, sessao))),
        threading.Thread(target=tarefa, args=("stok", lambda: _consultar_vip(coleta_stok, "stok", fila, ja_tem, sessao))),
    ]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    if sessao.bloqueio:
        raise sessao.bloqueio
    return resultado


# ---------------------------------------------------------------- Markdown
def _tabela_matriz(m, redes):
    linhas = ["| | " + " | ".join(ROTULOS[r] for r in redes) + " |",
              "|---|" + "---|" * len(redes)]
    for a in redes:
        cel = []
        for b in redes:
            cel.append("—" if a == b else str(m.get(tuple(sorted((a, b))), 0)))
        linhas.append(f"| **{ROTULOS[a]}** | " + " | ".join(cel) + " |")
    return "\n".join(linhas)


def renderizar(por_rede, resultado_casamento, pres_direta, pres_cruzada=None, divergentes=None, data=""):
    resumo = resumo_por_rede(por_rede)
    out = [f"# Casamento de produtos entre redes\n",
           f"> Gerado por `scraper/relatorio_casamento.py` em {data}. Amostra de coletas reais com no máximo 20 produtos por rede, "
           "feitas com 2 s por host e User-Agent identificável. **Os números descrevem a amostra, não o catálogo inteiro.**\n"]
    out.append("## 1. Produtos por rede e EAN válido\n")
    out.append("| Rede | Produtos | Com EAN válido | Taxa |\n|---|---|---|---|")
    tp = te = 0
    for rede in REDES:
        r = resumo.get(rede, {"produtos": 0, "com_ean": 0})
        tp, te = tp + r["produtos"], te + r["com_ean"]
        taxa = f"{100 * r['com_ean'] / r['produtos']:.0f}%" if r["produtos"] else "—"
        out.append(f"| {ROTULOS[rede]} | {r['produtos']} | {r['com_ean']} | {taxa} |")
    out.append(f"| **Total** | **{tp}** | **{te}** | **{100 * te / tp:.0f}%** |" if tp else "| **Total** | 0 | 0 | — |")
    out.append("\nAsun e Fort não expõem EAN. Itens sem EAN válido incluem granel/pesáveis (códigos internos descartados).\n")

    out.append("## 2. EANs em 2 ou mais redes\n")
    out.append(f"- **Dentro dos dados coletados:** {eans_em_2_ou_mais(pres_direta)} EANs aparecem em 2 ou mais redes "
               f"(de {len(pres_direta)} EANs distintos).")
    if pres_cruzada is not None:
        out.append(f"- **Com consulta por EAN em Atacadão, Master e Stok:** {eans_em_2_ou_mais(pres_cruzada)} de {len(pres_cruzada)} "
                   "EANs aparecem em 2 ou mais redes (piso: Zaffari, Rissul e Carrefour não têm busca por EAN permitida).")
    out.append("")
    out.append("## 3. Matriz de sobreposição (EANs em comum)\n")
    out.append("### 3.1 Só o que foi coletado\n")
    out.append(_tabela_matriz(matriz_pares(pres_direta), REDES))
    if pres_cruzada is not None:
        out.append("\n### 3.2 Com consulta cruzada por EAN\n")
        out.append("Pares entre Zaffari, Rissul e Carrefour não são mensuráveis (sem busca por EAN); aparecem apenas se coletados diretamente.\n")
        out.append(_tabela_matriz(matriz_pares(pres_cruzada), REDES))
    out.append("")
    out.append("## 4. Casamento\n")
    prods = resultado_casamento["produtos"]
    vinc = Counter(v["origem"] for p in prods for v in p["vinculos"])
    multi = [p for p in prods if len(p["redes"]) >= 2]
    out.append(f"- Produtos canônicos com 2+ redes: **{len(multi)}** (de {len(prods)} agrupamentos).")
    out.append(f"- Vínculos por origem: **ean = {vinc.get('ean', 0)}**, **nome = {vinc.get('nome', 0)}** (chave idêntica marca+nome+unidade; sem chave tolerante).")
    out.append(f"- Ambíguos (chave igual para EANs diferentes, não vinculados): {len(resultado_casamento['ambiguos'])}.")
    out.append(f"- Sem vínculo: {len(resultado_casamento['sem_vinculo'])}.")
    pares = resultado_casamento.get("pares", [])
    revisar = [p for p in pares if p["status"] == "revisar"]
    out.append(f"- Pares entre redes: **{len(pares)}**; confirmados (entram no comparador): **{len(pares) - len(revisar)}**; "
               f"em revisão (mesmo EAN, embalagem ou quantidade diferente; **fora do comparador**): **{len(revisar)}**.\n")
    if revisar:
        out.append("### 4.1 Pares em revisão (não aparecem no comparador)\n")
        out.append("| Rede A — nome | Rede B — nome | Motivo |\n|---|---|---|")
        for p in revisar[:20]:
            out.append(f"| {ROTULOS.get(p['a']['rede'], p['a']['rede'])} — {p['a']['nome']} | "
                       f"{ROTULOS.get(p['b']['rede'], p['b']['rede'])} — {p['b']['nome']} | {p['motivo']} |")
        out.append("")
    out.append("## 5. Pares com o mesmo EAN e nomes muito diferentes (revisão humana)\n")
    if not divergentes:
        out.append("Nenhum par encontrado com similaridade de nomes abaixo de 0,5 nesta amostra.\n")
    else:
        out.append(f"Critério: mesmo EAN em redes diferentes e similaridade de palavras (Jaccard, sem medidas) < 0,5. "
                   f"Listados {len(divergentes)} (máx. 20). **Não verifiquei qual nome está certo.**\n")
        out.append("A coluna **Status** aplica a regra de embalagem: `revisar` = medida ou número de unidades diferentes "
                   "(fora do comparador); `confirmado` = só redação diferente.\n")
        out.append("| # | EAN | Rede A — nome | Rede B — nome | Similaridade | Status |\n|---|---|---|---|---|---|")
        for i, d in enumerate(divergentes, 1):
            ok, motivo = embalagens_compativeis(d["nome_a"], d["nome_b"])
            status = "confirmado" if ok else f"revisar ({motivo})"
            out.append(f"| {i} | {d['ean'].lstrip('0')} | {ROTULOS.get(d['rede_a'], d['rede_a'])} — {d['nome_a']} | "
                       f"{ROTULOS.get(d['rede_b'], d['rede_b'])} — {d['nome_b']} | {d['similaridade']:.2f} | {status} |")
        out.append("")
    out.append("## 6. Como os vínculos são usados\n")
    out.append("- `scraper/casamento.py` gera os pares com `origem` (`ean` ou `nome`) e `status` (`confirmado` ou `revisar`).")
    out.append("- `scraper/vinculos.py` grava os pares na tabela `vinculo_produto` (migração `backend/database/migration_add_vinculo_produto.sql`), "
               "um registro por par, com `produto_a_id < produto_b_id`. Um vínculo `ean` nunca é rebaixado para `nome`.")
    out.append("- `GET /api/precos/produto/{id}/vinculados` devolve o preço mais recente, por mercado, do produto e dos produtos com "
               "**vínculo confirmado**. Vínculos `revisar` não aparecem.")
    out.append("- Um par vira `revisar` quando o EAN é igual, mas a quantidade ou o número de unidades da embalagem diferem "
               "(ex.: 45g × 6 unidades). Medida ausente num dos lados não prova divergência e não gera `revisar`.")
    return "\n".join(out) + "\n"


def main(argv=None):
    from datetime import date
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--entrada", nargs="+", required=True, type=Path, help="JSON de coleta (qualquer rede)")
    parser.add_argument("--saida", required=True, type=Path)
    parser.add_argument("--consultar-ean", action="store_true",
                        help="Procura os EANs coletados em Atacadão, Master e Stok (2 s por host)")
    args = parser.parse_args(argv)
    registros = [r for caminho in args.entrada for r in json.loads(caminho.read_text(encoding="utf-8"))]
    por_rede = agrupar_por_rede(registros)
    resultado = casar(por_rede)
    direta = presencas(por_rede)
    cruzada = None
    if args.consultar_ean:
        try:
            consulta = consultar_eans(set(direta), direta)
        except (ErroConfiguracao, Bloqueio) as exc:
            print(f"ERRO: {exc}")
            return 1
        cruzada = presencas(por_rede, consulta)
    base = cruzada if cruzada is not None else direta
    texto = renderizar(por_rede, resultado, direta, cruzada, pares_nomes_divergentes(base), data=date.today().isoformat())
    args.saida.write_text(texto, encoding="utf-8")
    print(f"relatório gravado em {args.saida}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
