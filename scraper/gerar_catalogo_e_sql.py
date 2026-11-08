"""
SmartMarket - Gerador de Carga SQL e Catálogo Frontend
------------------------------------------------------
Consolida todos os 530 produtos coletados pelos scrapers de todas as redes do RS,
gera o script SQL de carga para o banco de dados PostgreSQL e atualiza o catálogo
do frontend (data.js) para pesquisa completa com fotos em alta resolução.
"""

import json
import os
import re
import sys
import tempfile
import unicodedata
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "scraper" / "output"
SQL_DESTINO = BASE_DIR / "backend" / "database" / "carga_completa_530_produtos.sql"
DATA_JS_DESTINO = BASE_DIR / "frontend" / "src" / "data.js"
IMAGENS_DIR = BASE_DIR / "frontend" / "public" / "images" / "produtos"
# Registro dos ids de produto já atribuídos (chave natural -> id). Fica versionado junto com o
# data.js: é ele que mantém o id de um produto igual entre execuções, mesmo que a lista mude.
REGISTRO_IDS = BASE_DIR / "scraper" / "catalogo_ids.json"

MERCADOS_MAP = {
    "fort": {"id": 1, "nome": "Fort Atacadista", "key": "fort"},
    "carrefour": {"id": 2, "nome": "Carrefour Mercado", "key": "carrefour"},
    "asun": {"id": 3, "nome": "Asun Supermercados", "key": "asun"},
    "atacadao": {"id": 4, "nome": "Atacadão", "key": "atacadao"},
    "master": {"id": 5, "nome": "Master Supermercados", "key": "master"},
    "zaffari": {"id": 6, "nome": "Zaffari / Bourbon", "key": "zaffari"},
    "rissul": {"id": 7, "nome": "Supermercados Rissul", "key": "rissul"},
    "stok": {"id": 8, "nome": "Stok Center", "key": "stok"},
}

CATEGORIAS_MAP = {
    "graos": "graos",
    "graos_arrozes_feijoes": "graos",
    "leites": "leites",
    "oleos": "oleos",
    "cafe": "cafe",
    "bebidas": "bebidas",
    "carnes": "carnes",
    "higiene": "higiene",
    "biscoitos": "biscoitos",
    "mercearia": "mercearia",
}

EMOJIS_CAT = {
    "graos": "🌾",
    "leites": "🥛",
    "oleos": "🫙",
    "cafe": "☕",
    "bebidas": "🍺",
    "carnes": "🥩",
    "higiene": "🧴",
    "biscoitos": "🍪",
    "mercearia": "🛒",
}


def detectar_categoria(nome: str, cat_original: str) -> str:
    n = nome.lower()
    c = cat_original.lower()
    if any(k in n for k in ["arroz", "feijao", "feijão", "lentilha", "grao", "grão", "milho"]):
        return "graos"
    if any(k in n for k in ["leite", "iogurte", "queijo", "manteiga", "requeijao", "requeijão", "nata"]):
        return "leites"
    if any(k in n for k in ["oleo", "óleo", "azeite", "vinagre", "soja", "girassol"]):
        return "oleos"
    if any(k in n for k in ["cafe", "café", "cha", "chá", "achocolatado", "toddy", "nescau", "cappuccino"]):
        return "cafe"
    if any(k in n for k in ["refrigerante", "cerveja", "suco", "agua", "água", "vinho", "energetico", "energético"]):
        return "bebidas"
    if any(k in n for k in ["carne", "picanha", "frango", "costela", "alcatra", "linguica", "linguiça"]):
        return "carnes"
    if any(k in n for k in ["sabonete", "shampoo", "detergente", "amaciante", "papel", "limpeza", "creme dental", "desodorante"]):
        return "higiene"
    if any(k in n for k in ["biscoito", "bolacha", "chocolate", "bombom", "wafer", "cookie"]):
        return "biscoitos"
    return CATEGORIAS_MAP.get(c, "mercearia")


def extrair_unidade(nome: str) -> str:
    match = re.search(r"(\d+(?:[.,]\d+)?\s*(?:kg|g|l|ml|un|pct|lata|unidades|latas))", nome, re.IGNORECASE)
    if match:
        return match.group(1).lower().strip()
    return "1 un"


def nome_normalizado(nome: str) -> str:
    """Mesma regra do backend (NormalizadorTexto.normalizar): minúsculo, NFD sem marcas de
    acento e espaços colapsados. A busca por nome compara o termo digitado, já normalizado
    assim, apenas com produto.nome_normalizado; gravar nome.lower() deixava os acentos."""
    decomposto = unicodedata.normalize("NFD", nome.lower())
    sem_marcas = "".join(c for c in decomposto if unicodedata.category(c) != "Mn")
    return " ".join(sem_marcas.split())


def escape_sql(val) -> str:
    if val is None:
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"


def carregar_todos_produtos():
    arquivos = [
        OUTPUT_DIR / "coleta_asun.json",
        OUTPUT_DIR / "coleta_atacadao.json",
        OUTPUT_DIR / "coleta_master.json",
        OUTPUT_DIR / "coleta_rissul.json",
        OUTPUT_DIR / "coleta_stok.json",
        OUTPUT_DIR / "coleta_zaffari.json",
        OUTPUT_DIR / "produtos_coletados.json",
    ]

    todos = []
    for arq in arquivos:
        if not arq.exists():
            continue
        try:
            itens = json.loads(arq.read_text(encoding="utf-8"))
            todos.extend(itens)
        except Exception as e:
            print(f"Erro ao ler {arq}: {e}")
    return todos


class EntradaVaziaError(RuntimeError):
    """Nenhum produto válido para gerar: o catálogo e o SQL versionados não devem ser sobrescritos."""


def chave_estavel(item: dict) -> str:
    """Chave natural do produto: rede + id de origem; sem id de origem, rede + nome normalizado."""
    rede = chave_mercado(item.get("supermercado"))
    origem = item.get("id_produto_origem")
    origem = str(origem).strip() if origem is not None else ""
    if origem:
        return f"{rede}:id:{origem}"
    return f"{rede}:nome:{nome_normalizado(item.get('nome_bruto') or '')}"


def escrever_atomico(destino, texto: str) -> None:
    """Grava em arquivo temporário do mesmo diretório e troca de uma vez: nunca deixa arquivo pela metade."""
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=destino.parent, prefix=destino.name + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as arq:
            arq.write(texto)
        # mkstemp cria 0600; mantém a permissão do arquivo que está sendo trocado (ou 0644).
        os.chmod(tmp, destino.stat().st_mode & 0o777 if destino.exists() else 0o644)
        os.replace(tmp, destino)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


class RegistroIds:
    """ids de produto estáveis: cada chave natural recebe um id uma única vez e o mantém para sempre.

    Antes o id era a posição do item na lista (prod_id += 1): se um produto sumisse da coleta, todos
    os seguintes deslocavam. Aqui o id novo é sempre proximo_id (que só cresce), então um produto que
    some não libera o id para outro e um que volta recupera o dele.
    """

    VERSAO = 1

    def __init__(self, ids=None, proximo_id=1):
        self.ids = dict(ids or {})
        self.proximo_id = max(int(proximo_id), max(self.ids.values(), default=0) + 1)

    def id_de(self, chave: str) -> int:
        if chave not in self.ids:
            self.ids[chave] = self.proximo_id
            self.proximo_id += 1
        return self.ids[chave]

    def para_json(self) -> str:
        return json.dumps({"versao": self.VERSAO, "proximo_id": self.proximo_id, "ids": self.ids},
                          ensure_ascii=False, indent=1) + "\n"

    @classmethod
    def carregar(cls, caminho=None, data_js=None):
        """Lê o registro; sem ele, aproveita os ids "p<id>" do data.js atual; sem nenhum, começa vazio."""
        caminho = Path(caminho or REGISTRO_IDS)
        if caminho.exists():
            try:
                dados = json.loads(caminho.read_text(encoding="utf-8"))
                return cls(dados["ids"], dados.get("proximo_id", 1))
            except (ValueError, KeyError, TypeError, AttributeError) as erro:
                # Recomeçar do zero reatribuiria ids já gravados no banco: melhor parar.
                raise RuntimeError(f"Registro de ids ilegível ({caminho}): {erro}. "
                                   "Restaure o arquivo versionado em vez de apagá-lo.") from erro
        return cls._do_data_js(Path(data_js or DATA_JS_DESTINO))

    @classmethod
    def _do_data_js(cls, caminho: Path):
        if not caminho.exists():
            return cls()
        try:
            texto = caminho.read_text(encoding="utf-8")
            inicio = texto.index(MARCADOR_PRODUCTS) + len(MARCADOR_PRODUCTS)
            produtos = json.loads(texto[inicio:texto.rindex("]") + 1])
        except (ValueError, OSError) as erro:
            print(f"Aviso: sem registro de ids e data.js ilegível ({erro}); ids recomeçam do 1.")
            return cls()
        ids, maior = {}, 0
        for p in produtos:
            m = re.fullmatch(r"p(\d+)", str(p.get("id", "")))
            if not m:
                continue
            numero = int(m.group(1))
            maior = max(maior, numero)
            chave = chave_estavel({"supermercado": p.get("supermercadoOrigem"),
                                   "id_produto_origem": p.get("idOrigem"),
                                   "nome_bruto": p.get("name") or ""})
            if chave not in ids or numero < ids[chave]:
                ids[chave] = numero
        return cls(ids, maior + 1)


def sql_promocao(prod_id, mercado_id, preco_normal, preco, valida_ate=None) -> str:
    """INSERT de promoção. Sem validade informada pela rede, data_fim é NULL (nunca estimada).

    Reexecutar o mesmo SQL no mesmo dia não duplica a promoção (WHERE NOT EXISTS).
    """
    data_fim = escape_sql(valida_ate)
    return (
        f"INSERT INTO promocao (produto_id, mercado_id, valor_original, valor_promocional, data_inicio, data_fim, ativa) "
        f"SELECT {prod_id}, {mercado_id}, {preco_normal:.2f}, {preco:.2f}, CURRENT_TIMESTAMP, {data_fim}, TRUE "
        f"WHERE NOT EXISTS (SELECT 1 FROM promocao WHERE produto_id = {prod_id} AND mercado_id = {mercado_id} "
        f"AND valor_original = {preco_normal:.2f} AND valor_promocional = {preco:.2f} "
        f"AND data_inicio = CURRENT_DATE AND data_fim IS NOT DISTINCT FROM {data_fim});"
    )


def sql_ajustar_sequencias() -> list:
    """setval das sequências depois dos INSERTs com id explícito.

    Sem isso, o próximo INSERT sem id (a carga do pipeline usa RETURNING id) recebe 1 e colide com a
    chave primária. Em tabela vazia fica 1 com is_called = false (setval(seq, 0) seria erro).
    """
    return [
        f"SELECT setval(pg_get_serial_sequence('{tabela}', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) "
        f"FROM {tabela};"
        for tabela in ("mercado", "produto", "preco", "promocao")
    ]


def montar_precos(mercado_key: str, preco: float) -> dict:
    """Preços por rede de um item coletado: apenas a rede de origem.

    Redes em que o produto não foi coletado ficam ausentes (nunca estimadas).
    """
    return {mercado_key: preco}


def chave_mercado(supermercado) -> str:
    """Chave da rede (zaffari, rissul, ...) a partir do nome do supermercado de origem."""
    s = (supermercado or "fort").lower()
    if "zaffari" in s or "bourbon" in s:
        return "zaffari"
    if "rissul" in s:
        return "rissul"
    if "asun" in s:
        return "asun"
    if "stok" in s:
        return "stok"
    if "atacadao" in s or "atacadão" in s:
        return "atacadao"
    if "master" in s:
        return "master"
    if "carrefour" in s:
        return "carrefour"
    return "fort"


CABECALHO_DATA_JS = (
    "// Catálogo estático SmartMarket: {total} produtos, cada um com o preço real da rede onde foi coletado "
    "(sem preço simulado). Gerado por scraper/gerar_catalogo_e_sql.py"
)
MARCADOR_PRODUCTS = "export const PRODUCTS = "


def limpar_precos_catalogo(produtos):
    """Deixa em cada produto só o preço da rede de origem (supermercadoOrigem), via montar_precos.

    Mantém id, ordem e demais campos. Recalcula menorPreco/mercadoMenorPreco quando existem e
    descarta clubPrices de outras redes. Devolve (produtos, resumo).
    """
    resumo = {"produtos": 0, "precos_removidos": 0, "sem_preco_na_origem": 0, "por_rede": {}}
    for p in produtos:
        resumo["produtos"] += 1
        chave = chave_mercado(p.get("supermercadoOrigem"))
        antigos = p.get("prices") or {}
        valor = antigos.get(chave)
        if isinstance(valor, (int, float)) and valor > 0:
            novos = montar_precos(chave, valor)
            resumo["por_rede"][chave] = resumo["por_rede"].get(chave, 0) + 1
        else:
            novos = {}
            resumo["sem_preco_na_origem"] += 1
        resumo["precos_removidos"] += len([k for k in antigos if k not in novos])
        p["prices"] = novos
        if "menorPreco" in p or "mercadoMenorPreco" in p:
            p["menorPreco"] = novos.get(chave)
            p["mercadoMenorPreco"] = chave if novos else None
        if isinstance(p.get("clubPrices"), dict):
            p["clubPrices"] = {k: v for k, v in p["clubPrices"].items() if k in novos}
    return produtos, resumo


def regenerar_data_js(caminho=None):
    """Regrava o data.js existente sem preço simulado, sem nova coleta.

    Os dados de entrada são os produtos já coletados no próprio data.js. O bloco de CATEGORIES e
    MARKETS fica intacto; mudam só a linha de comentário do topo e os preços de PRODUCTS.
    """
    caminho = Path(caminho or DATA_JS_DESTINO)
    texto = caminho.read_text(encoding="utf-8").replace("\r\n", "\n")
    inicio = texto.index(MARCADOR_PRODUCTS)
    cabecalho = texto[:inicio]
    corpo = texto[inicio + len(MARCADOR_PRODUCTS):]
    fim = corpo.rindex("]") + 1
    produtos, resumo = limpar_precos_catalogo(json.loads(corpo[:fim]))

    linhas = cabecalho.split("\n")
    if linhas and linhas[0].startswith("//"):
        linhas = linhas[1:]
    novo_cabecalho = CABECALHO_DATA_JS.format(total=len(produtos)) + "\n" + "\n".join(linhas)
    conteudo = novo_cabecalho + MARCADOR_PRODUCTS + json.dumps(produtos, ensure_ascii=False, indent=2) + corpo[fim:]
    with open(caminho, "w", encoding="utf-8", newline="\n") as arq:
        arq.write(conteudo)
    return resumo


def gerar_sql_e_data():
    itens = carregar_todos_produtos()
    print(f"Total de itens carregados para processamento: {len(itens)}")

    # Entrada sem nenhum produto válido: recusa ANTES de tocar em qualquer arquivo. Antes o script
    # gravava data.js e SQL versionados com catálogo vazio e saía com código 0.
    validos = [i for i in itens if (i.get("nome_bruto") or "").strip()]
    if not validos:
        raise EntradaVaziaError(
            f"Nenhum produto válido na entrada ({len(itens)} itens lidos de '{OUTPUT_DIR}'): "
            f"'{SQL_DESTINO.name}' e '{DATA_JS_DESTINO.name}' foram mantidos como estavam.")

    # Mesmo produto repetido na coleta (mesma rede e mesmo id de origem) vale um produto só.
    registro = RegistroIds.carregar()
    unicos, vistos = [], set()
    for item in validos:
        chave = chave_estavel(item)
        if chave in vistos:
            continue
        vistos.add(chave)
        unicos.append((item, chave))
    if len(unicos) < len(validos):
        print(f"Itens repetidos na coleta (mesma rede e id de origem) ignorados: {len(validos) - len(unicos)}")

    # 1. Gerar SQL
    linhas_sql = []
    linhas_sql.append("-- ============================================================")
    linhas_sql.append("-- SmartMarket - Script de Carga de Todos os Produtos Coletados (RS)")
    linhas_sql.append(f"-- Total de produtos registrados: {len(unicos)}")
    linhas_sql.append("-- ============================================================\n")
    linhas_sql.append("BEGIN;\n")

    # Garante mercados
    linhas_sql.append("-- Inserção / Garantia dos 8 Mercados do Rio Grande do Sul")
    mercados_sql = [
        (1, "Fort Atacadista", "Canoas / Grande POA - RS", "/images/mercados/fort.png"),
        (2, "Carrefour Mercado", "Av. Ipiranga, 5300, Porto Alegre - RS", "/images/mercados/carrefour.png"),
        (3, "Asun Supermercados", "Região Metropolitana e Litoral - RS", "/images/mercados/asun.png"),
        (4, "Atacadão", "Av. Sertório, 6767, Porto Alegre - RS", "/images/mercados/atacadao.png"),
        (5, "Master Supermercados", "Erechim e Porto Alegre - RS", "/images/mercados/master.png"),
        (6, "Zaffari / Bourbon", "Av. Ipiranga, 5200, Porto Alegre - RS", "/images/mercados/zaffari.png"),
        (7, "Supermercados Rissul", "Av. Nações Unidas, 2001, Novo Hamburgo - RS", "/images/mercados/rissul.png"),
        (8, "Stok Center", "Passo Fundo e Atacarejos RS", "/images/mercados/stok.png"),
    ]
    for mid, mnome, mend, mlogo in mercados_sql:
        linhas_sql.append(
            f"INSERT INTO mercado (id, nome, endereco, logo_url, ativo) "
            f"VALUES ({mid}, {escape_sql(mnome)}, {escape_sql(mend)}, {escape_sql(mlogo)}, TRUE) "
            f"ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, endereco = EXCLUDED.endereco;"
        )
    linhas_sql.append("\n-- Inserção de Produtos e Preços\n")

    produtos_frontend = []

    for item, chave in unicos:
        nome = item.get("nome_bruto", "").strip()
        prod_id = registro.id_de(chave)

        marca = item.get("marca") or "Geral"
        cat_bruta = item.get("categoria") or ""
        cat = detectar_categoria(nome, cat_bruta)
        unidade = extrair_unidade(nome)
        preco = float(item.get("preco") or 0.0)
        preco_normal = float(item.get("preco_normal") or preco)
        em_promo = bool(item.get("em_promocao") or preco < preco_normal)
        desc = item.get("descricao") or f"{nome} - Qualidade garantida para o seu lar."
        
        img_local = item.get("imagem_local")
        if not img_local:
            img_url = item.get("imagem_url") or ""
            img_local = img_url

        mercado_key = chave_mercado(item.get("supermercado"))

        mercado_id = MERCADOS_MAP[mercado_key]["id"]

        # Adiciona ao SQL
        linhas_sql.append(
            f"INSERT INTO produto (id, nome, nome_normalizado, marca, quantidade, unidade, categoria, imagem_url, descricao) "
            f"VALUES ({prod_id}, {escape_sql(nome)}, {escape_sql(nome_normalizado(nome))}, {escape_sql(marca)}, 1.0, {escape_sql(unidade)}, "
            f"{escape_sql(cat)}, {escape_sql(img_local)}, {escape_sql(desc)}) "
            f"ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, nome_normalizado = EXCLUDED.nome_normalizado, "
            f"marca = EXCLUDED.marca, unidade = EXCLUDED.unidade, categoria = EXCLUDED.categoria, "
            f"imagem_url = EXCLUDED.imagem_url, descricao = EXCLUDED.descricao;"
        )

        # O histórico de preços cresce a cada coleta, mas reexecutar o mesmo SQL no mesmo dia
        # com o mesmo valor não duplica a linha.
        linhas_sql.append(
            f"INSERT INTO preco (produto_id, mercado_id, valor, coletado_em, origem, nome_bruto, disponivel) "
            f"SELECT {prod_id}, {mercado_id}, {preco:.2f}, CURRENT_TIMESTAMP, {escape_sql(mercado_key)}, {escape_sql(nome)}, TRUE "
            f"WHERE NOT EXISTS (SELECT 1 FROM preco WHERE produto_id = {prod_id} AND mercado_id = {mercado_id} "
            f"AND valor = {preco:.2f} AND origem = {escape_sql(mercado_key)} AND coletado_em::date = CURRENT_DATE);"
        )

        if em_promo and preco_normal > preco:
            linhas_sql.append(sql_promocao(prod_id, mercado_id, preco_normal, preco, item.get("promocao_valida_ate")))

        # Adiciona ao objeto do frontend: somente a rede onde o preço foi realmente coletado
        prices_dict = montar_precos(mercado_key, preco)

        # Suporte a sequências 360° autenticadas
        frames_360 = item.get("three_dimensional_images_local") or item.get("three_dimensional_images")
        recursos_visuais = None
        if isinstance(frames_360, list) and len(frames_360) >= 2:
            recursos_visuais = {
                "has360": True,
                "totalFrames": len(frames_360),
                "origem": f"{item.get('supermercado', 'Supermercado')} (Origem autenticada)",
                "idOrigem": str(item.get("id_produto_origem", "")),
                "frames": frames_360
            }

        prod_dict = {
            "id": f"p{prod_id}",
            "name": nome,
            "brand": marca,
            "category": cat,
            "unit": unidade,
            "image": EMOJIS_CAT.get(cat, "🛒"),
            "imageLocal": img_local,
            "imageUrl": item.get("imagem_url") or img_local,
            "descricao": desc,
            "prices": prices_dict,
            "promo": em_promo,
            "urlProduto": item.get("url_produto"),
            "idOrigem": str(item.get("id_produto_origem", "")) if item.get("id_produto_origem") else None,
            "supermercadoOrigem": item.get("supermercado"),
            "precoNormal": preco_normal if em_promo else preco,
        }
        if recursos_visuais:
            prod_dict["recursosVisuais"] = recursos_visuais

        produtos_frontend.append(prod_dict)

    linhas_sql.append("\n-- Ajusta as sequências após os INSERTs com id explícito (o INSERT sem id do pipeline não colide)")
    linhas_sql.extend(sql_ajustar_sequencias())
    linhas_sql.append("\nCOMMIT;\n")

    # Salva arquivo SQL
    escrever_atomico(SQL_DESTINO, "\n".join(linhas_sql))
    print(f"Script SQL gerado com sucesso em '{SQL_DESTINO}' ({len(linhas_sql)} linhas)")

    # 2. Gerar frontend/src/data.js
    categorias_js = """export const CATEGORIES = [
  { id: 'todos', label: 'Todos os Departamentos', icon: '🏪' },
  { id: 'graos', label: 'Grãos, Arroz e Feijão', icon: '🌾' },
  { id: 'leites', label: 'Leites e Laticínios', icon: '🥛' },
  { id: 'oleos', label: 'Óleos, Azeites e Vinagres', icon: '🫙' },
  { id: 'cafe', label: 'Café, Chá e Achocolatados', icon: '☕' },
  { id: 'bebidas', label: 'Bebidas e Cervejas', icon: '🍺' },
  { id: 'carnes', label: 'Açougue e Carnes Nobres', icon: '🥩' },
  { id: 'higiene', label: 'Higiene e Limpeza', icon: '🧴' },
  { id: 'biscoitos', label: 'Biscoitos e Chocolates', icon: '🍪' },
  { id: 'mercearia', label: 'Mercearia e Despensa', icon: '🛒' },
]

export const MARKETS = [
  { id: 'zaffari', name: 'Zaffari / Bourbon', color: '#7A1526', sigla: 'ZF', cidade: 'Porto Alegre / RS' },
  { id: 'rissul', name: 'Supermercados Rissul', color: '#E31C24', sigla: 'RS', cidade: 'Vale dos Sinos / RS' },
  { id: 'asun', name: 'Asun Supermercados', color: '#00863F', sigla: 'AS', cidade: 'Região Metropolitana / Litoral RS' },
  { id: 'stok', name: 'Stok Center', color: '#009640', sigla: 'SC', cidade: 'Atacarejo RS' },
  { id: 'atacadao', name: 'Atacadão', color: '#D9232E', sigla: 'AT', cidade: 'Atacado RS' },
  { id: 'master', name: 'Master Supermercados', color: '#1C3F94', sigla: 'MS', cidade: 'Erechim / POA' },
  { id: 'fort', name: 'Fort Atacadista', color: '#F5651B', sigla: 'FA', cidade: 'Canoas / Grande POA' },
  { id: 'carrefour', name: 'Carrefour Mercado', color: '#1A63B9', sigla: 'CF', cidade: 'Porto Alegre / RS' },
]
"""
    produtos_json = json.dumps(produtos_frontend, ensure_ascii=False, indent=2)
    conteudo_data_js = f"{CABECALHO_DATA_JS.format(total=len(produtos_frontend))}\n\n{categorias_js}\nexport const PRODUCTS = {produtos_json};\n"

    escrever_atomico(DATA_JS_DESTINO, conteudo_data_js)
    print(f"Catálogo do frontend atualizado com {len(produtos_frontend)} produtos em '{DATA_JS_DESTINO}'!")

    # O registro só é gravado depois dos dois arquivos: se algo falhar antes, os ids novos de hoje
    # são reatribuídos da mesma forma amanhã (mesma entrada, mesma ordem).
    escrever_atomico(REGISTRO_IDS, registro.para_json())
    print(f"Registro de ids gravado em '{REGISTRO_IDS}' (próximo id livre: {registro.proximo_id})")


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if "--limpar-data-js" in argv:
        r = regenerar_data_js()
        print(f"data.js regenerado sem preço simulado: {r['produtos']} produtos, "
              f"{r['precos_removidos']} preços fora da rede de origem removidos, "
              f"{r['sem_preco_na_origem']} sem preço na rede de origem. Por rede: {r['por_rede']}")
        return 0
    try:
        gerar_sql_e_data()
    except EntradaVaziaError as erro:
        print(f"ERRO: {erro}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
