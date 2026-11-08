"""Casamento de produtos entre redes em camadas de confiança (T1..T4 e T0 por foto idêntica).

Este módulo alimenta o arquivo frontend/src/data/equivalentes.json (ver gerar_equivalentes.py). Ele NÃO
substitui scraper/casamento.py, que continua valendo para o pipeline de carga (EAN e chave idêntica).

Camadas (todas exigem redes diferentes, mesma marca canônica, mesma embalagem e mesmas variantes duras):

  T1  chave idêntica atual de casamento.py (marca + nome sem medida + quantidade), mais a guarda de
      embalagem deste módulo.
  T2  estrito: marca, embalagem e todos os tokens de conteúdo, de embalagem e de tipo iguais, ainda que em
      outra ordem ("Iogurte Natural Nestlé Desnatado 160g" x "Iogurte Nestlé Natural Desnatado 160g").
  T3  como T2, porém um lado omite palavra de embalagem ou de tipo ("Creme de Leite 200g" x "... Tetra Pak 200g").
  T4  como T2/T3, porém a marca de um dos lados foi RECUPERADA do nome (o campo veio vazio ou era um
      placeholder da rede, como "Geral").
  T0  mesma foto no CDN (ignorando assinatura e tamanho), com todas as guardas aprovadas.

Uma camada mais frouxa (T5, "diferença de uma palavra com evidência") foi medida e NÃO é usada aqui.

DECISÃO DE CONFIANÇA (medições de dois juízes independentes sobre 40 pares aleatórios por camada):

  T1  100,0% (73 grupos)                          => confirmado
  T2   97,5% (205 grupos)                         => confirmado
  T3   82,5% (88 grupos)                          => provavel
  T4   85,0% (45 grupos)                          => provavel
  T5   77,5% (52 grupos)                          => fora do arquivo
  T0  precisão estrita 0,90 (36 sim, 1 não, 0 divergentes, 3 incertos em 40; 167 dos 396 pares com a mesma
      foto foram barrados pelas guardas). Regra: precisão estrita >= 0,90 E nenhum "não" => confirmado;
      precisão estrita >= 0,75 => provável; senão fora. Houve 1 "não" (Lux Botanicals Buquê de Jardim x
      Lux Suave Buquê de Jasmim: fragrâncias diferentes), logo a primeira regra falha e vale a segunda
      => provavel.

"confirmado" pode entrar na comparação e no "menor preço". "provavel" só aparece com o selo "provável
mesmo produto" e nunca conta para o "menor preço".

Fusão: o mesmo item pode ser candidato em camadas diferentes; vale a de maior confiança. Um grupo só cresce
se TODAS as guardas valerem entre TODOS os pares do grupo (A=B e B=C não garante A=C), com no máximo um item
por rede, e um id pertence a no máximo um grupo. A confiança do grupo é a do seu elo mais fraco.
"""
import collections
import itertools
import re
import unicodedata
from decimal import Decimal

from casamento import chave_nome_identica

# ------------------------------------------------------------------ confiança por camada

DECISAO_CONFIANCA = {
    "T1": ("confirmado", "precisão 100,0% nos 40 pares julgados"),
    "T2": ("confirmado", "precisão 97,5% nos 40 pares julgados"),
    "T3": ("provavel", "precisão 82,5% nos 40 pares julgados"),
    "T4": ("provavel", "precisão 85,0% nos 40 pares julgados"),
    "T5": (None, "precisão 77,5%: o mais frouxo, não entra no arquivo"),
    "T0": ("provavel", "foto idêntica: precisão estrita 0,90 mas com 1 'não' em 40 (fragrâncias diferentes); "
                       "confirmado exigiria >= 0,90 e nenhum 'não'; >= 0,75 => provável"),
}
CONFIANCA_POR_CAMADA = {c: conf for c, (conf, _) in DECISAO_CONFIANCA.items() if conf}

# do mais confiável ao menos confiável (precisão medida); desempata a escolha do melhor grupo
ORDEM_CAMADAS = ("T1", "T2", "T0", "T4", "T3")
_RANK = {c: i for i, c in enumerate(ORDEM_CAMADAS)}


def pior_camada(a, b):
    return a if _RANK[a] >= _RANK[b] else b


# ------------------------------------------------------------------ texto


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s.casefold()) if not unicodedata.combining(c))


def compacto(s):
    return re.sub(r"[^a-z0-9]", "", sem_acento(s))


# ------------------------------------------------------------------ embalagem

_UN = {  # sinônimo -> (unidade-base, fator)
    "kg": ("g", Decimal(1000)), "kgs": ("g", Decimal(1000)), "quilo": ("g", Decimal(1000)), "quilos": ("g", Decimal(1000)),
    "g": ("g", Decimal(1)), "gr": ("g", Decimal(1)), "grs": ("g", Decimal(1)), "gramas": ("g", Decimal(1)), "grama": ("g", Decimal(1)),
    "mg": ("g", Decimal("0.001")),
    "l": ("ml", Decimal(1000)), "lt": ("ml", Decimal(1000)), "lts": ("ml", Decimal(1000)),
    "litro": ("ml", Decimal(1000)), "litros": ("ml", Decimal(1000)),
    "ml": ("ml", Decimal(1)), "mls": ("ml", Decimal(1)), "mililitros": ("ml", Decimal(1)),
    "m": ("m", Decimal(1)), "mt": ("m", Decimal(1)), "mts": ("m", Decimal(1)), "metros": ("m", Decimal(1)), "metro": ("m", Decimal(1)),
    "cm": ("cm", Decimal(1)),
}
_UN_RE = "|".join(sorted(_UN, key=len, reverse=True))
_NUM = r"(\d+(?:[.,]\d+)?)"
_PACK_NOUN = (r"(?:unidades?|unids?|unid|und|unds|un|rolos?|saches?|capsulas?|discos?|latas?|garrafas?|pacotes?|pcts?|"
              r"pcs|pecas?|itens|tabletes?|doses?|bandejas?|potes?|caixas?|frascos?|bisnagas?|copos?|barras?|tiras?|refis?|sabonetes?|ovos?)")
_PACK_NOUN_PLURAL = (r"(?:unidades|unids|unid|unds|und|rolos|saches|capsulas|discos|latas|garrafas|pacotes|pcts|pcs|pecas|itens|tabletes|"
                     r"doses|bandejas|potes|caixas|frascos|bisnagas|copos|barras|tiras|refis|sabonetes|ovos)")

_RE_X_PRE = re.compile(r"(?<![\w.,])(\d{1,3})\s*[x×]\s*" + _NUM + r"\s*(" + _UN_RE + r")(?![a-z0-9])")
_RE_X_POS = re.compile(r"(?<![\w.,])" + _NUM + r"\s*(" + _UN_RE + r")\s*[x×]\s*(\d{1,3})(?![\d.,a-z])")
_RE_DIM = re.compile(r"(?<![\w.,])(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?\s*(cm|mm|m)(?![a-z0-9])")
_RE_LEVE = re.compile(r"\bleve\s+(\d{1,3})\s+pague\s+(\d{1,3})(?:\s+" + _PACK_NOUN + r")?\b")
_RE_PACK_COM = re.compile(r"(?<![\w.,])(?:com|c/|cx\s+c/|caixa\s+com|pack|embalagem\s+com|kit\s+com|[-|])\s*(\d{1,4})\s*" + _PACK_NOUN + r"(?![a-z0-9])")
_RE_PACK_NOUN = re.compile(r"(?<![\w.,x×])(\d{1,4})\s*" + _PACK_NOUN_PLURAL + r"(?![a-z0-9])")
_RE_MEDIDA = re.compile(r"(?<![\w.,])" + _NUM + r"\s*(" + _UN_RE + r")(?![a-z0-9])")
_RE_DE_A = re.compile(r"\bde\s+\d+\s+a\s+\d+\b|aproximad|em media|\bpeso variavel\b|\bmedia de\b")
_RE_KIT = re.compile(r"\bkit\b(?!\s*kat)")
_RE_SOMA = re.compile(r"\d\s*(?:" + _UN_RE + r")(?![a-z0-9])\s*(?:\+|\be\b|\bmais\b)\s*[a-z ]{0,25}\d+(?:[.,]\d+)?\s*(?:" + _UN_RE + r")(?![a-z0-9])")


def _dec(s):
    return Decimal(s.replace(",", "."))


def _base(valor, unid):
    b, f = _UN[unid]
    return b, (_dec(valor) * f).normalize()


def _fmt(d):
    return format(d.normalize(), "f")


def parse_embalagem(nome_norm, campo_unidade):
    """Lê a embalagem de um nome (sem acento, minúsculo) e, na falta de medida, do campo `unidade`.

    Devolve dict: ok, motivo (se não ok), base (g/ml/m/cm/un/dim), tam (texto), pack (unidades por
    embalagem), estilo (x/leve/suf/granel/None), promo, texto_removido (nome sem a embalagem).
    """
    t = nome_norm.replace("|", " | ")
    res = {"ok": False, "motivo": None, "base": None, "tam": None, "pack": 1, "estilo": None,
           "promo": False, "texto_removido": t}
    if _RE_KIT.search(t) or _RE_SOMA.search(t):
        res["motivo"] = "kit_composto"
        return res
    if _RE_DE_A.search(t):
        res["motivo"] = "peso_variavel"
        return res
    resto = t
    medidas = []
    pack, estilo, promo = 1, None, False
    dim = _RE_DIM.search(t)
    if dim:
        partes = [dim.group(1), dim.group(2)] + ([dim.group(3)] if dim.group(3) else [])
        medidas.append(("dim", "x".join(sorted(_fmt(_dec(p)) for p in partes)) + dim.group(4)))
        resto = resto[:dim.start()] + " " + resto[dim.end():]
    m = _RE_LEVE.search(resto)
    if m:
        pack, estilo, promo = int(m.group(1)), "leve", True
        resto = resto[:m.start()] + " " + resto[m.end():]
    m = _RE_X_PRE.search(resto)
    m2 = _RE_X_POS.search(resto)
    if m:
        pk = int(m.group(1))
        medidas.append(_base(m.group(2), m.group(3)))
        pack, estilo = (max(pack, pk) if estilo == "leve" else pk), "x"
        resto = resto[:m.start()] + " " + resto[m.end():]
    elif m2:
        pk = int(m2.group(3))
        medidas.append(_base(m2.group(1), m2.group(2)))
        pack, estilo = pk, "x"
        resto = resto[:m2.start()] + " " + resto[m2.end():]
    for mm in list(_RE_PACK_COM.finditer(resto)):  # "com N unidades"
        n = int(mm.group(1))
        if n > 1:
            if estilo is None:
                pack, estilo = n, "suf"
            elif n != pack:
                res["motivo"] = "pack_conflitante"
                return res
    resto = _RE_PACK_COM.sub(" ", resto)
    if estilo is None:
        pns = [int(mm.group(1)) for mm in _RE_PACK_NOUN.finditer(resto) if int(mm.group(1)) > 1]
        if len(set(pns)) == 1:
            pack, estilo = pns[0], "suf"
        elif len(set(pns)) > 1:
            res["motivo"] = "pack_ambiguo"
            return res
        resto = _RE_PACK_NOUN.sub(" ", resto)
    for mm in _RE_MEDIDA.finditer(resto):
        medidas.append(_base(mm.group(1), mm.group(2)))
    resto = _RE_MEDIDA.sub(" ", resto)
    if len(set(medidas)) > 1:
        res["motivo"] = "medidas_multiplas"
        return res
    if not medidas:  # sem medida no nome: tenta o campo unidade do catálogo
        cu = sem_acento(campo_unidade or "")
        mu = _RE_MEDIDA.search(cu)
        mp = re.match(r"^\s*(\d+)\s*" + _PACK_NOUN + r"\s*$", cu)
        if mu and not re.match(r"^\s*1\s*un\s*$", cu):
            medidas.append(_base(mu.group(1), mu.group(2)))
        elif mp and int(mp.group(1)) > 1 and estilo is None:
            medidas.append(("un", Decimal(int(mp.group(1)))))
        elif estilo is not None and pack > 1:
            medidas.append(("un", Decimal(pack)))  # só a contagem é conhecida
            pack, estilo = 1, None
        elif re.search(r"(?<![a-z0-9])(?:kg|quilo|quilos)(?![a-z0-9])", resto):
            medidas.append(("g", Decimal(1000)))
            estilo, pack = "granel", 1
        else:
            res["motivo"] = "sem_medida"
            return res
    base, tam = medidas[0]
    res.update(ok=True, base=base, tam=tam if isinstance(tam, str) else _fmt(tam), pack=pack, estilo=estilo,
               promo=promo, texto_removido=resto)
    return res


def embalagens_equivalentes(a, b):
    """a, b: saída de parse_embalagem com ok=True. Estrito: mesma unidade-base, tamanho e nº de unidades."""
    if a["base"] != b["base"] or a["pack"] != b["pack"]:
        return False
    if "granel" in (a["estilo"], b["estilo"]) and a["estilo"] != b["estilo"]:
        return False
    return a["tam"] == b["tam"] and (a["estilo"] == b["estilo"] or a["pack"] == 1)


def _contagem_equivalente(ea, eb):
    """Um nome dá só a contagem ('Com 10 Cápsulas') e o outro 'N x peso' ('10x5g'): mesma contagem de unidades."""
    for x, y in ((ea, eb), (eb, ea)):
        if x["base"] == "un" and x["pack"] == 1 and y["base"] != "un" and y["pack"] > 1 and Decimal(x["tam"]) == y["pack"]:
            return True
    return False


# ------------------------------------------------------------------ tokens

# frases -> token canônico (aplicadas ao texto já sem acento)
_FRASES = [
    (r"\bsem\s+gas\b|\bnatural\s+sem\s+gas\b", " semgas "),
    (r"\bcom\s+gas\b|\bgaseificada\b", " comgas "),
    (r"\baerosol\b|\baerossol\b", " aerossol "),
    (r"\bpet\b|\bgarrafa\b|\blong\s*neck\b|\blongneck\b", " garrafa "),
    (r"\bcabelo\s+de\s+anjo\b", " cabeloanjo "),
    (r"\blava[\s-]+lou[cç]as?\b", " detergente "),
    (r"\blava[\s-]+roupas?\b", " sabao "),
    (r"\bmaizena\b", " maisena "),
    (r"\bzero\s+lactose\b|\bsem\s+lactose\b|\blac\s*free\b|\blacfree\b|\bdelactose\b|\bdelac\b|\blivre\s+de\s+lactose\b|\b0%?\s+lactose\b|\bsem\s+lact\b", " semlactose "),
    (r"\bbaixa\s+lactose\b", " baixalactose "),
    (r"\bzero\s+acucar\b|\bsem\s+acucar\b|\bsugar\s*free\b|\b0%?\s+acucar\b|\bzero\s+acucares\b|\bs/\s*acucar\b", " zero "),
    (r"\bsem\s+gluten\b|\bgluten\s*free\b|\bs/\s*gluten\b|\bzero\s+gluten\b", " semgluten "),
    (r"\bsem\s+sal\b|\bs/\s*sal\b|\bzero\s+sodio\b|\bsem\s+sodio\b", " semsal "),
    (r"\bsemi\s*[- ]?\s*desnatad[oa]s?\b", " semidesnatado "),
    (r"\bdesnat\b|\bdesnatada\b|\bdesnatados\b", " desnatado "),
    (r"\btetra\s*(?:pak|pack|park)\b|\bcaixinha\b|\bcartonado\b", " tetrapak "),
    (r"\bem\s+po\b", " po "),
    (r"\bem\s+barra\b", " barra "),
    (r"\bem\s+pedacos\b|\bem\s+pedaco\b", " pedacos "),
    (r"\bem\s+capsulas?\b|\bcapsulas?\b|\bcapsula\b", " capsula "),
    (r"\bem\s+cubos?\b", " cubos "),
    (r"\bem\s+fatias?\b|\bfatiad[oa]s?\b", " fatiado "),
    (r"\bem\s+gel\b", " gel "),
    (r"\bembalagem\b|\bemb\b|\bpacote\b|\bpct\b|\bpcte\b|\bpc\b", " "),
    (r"\bc/\s*", " com "),
    (r"\bs/\s*", " sem "),
    (r"\bcoca\s*-?\s*cola\b", " cocacola "),
    (r"\blonga\s+vida\b|\buht\b", " "),
    (r"\btampa\s+rosca\b|\bcom\s+tampa\b|\btampa\s+de\s+rosca\b", " "),
    (r"\bleve\s+mais\s+pague\s+menos\b|\bleve\s+mais\b|\bpague\s+menos\b", " promo "),
    (r"\bgratis\b|\bbrinde\b|\bde\s+brinde\b|\bgrat\b", " promo "),
    (r"\bmenor\s+preco\b|\boferta\b|\bpromocao\b|\bpromo\b|\bimperdivel\b", " promo "),
    (r"\b100\s*%\s*", " "),
    (r"\btipo\s+(\d)\b", r" tipo\1 "),
    (r"\btp\s*(\d)\b", r" tipo\1 "),
    (r"\bn[o°º]?\s*(\d+)\b", r" num\1 "),
    (r"\b(\d)\s+em\s+(\d)\b", r" \1em\2 "),
    (r"\bsabor\b|\bsab\b", " "),
    (r"\bpe\s+de\s+moleque\b", " pedemoleque "),
]
_FRASES = [(re.compile(p), r) for p, r in _FRASES]

_SINONIMOS = {
    "bolacha": "biscoito", "bolachas": "biscoito", "biscoitos": "biscoito", "bisc": "biscoito", "refri": "refrigerante",
    "tradic": "tradicional", "trad": "tradicional", "ext": "extra", "virg": "virgem", "extravirgem": "extra virgem",
    "cremos": "cremoso", "cremosa": "cremoso", "int": "integral",
    "liq": "liquido", "liquida": "liquido", "lav": "lava", "cx": "caixa", "caixinha": "caixa", "pt": "pote",
    "amend": "amendoim", "choc": "chocolate", "chocolates": "chocolate", "moida": "moido", "moidas": "moido",
    "mucarela": "mussarela", "mozzarella": "mussarela", "mozarela": "mussarela",
    "congelada": "congelado", "congeladas": "congelado", "congelados": "congelado",
    "sachet": "sache", "sachets": "sache", "saches": "sache",
    "litro": "l", "litros": "l", "sta": "santa", "sto": "santo", "dr": "doutor", "dra": "doutora", "gde": "grande",
    "feminina": "feminino", "masculina": "masculino", "infantis": "infantil", "adultos": "adulto",
    "caes": "cao", "gatos": "gato", "filhotes": "filhote", "castrados": "castrado",
    "achoc": "achocolatado", "esp": "especial", "nat": "natural", "inst": "instantaneo",
    "instantanea": "instantaneo", "torrada": "torrado",
    "lt": "lata", "energetica": "energetico", "energeticos": "energetico", "fresca": "fresco", "frescas": "fresco", "frescos": "fresco",
    "bco": "branco",
}

_STOP = set("""de da do das dos e a o as os em para pra no na nos nas com ao aos um uma uns umas por pelo pela
 ou que se mais menos cada ate sob entre sobre s d l n tipo""".split())

# marketing / ruído sem poder de distinguir produto
_RUIDO = set("""original novo nova economica economico familia familiar tamanho
 super maxi grande pequeno jumbo gigante big family pratico pratica unidade un und unid unidad item
 pronto qualidade selecionado selecionada casa marca produto linha colecao
 top ideal perfeita perfeito lavagem delicioso deliciosa saboroso saborosa hiper pack porcao
 mini maior menor novidade""".split())

# tokens de embalagem: ausência de um lado só é tolerada (T3); conflito rejeita sempre
_EMBALAGEM = set("""lata garrafa vidro tetrapak sache pote copo balde frasco bisnaga tubo spray aerosol aerossol squeeze
 refil bag pouch bandeja caixa cartela display envelope lacrado vacuo granel""".split())

# variantes duras: se o conjunto difere entre os dois lados, o par é rejeitado
_VARIANTES = set("""
 zero diet light lite semlactose baixalactose integral semidesnatado desnatado semgluten semsal sodio gordura
 tradicional extra forte suave intenso organico natural promo
 liquido gel barra pedacos cubos ralado moido granulado instantaneo soluvel concentrado cremoso pastoso
 masculino feminino infantil adulto baby kids bebe junior filhote castrado senior cao gato
 branco preto parboilizado agulhinha carioca vermelho azul verde amarelo rosa roxo lilas dourado prata marrom cinza bege
 morango chocolate baunilha coco limao uva maracuja abacaxi banana maca pessego manga goiaba melancia melao caju acerola
 tangerina mexerica cereja framboesa amora mirtilo ameixa menta hortela cafe cappuccino avela caramelo amendoim castanha
 nozes pistache leite ovomaltine brigadeiro beijinho cenoura milho queijo presunto calabresa frango bacon tomate cebola alho
 pimenta pizza churrasco picanha carne peixe atum sardinha camarao
 coxa sobrecoxa peito asa file bife patinho alcatra contrafile fraldinha costela acem coxao maminha lombo pernil
 linguica salsicha hamburguer empanado temperado
 espaguete parafuso penne pene rigatone tortiglione linguine fettuccine fusilli talharim nhoque conchinha argolinha farfalle gravatinha cabeloanjo ave
 mate camomila boldo hibisco canela gengibre
 fresh sensitive sensivel oleosa seco
 cola guarana tonica soda
 maionese ketchup mostarda
 amargo espresso lungo ristretto dolce gusto
 hidratante nutritivo reparador restaurador antiqueda anticaspa
 antibacteriano neutro lavanda pinho eucalipto
 salgado doce puro refrigerado congelado resfriado
 bagaco
""".split())

# palavras de tipo de produto (primeira palavra do nome); somadas às que aparecem em >= 15 nomes no catálogo.
# Servem para tolerar (T3) "um lado cita o tipo/linha e o outro não", nunca para confirmar.
TIPOS_BASE = frozenset("""achocolatado acucar agua amaciante arroz aveia azeite bala batata bebido biscoito bolinho bolo bombom
 capsula cereal cerveja cha chopp cobertura confeito cookie coxinha creme desinfetante desodorante detergente energetico
 ervilha extrato farinha feijao filezinho goma granola iogurte kit lasanha macarrao manteiga massa meio mistura molho oleo
 panettone pao papel passata pastilha pipoca po racao refresco refrigerante requeijao sabao sabonete salgadinho shampoo
 sobremesa sorvete suco tempero""".split())
_MIN_NOMES_TIPO = 15


def _gen(t):
    if len(t) > 5 and t.endswith("ada"):
        return t[:-3] + "ado"
    if len(t) > 5 and t.endswith("ida"):
        return t[:-3] + "ido"
    if len(t) > 5 and t.endswith("osa"):
        return t[:-3] + "oso"
    return t


def _stem(t):
    if len(t) > 4 and (t.endswith("oes") or t.endswith("aes")):
        return t[:-3] + "ao"
    if len(t) > 3 and t.endswith("s") and not t.endswith(("ss", "us", "is")):
        return t[:-1]
    return t


def tokens_do_nome(texto_sem_medida):
    """Texto (sem acento, medidas removidas) -> lista de tokens canônicos (sinônimos, plural e gênero unificados)."""
    t = " " + texto_sem_medida.replace("|", " ") + " "
    for rx, rep in _FRASES:
        t = rx.sub(rep, t)
    t = t.replace("'", "")
    t = re.sub(r"(?<=\d)[.,](?=\d)", "", t)
    toks = re.findall(r"[a-z0-9]+", t)
    toks2, i = [], 0
    while i < len(toks):
        if toks[i] == "sem" and i + 1 < len(toks) and not toks[i + 1].isdigit():
            toks2.append("sem" + toks[i + 1])
            i += 2
        else:
            toks2.append(toks[i])
            i += 1
    out = []
    for tk in toks2:
        tk = _SINONIMOS.get(tk, tk)
        for piece in tk.split():
            piece = _stem(piece)
            out.append(_gen(_SINONIMOS.get(piece, piece)))
    if "cafe" in out:  # café torrado e moído == café em pó
        out = ["po" if x == "moido" else x for x in out if x != "torrado"]
    return out


# "Sem Açúcar" e "Zero Açúcar" viram o mesmo token, mas os juízes divergiram sobre serem o mesmo produto
# (Coca-Cola sem Açúcar x Coca-Cola Zero Açúcar): a grafia é guardada para rebaixar o par de T2 para T3.
_RE_SEM_ACUCAR = re.compile(r"\bsem\s+acucar(?:es)?\b|\bsugar\s*free\b|\bs/\s*acucar\b|\b0\s*%?\s+acucar\b")
_RE_ZERO = re.compile(r"\bzero\b")


def forma_zero(nome_norm):
    """'zero' | 'sem' | None conforme a grafia usada para dizer "sem açúcar" no nome."""
    z, s = bool(_RE_ZERO.search(nome_norm)), bool(_RE_SEM_ACUCAR.search(nome_norm))
    if z and not s:
        return "zero"
    if s and not z:
        return "sem"
    return None


# ------------------------------------------------------------------ marca

# marca preenchida pela fonte que NÃO é marca (placeholder da rede)
MARCA_PLACEHOLDER = {"geral", "asun", "hortifrutigranjeiros", "hortifruti", "hortifrutihf", "semmarca", "zaffari", ""}

ALIAS_MARCA = {
    "presidente": "president", "caravellas": "caravelas", "johnsons": "johnson", "scjohnson": "johnson",
    "predileta": "predilecta", "kifritas": "kifrita", "oetker": "droetker", "staclara": "santaclara",
    "fornominas": "fornodeminas", "anjinhos": "anjinho", "almaflores": "almadeflores", "matteleao": "mateleao",
    "costiero": "costieiro", "passabahce": "pasabahce", "benjerrys": "benjerry", "authentica": "aautentica",
    "casaqueijo": "casadoqueijo", "tuttigiorniblu": "tuttigiorni", "sabordefrance": "saborfrance",
}

# O campo `category` do catálogo é ruidoso (refrigerante de laranja em "hortifruti"): só bloqueia alimento x não-alimento.
_FAMILIA_CAT = {
    "graos": "alim", "mercearia": "alim", "oleos": "alim", "biscoitos": "alim", "cafe": "alim", "padaria": "alim",
    "leites": "alim", "congelados": "alim", "carnes": "alim", "bebidas": "alim", "hortifruti": "alim",
    "higiene": "nao_alim", "limpeza": "nao_alim", "bazar": "nao_alim",
}


def categorias_compativeis(a, b):
    return a == b or _FAMILIA_CAT.get(a, a) == _FAMILIA_CAT.get(b, b)


def canon_marca(txt):
    c = compacto(txt or "")
    return ALIAS_MARCA.get(c, c)


def _ngramas_compactos(tokens, maxn=3):
    out = []
    for n in range(1, maxn + 1):
        for i in range(len(tokens) - n + 1):
            g = "".join(tokens[i:i + n])
            out.append(ALIAS_MARCA.get(g, g))
    return out


def _construir_vocab_marcas(prods):
    """Marcas confiáveis (campo da fonte) que também aparecem, com boa precisão, dentro dos nomes."""
    por_marca = collections.Counter(p["marca_c"] for p in prods if p["marca_c"] and p["marca_c"] not in MARCA_PLACEHOLDER)
    contem = collections.Counter()
    for p in prods:
        if not p["marca_c"] or p["marca_c"] in MARCA_PLACEHOLDER:
            continue
        for g in p["ngramas"]:
            if g in por_marca:
                contem[g] += 1
    vocab = {}
    for b, own in por_marca.items():
        c = contem.get(b, 0)
        if c == 0:
            continue
        precisao = own / c
        if (len(b) >= 4 and precisao >= 0.6 and own >= 2) or (len(b) >= 6 and precisao >= 0.6 and own >= 1):
            vocab[b] = own
    return vocab


def _resolver_marca(prods, vocab):
    """Define marca_final/marca_src: 'campo' (da fonte), 'nome' (recuperada do nome), 'ambigua' ou 'ausente'."""
    for p in prods:
        if p["marca_c"] and p["marca_c"] not in MARCA_PLACEHOLDER:
            p["marca_final"], p["marca_src"] = p["marca_c"], "campo"
            continue
        cand = sorted((g for g in p["ngramas"] if g in vocab), key=lambda g: (-vocab[g], -len(g), g))
        if not cand:
            p["marca_final"], p["marca_src"] = None, "ausente"
        elif len(cand) > 1 and vocab[cand[0]] == vocab[cand[1]] and len(cand[0]) == len(cand[1]):
            p["marca_final"], p["marca_src"] = None, "ambigua"
        else:
            p["marca_final"], p["marca_src"] = cand[0], "nome"


# ------------------------------------------------------------------ preparo do corpus


def chave_num(id_):
    """Ordem estável dos ids do catálogo: 'p9' < 'p100'."""
    m = re.fullmatch(r"p(\d+)", str(id_))
    return (0, int(m.group(1)), "") if m else (1, 0, str(id_))


def chave_imagem(url):
    """URL do CDN (assinatura + fit-in + objeto S3) -> o objeto S3 subjacente, sem esquema nem query."""
    if not url:
        return None
    partes = url.split("/https://")
    k = partes[-1] if len(partes) > 1 else url
    return re.sub(r"^https?://", "", k).split("?")[0].lower()


_PLACEHOLDER_FOTO = re.compile(r"padrao-de-fotos|sem-?foto|sem-?imagem|placeholder|no-?image|nophoto|no-photo|indispon|/default")


def _preparar(registros):
    prods = []
    for r in registros:
        nome_n = sem_acento(r["nome"] or "")
        brutos = re.findall(r"[a-z0-9]+", nome_n)
        prods.append({
            "id": r["id"], "rede": r["rede"], "nome": r["nome"], "marca": r.get("marca"), "cat": r.get("cat"),
            "preco": r.get("preco"), "idOrigem": r.get("idOrigem"), "imageUrl": r.get("imageUrl"),
            "nome_n": nome_n, "emb": parse_embalagem(nome_n, r.get("unidade")),
            "marca_c": canon_marca(r.get("marca")), "ngramas": set(_ngramas_compactos(brutos)),
            "forma_zero": forma_zero(nome_n),
            "chave_t1": chave_nome_identica({"nome_bruto": r["nome"], "marca": r.get("marca")}),
        })
    return prods


def _tokenizar(prods):
    """Tokens de conteúdo: sem medida, sem marca, sem stopwords/ruído. Devolve contagem da 1ª palavra (tipo)."""
    tipo_cont = collections.Counter()
    for p in prods:
        texto = p["emb"]["texto_removido"] if p["emb"]["ok"] else sem_acento(p["nome"] or "")
        toks = tokens_do_nome(texto)
        mf = p["marca_final"]
        if mf:
            rem = set()
            for n in (3, 2, 1):
                for i in range(len(toks) - n + 1):
                    g = "".join(toks[i:i + n])
                    if ALIAS_MARCA.get(g, g) == mf and not rem.intersection(range(i, i + n)):
                        rem.update(range(i, i + n))
            if p["marca_src"] == "campo":
                for tk in re.findall(r"[a-z0-9]+", sem_acento(p["marca"] or "")):
                    for i, t2 in enumerate(toks):
                        if t2 == _stem(tk) or t2 == tk:
                            rem.add(i)
            toks = [t for i, t in enumerate(toks) if i not in rem]
        base = [t for t in toks if t not in _STOP and t not in _RUIDO]
        p["toks"] = base
        if base:
            tipo_cont[base[0]] += 1
    return tipo_cont


def _classificar_tokens(prods, tipos):
    """V = variante dura, P = embalagem, T = palavra de tipo, S = demais (conteúdo)."""
    for p in prods:
        V, P, T, S = set(), set(), set(), set()
        for t in p["toks"]:
            if (t.isdigit() or re.fullmatch(r"(tipo|num)\d+|\dem\d", t)
                    or (t.startswith("sem") and len(t) > 4 and t not in ("semola", "semente", "sementes", "semidesnatado"))
                    or t in ("comgas", "semidesnatado")):
                V.add(t)
            elif t in _EMBALAGEM:
                P.add(t)
            elif t in _VARIANTES:
                V.add(t)
            elif t in tipos:
                T.add(t)
            else:
                S.add(t)
        p["V"], p["P"], p["T"], p["S"] = frozenset(V), frozenset(P), frozenset(T), frozenset(S)


def construir_corpus(registros):
    """registros -> lista de produtos preparados (embalagem, marca final, tokens), em ordem estável de id."""
    prods = _preparar(sorted(registros, key=lambda r: chave_num(r["id"])))
    _resolver_marca(prods, _construir_vocab_marcas(prods))
    tipo_cont = _tokenizar(prods)
    tipos = set(TIPOS_BASE) | {t for t, c in tipo_cont.items() if c >= _MIN_NOMES_TIPO and t not in _VARIANTES and not t.isdigit()}
    _classificar_tokens(prods, tipos)
    return prods


# ------------------------------------------------------------------ guardas e camadas T2..T4


def avaliar(a, b):
    """(camada, score, motivo_de_rejeição). camada em T2/T3/T4 ou None. Aplica TODAS as guardas."""
    if a["rede"] == b["rede"]:
        return None, 0, "mesma_rede"
    if not (a["emb"]["ok"] and b["emb"]["ok"]):
        return None, 0, "sem_medida"
    if not a["marca_final"] or not b["marca_final"]:
        return None, 0, "sem_marca"
    if a["marca_final"] != b["marca_final"]:
        return None, 0, "marca_diferente"
    if not embalagens_equivalentes(a["emb"], b["emb"]):
        return None, 0, "embalagem_diferente"
    if a["emb"]["promo"] != b["emb"]["promo"]:
        return None, 0, "promo_diferente"
    if not categorias_compativeis(a["cat"], b["cat"]):
        return None, 0, "categoria_incompativel"
    if a["V"] != b["V"]:
        return None, 0, "variante_diferente"
    for k in ("P", "T"):  # conflito de embalagem/tipo (cada lado com algo que o outro não tem) rejeita sempre
        if a[k] and b[k] and not (a[k] <= b[k] or b[k] <= a[k]):
            return None, 0, "embalagem_ou_tipo_em_conflito"
    recuperada = "nome" in (a["marca_src"], b["marca_src"])
    if a["S"] != b["S"]:
        return None, 0, "marca_recuperada_com_diferenca" if recuperada else "conteudo_diferente"
    if recuperada:
        return "T4", 1.0 if (a["P"] == b["P"] and a["T"] == b["T"]) else 0.95, None
    if a["P"] == b["P"] and a["T"] == b["T"]:
        if "zero" in a["V"] and a["forma_zero"] and b["forma_zero"] and a["forma_zero"] != b["forma_zero"]:
            return "T3", 0.95, None  # sem açúcar x zero açúcar: provável, nunca confirmado
        return "T2", 1.0, None
    return "T3", 0.95, None


def _gerar_pares_t2_t4(prods):
    blocos = collections.defaultdict(list)
    for p in prods:
        if p["emb"]["ok"] and p["marca_final"]:
            e = p["emb"]
            blocos[(p["marca_final"], e["base"], e["tam"], e["pack"])].append(p)
    pares = []
    for chave in sorted(blocos):
        for a, b in itertools.combinations(blocos[chave], 2):
            camada, score, _ = avaliar(a, b)
            if camada:
                pares.append((camada, score, a, b))
    return pares


def _filtrar_ambiguos(pares):
    """T3/T4 exigem melhor correspondência mútua por rede; empate só se os candidatos forem indistinguíveis.

    Devolve (aceitos, descartados_por_ambiguidade).
    """
    por_prod = collections.defaultdict(list)
    exatos = collections.defaultdict(set)
    for par in pares:
        camada, _, a, b = par
        if camada == "T2":
            exatos[(a["id"], b["rede"])].add(b["id"])
            exatos[(b["id"], a["rede"])].add(a["id"])
        else:
            por_prod[(a["id"], b["rede"])].append(par)
            por_prod[(b["id"], a["rede"])].append(par)

    def melhor_unico(pid, rede_alvo, par):
        cands = por_prod[(pid, rede_alvo)]
        top = max(c[1] for c in cands)
        if par[1] < top:
            return False
        topos = [c for c in cands if c[1] == top]
        if len(topos) == 1:
            return True
        assinaturas = set()
        for c in topos:
            o = c[3] if c[2]["id"] == pid else c[2]
            assinaturas.add((o["S"], o["P"], o["T"], o["V"]))
        return len(assinaturas) == 1

    aceitos, descartados = [], []
    for par in pares:
        camada, _, a, b = par
        if camada == "T2":
            aceitos.append(par)
            continue
        ok = melhor_unico(a["id"], b["rede"], par) and melhor_unico(b["id"], a["rede"], par)
        if ok and exatos.get((a["id"], b["rede"])) and b["id"] not in exatos[(a["id"], b["rede"])]:
            ok = False
        if ok and exatos.get((b["id"], a["rede"])) and a["id"] not in exatos[(b["id"], a["rede"])]:
            ok = False
        (aceitos if ok else descartados).append(par)
    return aceitos, descartados


# ------------------------------------------------------------------ T1 (chave idêntica)


def _t1_valido(a, b):
    """T1 vem de casamento.chave_nome_identica; aqui só se confere a embalagem e a rede."""
    if a["rede"] == b["rede"]:
        return False
    if a["emb"]["ok"] and b["emb"]["ok"] and not embalagens_equivalentes(a["emb"], b["emb"]):
        return False
    return True


def _gerar_pares_t1(prods):
    por_chave = collections.defaultdict(list)
    for p in prods:
        if p["chave_t1"]:
            por_chave[p["chave_t1"]].append(p)
    pares = []
    for chave in sorted(por_chave):
        for a, b in itertools.combinations(por_chave[chave], 2):
            if _t1_valido(a, b):
                pares.append(("T1", 1.0, a, b))
    return pares


# ------------------------------------------------------------------ T0 (foto idêntica)

_RAZAO_PRECO_MAX = 2.5
# Variantes descritivas: se aparecem só de um lado (o outro nome apenas omite o descritor) não há conflito real
# e a foto idêntica sustenta o par. As duras (zero, diet, sabor, cor, corte...) rejeitam mesmo se só um lado cita.
_VARIANTE_DESCRITIVA = {"barra", "tradicional", "natural", "puro", "extra", "forte", "suave", "intenso", "salgado", "doce",
                        "gel", "cremoso", "congelado", "instantaneo", "soluvel", "concentrado", "granulado", "empanado",
                        "neutro", "antibacteriano", "gusto", "cola", "pedacos", "temperado", "ralado"}


def _emb_nome(p):
    """Embalagem lida SOMENTE do nome (o campo `unidade` do catálogo é ruidoso)."""
    if "emb_nome" not in p:
        p["emb_nome"] = parse_embalagem(p["nome_n"], "")
    return p["emb_nome"]


def _medidas_do_nome(p):
    out = set()
    for m in _RE_MEDIDA.finditer(p["nome_n"]):
        b, v = _base(m.group(1), m.group(2))
        out.add((b, _fmt(v)))
    return out


def _marcas_compativeis(a, b):
    ma, mb = a["marca_final"], b["marca_final"]
    if not ma or not mb or ma == mb:
        return True
    if len(ma) >= 4 and len(mb) >= 4 and (ma in mb or mb in ma):
        return True
    return ma in b["ngramas"] or mb in a["ngramas"]  # a marca de um lado aparece no nome do outro


def guardas_foto(a, b):
    """Lista de códigos das guardas violadas por um par de mesma foto (vazia = aprovado)."""
    viol = []
    ea, eb = _emb_nome(a), _emb_nome(b)
    if ea["ok"] and eb["ok"]:
        if not embalagens_equivalentes(ea, eb) and not _contagem_equivalente(ea, eb):
            viol.append("embalagem_diferente")
    else:  # kit/promoção/medidas múltiplas: um conjunto de medidas deve conter o outro
        ma, mb = _medidas_do_nome(a), _medidas_do_nome(b)
        if ma and mb and not (ma <= mb or mb <= ma):
            viol.append("embalagem_diferente")
    if not _marcas_compativeis(a, b):
        viol.append("marca_diferente")
    oa, ob = a["V"] - b["V"], b["V"] - a["V"]
    if (oa and ob) or ((oa | ob) - _VARIANTE_DESCRITIVA):
        viol.append("variante_diferente")
    if not categorias_compativeis(a["cat"], b["cat"]):
        viol.append("categoria_incompativel")
    pa, pb = a["preco"], b["preco"]
    if pa and pb and pa > 0 and pb > 0 and max(pa, pb) / min(pa, pb) > _RAZAO_PRECO_MAX:
        viol.append("preco_razao_alta")
    return viol


def _foto_valida(p):
    u = p.get("imageUrl")
    return bool(u) and not _PLACEHOLDER_FOTO.search(u.lower())


def _gerar_pares_t0(prods):
    """Pares de mesma foto: só quando a foto liga exatamente duas listagens de redes diferentes."""
    grupos = collections.defaultdict(list)
    for p in prods:
        if _foto_valida(p):
            grupos[chave_imagem(p["imageUrl"])].append(p)
    pares, barrados = [], 0
    for k in sorted(grupos):
        v = grupos[k]
        if len(v) < 2:
            continue
        listagens = collections.OrderedDict()  # cópias exatas (mesma rede + idOrigem) = mesma listagem
        for p in v:
            listagens.setdefault((p["rede"], p["idOrigem"]), []).append(p)
        if len(listagens) != 2 or len({rk[0] for rk in listagens}) != 2:
            continue
        la, lb = list(listagens.values())
        a, b = la[0], lb[0]
        if guardas_foto(a, b):
            barrados += 1
        else:
            pares.append(("T0", 1.0, a, b))
    return pares, barrados


# ------------------------------------------------------------------ nível de um par qualquer


def nivel_par(a, b):
    """Melhor camada em que o par (a, b) casa, ou None. Usada para conferir TODOS os pares de um grupo."""
    if a["rede"] == b["rede"]:
        return None
    melhor = None
    if a["chave_t1"] and a["chave_t1"] == b["chave_t1"] and _t1_valido(a, b):
        melhor = "T1"
    camada, _, _ = avaliar(a, b)
    if camada and (melhor is None or _RANK[camada] < _RANK[melhor]):
        melhor = camada
    if _foto_valida(a) and _foto_valida(b) and chave_imagem(a["imageUrl"]) == chave_imagem(b["imageUrl"]) and not guardas_foto(a, b):
        if melhor is None or _RANK["T0"] < _RANK[melhor]:
            melhor = "T0"
    return melhor


# ------------------------------------------------------------------ agrupamento


def _agrupar(pares):
    """Fusão gulosa, da camada mais confiável para a menos; um id em no máximo um grupo.

    Um item só entra num grupo se casar (nivel_par) com TODOS os membros e se a rede dele ainda não estiver
    no grupo. Na dúvida, não funde: o par fica de fora e os itens podem formar outro grupo mais adiante.
    Devolve (grupos, descartes) onde descartes conta pares barrados na fusão.
    """
    ordenados = sorted(pares, key=lambda p: (_RANK[p[0]], -p[1], chave_num(p[2]["id"]), chave_num(p[3]["id"])))
    grupo_de = {}
    grupos = {}  # gid -> {"itens": [prods], "camada": camada do elo mais fraco}
    descartes = collections.Counter()
    proximo = 0

    def compativel(novos, membros):
        piores = None
        for n in novos:
            for m in membros:  # nivel_par também barra duas linhas da mesma rede
                nv = nivel_par(n, m)
                if nv is None:
                    return None
                piores = nv if piores is None else pior_camada(piores, nv)
        return piores

    for camada, _, a, b in ordenados:
        ga, gb = grupo_de.get(a["id"]), grupo_de.get(b["id"])
        if ga is None and gb is None:
            gid = proximo
            proximo += 1
            grupos[gid] = {"itens": [a, b], "camada": camada}
            grupo_de[a["id"]] = grupo_de[b["id"]] = gid
        elif ga is not None and gb is not None:
            if ga == gb:
                continue
            ia, ib = grupos[ga]["itens"], grupos[gb]["itens"]
            if len({m["rede"] for m in ia} & {m["rede"] for m in ib}):
                descartes["fusao_rede_repetida"] += 1
                continue
            pior = compativel(ib, ia)
            if pior is None:
                descartes["fusao_com_par_incompativel"] += 1
                continue
            for m in ib:
                grupo_de[m["id"]] = ga
            ia.extend(ib)
            grupos[ga]["camada"] = pior_camada(pior_camada(grupos[ga]["camada"], grupos[gb]["camada"]), pior)
            del grupos[gb]
        else:
            gid, novo = (ga, b) if ga is not None else (gb, a)
            pior = compativel([novo], grupos[gid]["itens"])
            if pior is None:
                descartes["entrada_com_par_incompativel"] += 1
                continue
            grupos[gid]["itens"].append(novo)
            grupos[gid]["camada"] = pior_camada(pior_camada(grupos[gid]["camada"], camada), pior)
            grupo_de[novo["id"]] = gid
    return list(grupos.values()), descartes


def casar_registros(registros):
    """Casa os registros do catálogo e devolve {'grupos': [...], 'estatisticas': {...}}.

    registro: {id, nome, marca, cat, unidade, rede, preco, idOrigem, imageUrl}. O resultado não depende da
    ordem de entrada. Cada grupo: {id: 'g<N>', confianca, camada, itens: [ids ordenados]}.
    """
    prods = construir_corpus(registros)
    pares_t1 = _gerar_pares_t1(prods)
    pares_t24, descartados_amb = _filtrar_ambiguos(_gerar_pares_t2_t4(prods))
    pares_t0, barrados_foto = _gerar_pares_t0(prods)
    candidatos = pares_t1 + pares_t24 + pares_t0
    grupos_brutos, descartes = _agrupar(candidatos)

    grupos = []
    for g in grupos_brutos:
        itens = sorted((m["id"] for m in g["itens"]), key=chave_num)
        grupos.append({"camada": g["camada"], "confianca": CONFIANCA_POR_CAMADA[g["camada"]], "itens": itens})
    grupos.sort(key=lambda g: chave_num(g["itens"][0]))
    for i, g in enumerate(grupos, 1):
        g["id"] = f"g{i}"
    grupos = [{"id": g["id"], "confianca": g["confianca"], "camada": g["camada"], "itens": g["itens"]} for g in grupos]

    por_camada = {}
    for c in ORDEM_CAMADAS:
        gs = [g for g in grupos if g["camada"] == c]
        por_camada[c] = {"grupos": len(gs), "produtos": sum(len(g["itens"]) for g in gs)}
    todos = [i for g in grupos for i in g["itens"]]
    estat = {
        "grupos": len(grupos), "produtos_cobertos": len(todos), "produtos_no_catalogo": len(prods),
        "por_camada": por_camada,
        "por_confianca": {conf: {"grupos": sum(1 for g in grupos if g["confianca"] == conf),
                                 "produtos": sum(len(g["itens"]) for g in grupos if g["confianca"] == conf)}
                          for conf in ("confirmado", "provavel")},
        "pares_candidatos": {"T1": len(pares_t1), "T2_T3_T4": len(pares_t24), "T0": len(pares_t0)},
        "descartados_por_ambiguidade": len(descartados_amb),
        "pares_de_foto_barrados_pelas_guardas": barrados_foto,
        "descartes_na_fusao": dict(sorted(descartes.items())),
    }
    return {"grupos": grupos, "estatisticas": estat}
