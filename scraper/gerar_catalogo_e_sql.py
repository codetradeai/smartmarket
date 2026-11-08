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
import unicodedata
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "scraper" / "output"
SQL_DESTINO = BASE_DIR / "backend" / "database" / "carga_completa_530_produtos.sql"
DATA_JS_DESTINO = BASE_DIR / "frontend" / "src" / "data.js"
IMAGENS_DIR = BASE_DIR / "frontend" / "public" / "images" / "produtos"

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


def sql_promocao(prod_id, mercado_id, preco_normal, preco, valida_ate=None) -> str:
    """INSERT de promoção. Sem validade informada pela rede, data_fim é NULL (nunca estimada)."""
    data_fim = escape_sql(valida_ate)
    return (
        f"INSERT INTO promocao (produto_id, mercado_id, valor_original, valor_promocional, data_inicio, data_fim, ativa) "
        f"VALUES ({prod_id}, {mercado_id}, {preco_normal:.2f}, {preco:.2f}, CURRENT_TIMESTAMP, {data_fim}, TRUE);"
    )


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

    # 1. Gerar SQL
    linhas_sql = []
    linhas_sql.append("-- ============================================================")
    linhas_sql.append("-- SmartMarket - Script de Carga de Todos os Produtos Coletados (RS)")
    linhas_sql.append(f"-- Total de produtos registrados: {len(itens)}")
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
    prod_id = 1

    for item in itens:
        nome = item.get("nome_bruto", "").strip()
        if not nome:
            continue

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
            f"ON CONFLICT (id) DO UPDATE SET imagem_url = EXCLUDED.imagem_url, descricao = EXCLUDED.descricao, "
            f"nome_normalizado = EXCLUDED.nome_normalizado;"
        )

        linhas_sql.append(
            f"INSERT INTO preco (produto_id, mercado_id, valor, coletado_em, origem, nome_bruto, disponivel) "
            f"VALUES ({prod_id}, {mercado_id}, {preco:.2f}, CURRENT_TIMESTAMP, {escape_sql(mercado_key)}, {escape_sql(nome)}, TRUE);"
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

        prod_id += 1

    linhas_sql.append("\nCOMMIT;\n")

    # Salva arquivo SQL
    SQL_DESTINO.parent.mkdir(parents=True, exist_ok=True)
    SQL_DESTINO.write_text("\n".join(linhas_sql), encoding="utf-8")
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

    DATA_JS_DESTINO.write_text(conteudo_data_js, encoding="utf-8")
    print(f"Catálogo do frontend atualizado com {len(produtos_frontend)} produtos em '{DATA_JS_DESTINO}'!")


if __name__ == "__main__":
    import sys

    if "--limpar-data-js" in sys.argv:
        r = regenerar_data_js()
        print(f"data.js regenerado sem preço simulado: {r['produtos']} produtos, "
              f"{r['precos_removidos']} preços fora da rede de origem removidos, "
              f"{r['sem_preco_na_origem']} sem preço na rede de origem. Por rede: {r['por_rede']}")
    else:
        gerar_sql_e_data()
