"""Limpeza determinística do catálogo estático (frontend/src/data.js).

Aplica, nesta ordem, correções que a auditoria do catálogo provou e que não dependem de nova coleta:

1. cópias exatas (mesma rede + idOrigem) e linhas híbridas com preço simulado;
2. nomes com encoding quebrado ('LimÃ£o', "L¿OR");
3. unidade em g/ml com a vírgula/ponto de milhar lido como decimal (1000x);
4. categoria errada por substring (macarrão em hortifruti, sabonete em café...).

Regras de ouro:
- ids "p<N>" são estáveis: linhas só são removidas, nunca renumeradas (favoritos e o mescla com a
  API dependem deles);
- idempotente: rodar de novo sobre o arquivo já limpo não altera nada (`--verificar` sai com 1 se
  ainda houver o que corrigir);
- só usa categorias que já existem em CATEGORIES e nunca baixa o catálogo da internet;
- itens fora de escopo de supermercado (bazar, eletro, pet) só são listados, nunca removidos.

Uso (a partir da raiz do repositório):
    python scraper/limpar_catalogo.py                       # limpa frontend/src/data.js
    python scraper/limpar_catalogo.py --verificar           # não grava; sai 1 se houver o que limpar
    python scraper/limpar_catalogo.py --relatorio docs/LIMPEZA-DO-CATALOGO.md
Depois de limpar, regenere o resumo: cd frontend && node scripts/gerar-catalogo-resumo.mjs
"""
import argparse
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATA_JS = RAIZ / "frontend" / "src" / "data.js"
MARCADOR_PRODUTOS = "export const PRODUCTS = "


# --------------------------------------------------------------------------------------------
# Leitura e escrita do data.js (formato do sincronizador: json.dumps(indent=2, ensure_ascii=False))
# --------------------------------------------------------------------------------------------

def ler_data_js(texto):
    """Devolve (prefixo, produtos, sufixo). `prefixo + json + sufixo` reproduz o arquivo."""
    inicio = texto.find(MARCADOR_PRODUTOS)
    if inicio < 0:
        raise ValueError("data.js sem 'export const PRODUCTS = '")
    inicio += len(MARCADOR_PRODUTOS)
    fim = texto.rindex("]") + 1
    return texto[:inicio], json.loads(texto[inicio:fim]), texto[fim:]


def montar_data_js(prefixo, produtos, sufixo):
    return prefixo + json.dumps(produtos, ensure_ascii=False, indent=2) + sufixo


def atualizar_cabecalho(prefixo, total):
    """O comentário da primeira linha informa '<N> produtos'; mantém o número igual ao real."""
    return re.sub(r"(?m)^(// [^\n]*?:) \d+ produtos,", rf"\1 {total} produtos,", prefixo, count=1)


# --------------------------------------------------------------------------------------------
# 1. Cópias exatas e linhas híbridas
# --------------------------------------------------------------------------------------------

def chave_de_origem(p):
    rede, id_origem = p.get("supermercadoOrigem"), p.get("idOrigem")
    if not rede or id_origem in (None, ""):
        return None
    return (rede, str(id_origem))


def _foto_coerente(p):
    """A foto local de uma linha genuína se chama '<idOrigem>_<hash>.<ext>'. A linha híbrida
    herdou a foto de OUTRA rede (nome de arquivo com outro id) junto com um preço simulado."""
    local = p.get("imageLocal") or ""
    if not local.startswith("/images/produtos/"):
        return False
    return local.rsplit("/", 1)[-1].startswith(f"{p['idOrigem']}_")


def _tem_foto(p):
    return bool(p.get("imageLocal") or p.get("imageUrl"))


def remover_duplicatas(produtos):
    """Remove cópias exatas (mesma rede + idOrigem), mantendo UMA linha por chave.

    Critério explícito para escolher a linha mantida (o catálogo não guarda data de coleta, então
    "preço mais recente" não é mensurável):
      1. a foto é coerente com a origem (descarta a linha híbrida de preço simulado);
      2. tem foto;
      3. primeira ocorrência (menor posição no arquivo).
    Devolve (produtos_sem_copias, achados).
    """
    grupos = defaultdict(list)
    for i, p in enumerate(produtos):
        chave = chave_de_origem(p)
        if chave:
            grupos[chave].append(i)

    removidas, divergentes, descartar = [], [], set()
    for chave, indices in grupos.items():
        if len(indices) < 2:
            continue
        mantida = min(indices, key=lambda i: (not _foto_coerente(produtos[i]), not _tem_foto(produtos[i]), i))
        ref = produtos[mantida]
        precos = {ref["id"]: ref.get("prices")}
        houve_divergencia = False
        motivos = set()
        for i in indices:
            if i == mantida:
                continue
            copia = produtos[i]
            hibrida = _foto_coerente(ref) and not _foto_coerente(copia) and copia.get("prices") != ref.get("prices")
            motivo = "hibrida_preco_simulado" if hibrida else "copia_exata"
            motivos.add(motivo)
            removidas.append({"id": copia["id"], "mantida": ref["id"], "motivo": motivo})
            descartar.add(i)
            precos[copia["id"]] = copia.get("prices")
            houve_divergencia = houve_divergencia or copia.get("prices") != ref.get("prices")
        if houve_divergencia:
            if "hibrida_preco_simulado" in motivos:
                criterio = "coerencia_com_a_origem"
            elif mantida != indices[0]:
                criterio = "foto"
            else:
                criterio = "primeira_ocorrencia"
            divergentes.append({"chave": "|".join(chave), "mantida": ref["id"], "criterio": criterio, "precos": precos})

    saida = [p for i, p in enumerate(produtos) if i not in descartar]
    return saida, {"removidas": removidas, "precos_divergentes": divergentes}


# --------------------------------------------------------------------------------------------
# 2. Nomes com encoding quebrado
# --------------------------------------------------------------------------------------------

# UTF-8 lido como Latin-1: 'ã' (C3 A3) vira 'Ã£'. Só repara sequências que decodificam em UTF-8 válido.
_MOJIBAKE = re.compile("(?:[\u00c2-\u00f4][\u0080-\u00bf])+")
# O apóstrofo de "L'OR" e "D'Italia" chegou como '¿' colado nas letras
_INTERROGACAO_INVERTIDA = re.compile("(?<=[A-Za-z\u00c0-\u00ff])\u00bf(?=[A-Za-z\u00c0-\u00ff])")
CAMPOS_DE_TEXTO = ("name", "descricao", "brand")


def _reparar_sequencia(m):
    try:
        return m.group(0).encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return m.group(0)


def corrigir_texto(texto):
    return _INTERROGACAO_INVERTIDA.sub("'", _MOJIBAKE.sub(_reparar_sequencia, texto))


def corrigir_encoding(produtos):
    """Repara name, descricao e brand. Devolve (produtos, alterados)."""
    saida, alterados = [], []
    for p in produtos:
        novo, campos = p, []
        for campo in CAMPOS_DE_TEXTO:
            valor = p.get(campo)
            if isinstance(valor, str):
                reparado = corrigir_texto(valor)
                if reparado != valor:
                    if novo is p:
                        novo = dict(p)
                    novo[campo] = reparado
                    campos.append(campo)
        if campos:
            alterados.append({"id": p["id"], "campos": campos, "antes": p.get("name"), "depois": novo.get("name")})
        saida.append(novo)
    return saida, alterados


# --------------------------------------------------------------------------------------------
# 3. Unidade em g/ml lida 1000x errada
# --------------------------------------------------------------------------------------------

# '1,250g' / '1.175g' / '0,500g': separador de MILHAR lido como decimal (1 dígito + 3 casas, em gramas)
_GRAMAS_MILHAR = re.compile(r"^\s*(\d)[.,](\d{3})\s*g\s*$", re.IGNORECASE)
# '1,35ml' / '1,500ml': litros escritos com a unidade de mililitros (valor < 10 com casas decimais)
_MILILITROS_EM_LITROS = re.compile(r"^\s*(\d)[.,](\d{1,3})\s*ml\s*$", re.IGNORECASE)


def _quilos(gramas):
    inteiro, resto = divmod(gramas, 1000)
    casas = f"{resto:03d}".rstrip("0")
    return f"{inteiro},{casas}kg" if casas else f"{inteiro}kg"


def _litros(inteiro, casas):
    casas = casas.rstrip("0")
    return f"{int(inteiro)},{casas}l" if casas else f"{int(inteiro)}l"


def corrigir_unidade(unidade):
    """Devolve a unidade corrigida ou a própria se a evidência não for inequívoca.

    Um produto de supermercado não pesa '1,250 g' (miligrama de precisão) nem tem '1,35 ml': são
    1.250 g (1,25 kg) e 1,35 L. Decimais legítimos de 1 ou 2 casas ('100,8g', '41,5g') não casam.
    """
    m = _GRAMAS_MILHAR.match(unidade or "")
    if m:
        gramas = int(m.group(1)) * 1000 + int(m.group(2))
        return _quilos(gramas) if gramas >= 1000 else f"{gramas}g"
    m = _MILILITROS_EM_LITROS.match(unidade or "")
    if m:
        return _litros(m.group(1), m.group(2))
    return unidade


def corrigir_unidades(produtos):
    saida, alterados = [], []
    for p in produtos:
        antes = p.get("unit")
        depois = corrigir_unidade(antes) if isinstance(antes, str) else antes
        if depois != antes:
            alterados.append({"id": p["id"], "name": p.get("name"), "antes": antes, "depois": depois})
            p = {**p, "unit": depois}
        saida.append(p)
    return saida, alterados


# --------------------------------------------------------------------------------------------
# 4. Categoria por palavra inteira, com prioridade por tipo
# --------------------------------------------------------------------------------------------
#
# O categorizador antigo testava SUBSTRINGS em ordem de ingrediente ('cafe', 'leite', 'oleo',
# 'maca' em 'macarrão'...) e por isso mandava sabonete de café para "Café", macarrão para
# "Hortifruti" e ração para "Açougue". Aqui:
#   - o texto é normalizado (minúsculo, sem acento) e toda palavra é testada com \b;
#   - o TIPO do produto vence o ingrediente: higiene/limpeza/pet/bazar (grupo 0) antes de
#     azeite/vinagre/massas (grupo 1); dentro do grupo vale a palavra-tipo que aparece primeiro no
#     nome ("Limpador Perfumado ... Gotas de Perfume" é limpeza, não perfume);
#   - cada regra lista as categorias em que o item já está bem ('aceitas'); só muda o que está fora
#     delas, o que mantém a mudança mínima e o script idempotente (destino sempre está em aceitas);
#   - nenhuma categoria nova: só as que já existem em CATEGORIES.

NAO_ALIMENTAR = frozenset({"higiene", "limpeza", "bazar"})


def normalizar(texto):
    """Minúsculo, sem acento, espaços colapsados (mesma ideia do NormalizadorTexto do backend)."""
    sem_marcas = "".join(c for c in unicodedata.normalize("NFD", (texto or "").lower()) if unicodedata.category(c) != "Mn")
    return " ".join(sem_marcas.split())


class Regra:
    __slots__ = ("nome", "destino", "padrao", "aceitas", "grupo", "exceto", "fora_de_escopo")

    def __init__(self, nome, destino, padrao, aceitas, grupo, exceto=None, fora_de_escopo=None):
        self.nome = nome
        self.destino = destino
        self.padrao = re.compile(padrao)
        self.aceitas = frozenset(aceitas)
        self.grupo = grupo
        self.exceto = re.compile(exceto) if exceto else None
        self.fora_de_escopo = fora_de_escopo


def _alt(*palavras):
    return r"\b(?:" + "|".join(palavras) + r")\b"


_PET = _alt(
    "racao", r"(?<!lingua de )gatos?", "gatinhos?", "caes", "cao", "cachorros?", "dog chow", "sanol dog", "keldog",
    "pedigree", "whiskas", "friskies", "kite ?kat", "dreamies", "fancy feast", "sheba",
)
_HIGIENE = _alt(
    "sabonetes?", "shampoo", "xampu", "condicionador", "desodorante", r"(?:creme|gel|pasta) (?:dental|de dentes?)",
    "dentifricio", r"escovas? (?:dental|dentais|de dentes?)", "fio dental", r"enxaguante(?: bucal)?",
    r"absorventes?", r"fraldas?", r"lencos? umedecidos?", r"toalhas? umedecidas?", "papel higienico",
    r"(?:creme|locao|gel|leite|oleo|sabonete)s? (?:hidratante|corporal)", r"hidratante (?:corporal|facial|para)",
    "locao", "protetor solar", "bronzeador", "esmaltes?", "removedor de esmalte", "acetona",
    r"deo[- ]?colonia", r"barbeador(?:es)?", "aparelhos? de barbear", r"laminas? de barbear",
    r"(?:creme|espuma|gel) de barbear", r"cotonetes?", "tintura", "coloracao",
    r"creme (?:para|de) (?:pentear|cabelo|tratamento)", r"(?:creme|gel) facial", "gel de limpeza facial",
    r"gel (?:fixador|para cabelos?)", "talco", "preservativos?", "lubrificante", "kit shampoo",
) + r"|^(?:mascara|serum|sh|pomada|perfume|colonia)\b"
_LIMPEZA = _alt(
    "detergentes?", "sabao", r"lava[- ]?(?:roupas?|loucas?)", "amaciante", "desinfetante", r"desinf\.?",
    "agua sanitaria", "alvejante", r"limpador(?:es)?", r"limpa[- ](?:vidros|pisos?|forno|aluminio|moveis|banheiro|tudo)",
    "desengordurante", r"(?:multi[- ])?inseticidas?", "raticida", "formicida", "repelente",
    "palha de aco", r"panos? (?:de chao|multiuso|de limpeza|de prato)", "flanela", "rodo", "vassoura",
    r"sacos? (?:para|de) lixo", "papel toalha", r"purificador(?:es)?(?: de (?:ar|ambiente))?",
    r"aromatizador(?:es)?(?: de ambiente)?", "odorizador", "saponaceo", "cloro", r"tira[- ]?manchas",
    "vanish", "pastilha adesiva", "vaso sanitario", "naftalina", r"difusor(?:es)? de aromas?", "desumidificador",
    "aromatizante de ambiente", r"(?:dif|desumidif)\.secar",
) + r"|^esponjas?\b"
_BAZAR_CASA = (
    r"^(?:jogo|conjunto|kit) (?:de )?(?:\d+ )?(?:copos?|tacas?|xicaras?|garfos?|facas?|colher(?:es)?|talheres?|potes?|pratos?|panelas?)\b"
    r"|^(?:chinelos?|sandalias?|varal|panelas?|frigideiras?|cafeteiras?|chaleiras?|fritadeiras?|abridor|peneiras?|velas?|"
    r"brinquedos?|porta|tapete|tabua|lancheira|marmita|xicaras?|oxford|caixa de som|caixa de isopor|caixa termica|"
    r"coador de pano|colher(?:es)?|copos?|tacas?|canecas?|facas?|garfos?|espatulas?|plaina|cortador|amassador|espremedor|"
    r"socador|mesinha|vaso|suporte|acucareiro|lanca[- ]agua|embalagem para|caixa para (?:cesta|pizza)|"
    r"sacos? para (?:assar|freezer)|kit para decoracao|papel sulfite|"
    r"pratos? (?:de|para|plastico|raso|fundo|sobremesa|veneza))\b"
    r"|^forma\b.*\b(?:bolo|pudim|gelo|pizza)\b"
    r"|\bgarrafa termica\b|\b(?:220|127|110) ?v\b|\bbivolt\b"
)
_BAZAR_DESCARTAVEL = (
    r"^papel (?:manteiga|aluminio|filme|laminado)\b|^filme (?:pvc|plastico)\b|^guardanapos?\b"
    r"|^(?:colher(?:es)?|garfos?|copos?|pratos?) descartaveis?\b"
)
_AZEITE_VINAGRE = r"^(?:azeite|vinagre)\b|^oleo (?:de )?(?:soja|girassol|milho|canola|coco|algodao|oliva|composto|palma)\b"
_MASSA_FRESCA = (
    r"^(?:lasanha|lasagna|ravioli|capeletti|capeleti|capelete|tortellini|agnoline|agnolini|nhoque|rondelli|canelone|cannelloni)\b"
    r"|^massa (?:fresca|recheada|tortellini)\b|^massa (?:\w+ )?para lasanha\b"
    r"|^(?:fettuccine|fetuccine|espaguete|penne|talharim) .*\b(?:seara|sadia|perdigao)\b"
    r"|^macarrao\b.*\b(?:congelad[oa]s?|ravioli|capeletti|tortellini|agnoline)\b"
)
_MASSA_SECA = (
    r"^(?:macarrao|espaguete|spaghetti|spaghettini|talharim|penne|fusilli|rigatoni|rigatone|fettuccine|fetuccine|"
    r"linguine|farfalle|tagliatelle|pappardelle|cabelo de anjo|miojo|lamen|cup noodles|yakissoba)\b"
    r"|^massa\b.*\b(?:semola|ovos|espaguete|parafuso|penne|talharim|rigatone|rigatoni|tortiglione|linguine|macarrao)\b"
)

REGRAS = (
    Regra("pet", "bazar", _PET, NAO_ALIMENTAR, 0, fora_de_escopo="pet"),
    Regra("higiene", "higiene", _HIGIENE, NAO_ALIMENTAR, 0),
    Regra("limpeza", "limpeza", _LIMPEZA, NAO_ALIMENTAR, 0, exceto=r"\bcarnes?\b|\btempero\b"),
    Regra("bazar_casa", "bazar", _BAZAR_CASA, NAO_ALIMENTAR, 0, fora_de_escopo="casa/eletro"),
    Regra("bazar_descartavel", "bazar", _BAZAR_DESCARTAVEL, NAO_ALIMENTAR, 0),
    Regra("azeite_vinagre", "oleos", _AZEITE_VINAGRE, {"oleos", "mercearia"}, 1),
    Regra("massa_fresca", "congelados", _MASSA_FRESCA, {"congelados", "mercearia"}, 1),
    Regra("massa_seca", "mercearia", _MASSA_SECA, {"mercearia", "graos"}, 1,
          exceto=r"\bcongelad[oa]s?\b|\b(?:ravioli|capeletti|capeleti|tortellini|agnoline)\b"),
)


def regra_do_nome(nome):
    """A regra de tipo que vale para o nome (ou None). Grupo 0 (não alimentar) vence o grupo 1;
    dentro do grupo, vence a palavra-tipo que aparece primeiro; empate fica com a ordem de REGRAS."""
    texto = normalizar(nome)
    melhor = None
    for ordem, regra in enumerate(REGRAS):
        achado = regra.padrao.search(texto)
        if not achado or (regra.exceto and regra.exceto.search(texto)):
            continue
        chave = (regra.grupo, achado.start(), ordem)
        if melhor is None or chave < melhor[0]:
            melhor = (chave, regra)
    return melhor[1] if melhor else None


def recategorizar(nome, categoria_atual):
    """(nova_categoria, nome_da_regra) quando a categoria atual está errada pela regra; senão None."""
    regra = regra_do_nome(nome)
    if regra is None or categoria_atual in regra.aceitas:
        return None
    return regra.destino, regra.nome


def recategorizar_produtos(produtos):
    saida, alterados = [], []
    for p in produtos:
        achado = recategorizar(p.get("name", ""), p.get("category"))
        if achado:
            destino, regra = achado
            alterados.append({"id": p["id"], "name": p.get("name"), "antes": p.get("category"), "depois": destino, "regra": regra})
            p = {**p, "category": destino}
        saida.append(p)
    return saida, alterados


# --------------------------------------------------------------------------------------------
# Itens fora de escopo de supermercado: só listar, a decisão de escopo é do grupo
# --------------------------------------------------------------------------------------------

def listar_fora_de_escopo(produtos):
    """Pet e casa/eletro (tableware, eletrodoméstico, calçado...). Nunca remove nada."""
    achados = []
    for p in produtos:
        regra = regra_do_nome(p.get("name", ""))
        if regra is not None and regra.fora_de_escopo:
            achados.append({"id": p["id"], "name": p.get("name"), "category": p.get("category"),
                            "rede": p.get("supermercadoOrigem"), "tipo": regra.fora_de_escopo})
    return achados


# --------------------------------------------------------------------------------------------
# Pipeline, relatório e linha de comando
# --------------------------------------------------------------------------------------------

def limpar(produtos):
    """Aplica todas as correções, nesta ordem. Não altera a lista recebida."""
    produtos, duplicatas = remover_duplicatas(produtos)
    produtos, encoding = corrigir_encoding(produtos)
    produtos, unidades = corrigir_unidades(produtos)
    produtos, categorias = recategorizar_produtos(produtos)
    return produtos, {"duplicatas": duplicatas, "encoding": encoding, "unidades": unidades, "categorias": categorias}


def ha_mudancas(rel):
    return bool(rel["duplicatas"]["removidas"] or rel["encoding"] or rel["unidades"] or rel["categorias"])


def _tabela(cabecalho, linhas):
    saida = ["| " + " | ".join(cabecalho) + " |", "|" + "|".join("---" for _ in cabecalho) + "|"]
    saida += ["| " + " | ".join(str(c).replace("|", "\\|") for c in linha) + " |" for linha in linhas]
    return saida


def _preco(p):
    return ", ".join(f"{k} {v:.2f}".replace(".", ",") for k, v in (p.get("prices") or {}).items()) or "sem preço"


def gerar_relatorio(antes, depois, rel, fora_de_escopo):
    """Markdown determinístico (sem datas) com tudo o que a limpeza alterou."""
    por_id = {p["id"]: p for p in antes}
    redes = sorted({p.get("supermercadoOrigem") for p in antes} | {p.get("supermercadoOrigem") for p in depois})
    antes_por_rede, depois_por_rede = Counter(p.get("supermercadoOrigem") for p in antes), Counter(p.get("supermercadoOrigem") for p in depois)
    removidas = rel["duplicatas"]["removidas"]
    hibridas = [r for r in removidas if r["motivo"] == "hibrida_preco_simulado"]
    copias = [r for r in removidas if r["motivo"] == "copia_exata"]
    por_regra = Counter(a["regra"] for a in rel["categorias"])

    L = [
        "# Limpeza do catálogo (`frontend/src/data.js`)",
        "",
        "Relatório gerado por `scraper/limpar_catalogo.py` na execução que alterou o catálogo. Rodar o script de novo sobre o "
        "arquivo já limpo não altera nada (`python scraper/limpar_catalogo.py --verificar` sai com 0), por isso este texto é um "
        "registro da execução original e não é reescrito. Origem das correções: auditoria do catálogo e da coleta.",
        "",
        "Os ids `p<N>` são estáveis: as linhas removidas deixam buracos na numeração e nenhuma foi renumerada (favoritos e o "
        "mescla com a API dependem deles).",
        "",
        "## Resumo",
        "",
        f"- Linhas em `PRODUCTS`: **{len(antes)} -> {len(depois)}** ({len(antes) - len(depois)} removidas).",
        f"- Cópias exatas removidas: **{len(copias)}**; linhas híbridas com preço simulado removidas: **{len(hibridas)}**.",
        f"- Categorias corrigidas: **{len(rel['categorias'])}** itens ("
        + ", ".join(f"{regra} {n}" for regra, n in sorted(por_regra.items())) + ").",
        f"- Unidades 1000x corrigidas: **{len(rel['unidades'])}**; nomes com encoding quebrado corrigidos: **{len(rel['encoding'])}**.",
        "",
        "Linhas por rede de origem:",
        "",
    ]
    L += _tabela(["Rede", "Antes", "Depois", "Removidas"],
                 [(r, antes_por_rede[r], depois_por_rede[r], antes_por_rede[r] - depois_por_rede[r]) for r in redes])

    L += ["", "## 1. Cópias exatas (mesma rede + idOrigem)", "",
          "Critério para escolher a linha que fica, em ordem: (1) foto coerente com a origem (o arquivo local se chama "
          "`<idOrigem>_<hash>`); (2) tem foto; (3) primeira ocorrência. O catálogo não guarda data de coleta, então "
          "\"preço mais recente\" não é mensurável e nunca foi usado como critério.", ""]
    L += _tabela(["Removida", "Mantida", "Rede", "Nome"],
                 [(r["id"], r["mantida"], por_id[r["id"]].get("supermercadoOrigem"), por_id[r["id"]].get("name")) for r in copias])

    L += ["", "### Grupos com preço divergente entre as cópias", "",
          "Decisão explícita para cada um: a linha mantida é a genuína da rede (foto e arquivo coerentes com o idOrigem); a "
          "removida é a híbrida, descrita na seção 2.", ""]
    L += _tabela(["Chave (rede, idOrigem)", "Mantida", "Critério", "Preços por id"],
                 [(d["chave"].replace("|", ", "), d["mantida"], d["criterio"], "; ".join(f"{i}: {_preco({'prices': pr})}" for i, pr in d["precos"].items()))
                  for d in rel["duplicatas"]["precos_divergentes"]])

    L += ["", "## 2. Linhas híbridas com preço simulado e rede de origem trocada", "",
          "Cada uma foi confirmada nos dados antes de sair: tem a mesma rede + idOrigem + URL de uma linha genuína que continua no "
          "catálogo, a foto é de OUTRA rede (nome de arquivo com outro id e CDN diferente) e o preço difere do da linha genuína "
          "(ex.: p392 custa R$ 20,30 sem promoção, com precoNormal 15,98). As linhas reais já existem em outros ids.", ""]
    linhas = []
    for r in hibridas:
        h, real = por_id[r["id"]], por_id[r["mantida"]]
        normal = h.get("precoNormal")
        linhas.append((r["id"], h.get("supermercadoOrigem"), h.get("name"), _preco(h),
                       "-" if normal is None else f"{normal:.2f}".replace(".", ","), f"{r['mantida']}: {_preco(real)}",
                       (h.get("imageLocal") or "").rsplit("/", 1)[-1], h.get("idOrigem")))
    L += _tabela(["Removida", "Rede", "Nome", "Preço da híbrida", "precoNormal da híbrida", "Linha real mantida",
                  "Arquivo da foto (de outro id)", "idOrigem"], linhas)

    L += ["", "## 3. Categoria por palavra inteira", "",
          "Regras com palavra inteira (`\\b`), texto sem acento e prioridade por TIPO: higiene, limpeza, pet e bazar vencem azeite/vinagre "
          "e massas; dentro do grupo vale a palavra-tipo que aparece primeiro no nome. Só usa categorias que já existem; "
          "item que já está numa categoria aceita pela regra não é mexido. Pet não tem categoria própria e foi para `bazar` "
          "(fora da categoria alimentar); criar `pet` é decisão do grupo.", ""]
    L += _tabela(["Regra", "Destino", "Itens"], [(r.nome, r.destino, por_regra[r.nome]) for r in REGRAS])
    L += ["", "Antes e depois de cada item:", ""]
    L += _tabela(["Id", "Nome", "Antes", "Depois", "Regra"], [(a["id"], a["name"], a["antes"], a["depois"], a["regra"]) for a in rel["categorias"]])

    L += ["", "## 4. Unidade em g/ml lida 1000x errada", "",
          "Só foi corrigido o que a evidência torna inequívoco: `d,ddd g` / `d.ddd g` (um produto não pesa miligramas: é o milhar "
          "lido como decimal) e `d,dd ml` (mililitros com casas decimais é litro). Decimais legítimos como `100,8g`, `41,5g` e "
          "`112,5g` (o próprio nome traz o mesmo número) não foram tocados: a contagem de ~60 da auditoria incluía esses casos.", ""]
    L += _tabela(["Id", "Nome", "Antes", "Depois"], [(u["id"], u["name"], u["antes"], u["depois"]) for u in rel["unidades"]])
    L += ["", "Observados e não corrigidos (outro defeito, fora deste critério): p6003 (unidade `5,1g` vem de "
          "\"5,1g de Proteína\", o pacote é 270g); p662, p663, p664 (`5g` de uma cápsula, em caixa de 10).", ""]

    L += ["## 5. Nomes com encoding quebrado", "",
          "UTF-8 lido como Latin-1 (`LimÃ£o` -> `Limão`) e o apóstrofo que chegou como `¿` (`L¿OR` -> `L'OR`). "
          "Aplicado a nome, descrição e marca.", ""]
    L += _tabela(["Id", "Campos", "Antes", "Depois"], [(e["id"], ", ".join(e["campos"]), e["antes"], e["depois"]) for e in rel["encoding"]])

    L += ["", "## 6. Itens fora de supermercado (só listados, nenhum foi removido)", "",
          f"{len(fora_de_escopo)} itens de pet e casa/eletro. A decisão de escopo (manter, criar categoria `pet`, filtrar na coleta) "
          "é do grupo. Todos continuam no catálogo, na categoria `bazar` ou na que já estavam.", ""]
    L += _tabela(["Id", "Tipo", "Rede", "Categoria hoje", "Nome"],
                 [(f["id"], f["tipo"], f["rede"], f["category"], f["name"]) for f in fora_de_escopo])
    return "\n".join(L) + "\n"


def _resumo_texto(antes, depois, rel):
    por_regra = Counter(a["regra"] for a in rel["categorias"])
    linhas = [
        f"linhas: {len(antes)} -> {len(depois)}",
        f"duplicatas removidas: {len(rel['duplicatas']['removidas'])} "
        f"({sum(1 for r in rel['duplicatas']['removidas'] if r['motivo'] == 'hibrida_preco_simulado')} híbridas)",
        f"encoding corrigido: {len(rel['encoding'])}",
        f"unidades corrigidas: {len(rel['unidades'])}",
        f"categorias corrigidas: {len(rel['categorias'])} " + str(dict(sorted(por_regra.items()))),
    ]
    return "\n".join(linhas)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Limpeza determinística do catálogo (frontend/src/data.js).")
    ap.add_argument("--data-js", type=Path, default=DATA_JS, help="caminho do data.js (padrão: frontend/src/data.js)")
    ap.add_argument("--verificar", action="store_true", help="não grava; sai com 1 se ainda houver o que limpar")
    ap.add_argument("--relatorio", type=Path, help="grava o relatório Markdown (só quando há mudanças)")
    args = ap.parse_args(argv)

    with open(args.data_js, encoding="utf-8", newline="") as f:
        bruto = f.read()
    crlf = "\r\n" in bruto
    prefixo, produtos, sufixo = ler_data_js(bruto)
    novos, rel = limpar(produtos)

    if not ha_mudancas(rel):
        print("Catálogo já está limpo: nada a fazer.")
        return 0
    print(_resumo_texto(produtos, novos, rel))
    if args.verificar:
        print("Há pendências: rode `python scraper/limpar_catalogo.py`.", file=sys.stderr)
        return 1

    texto = montar_data_js(atualizar_cabecalho(prefixo, len(novos)), novos, sufixo)
    if crlf:
        texto = texto.replace("\r\n", "\n").replace("\n", "\r\n")
    temporario = args.data_js.with_name(args.data_js.name + ".tmp")
    with open(temporario, "w", encoding="utf-8", newline="") as f:
        f.write(texto)
    temporario.replace(args.data_js)
    if args.relatorio:
        args.relatorio.write_text(gerar_relatorio(produtos, novos, rel, listar_fora_de_escopo(novos)), encoding="utf-8")
        print(f"Relatório gravado em {args.relatorio}")
    print("Regenere o resumo: cd frontend && node scripts/gerar-catalogo-resumo.mjs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
