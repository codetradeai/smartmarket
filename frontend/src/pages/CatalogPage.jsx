import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { CATEGORIES, MARKETS, PRODUCTS } from "../data"
import { Button, Input, Card } from "../components/ui"

// Helpers de persistência
function getList() {
  try {
    return JSON.parse(sessionStorage.getItem("sm_list") || "{}")
  } catch {
    return {}
  }
}

function saveList(list) {
  try {
    sessionStorage.setItem("sm_list", JSON.stringify(list))
  } catch {
    // fallback
  }
}

function getFavMarkets() {
  try {
    return JSON.parse(localStorage.getItem("sm_fav_markets") || '["fort", "carrefour"]')
  } catch {
    return ["fort", "carrefour"]
  }
}

function saveFavMarkets(ids) {
  try {
    localStorage.setItem("sm_fav_markets", JSON.stringify(ids))
  } catch {
    // fallback
  }
}

function getFavProducts() {
  try {
    return JSON.parse(localStorage.getItem("sm_fav_products") || '["p1", "p3", "p9", "p17"]')
  } catch {
    return ["p1", "p3", "p9", "p17"]
  }
}

function saveFavProducts(ids) {
  try {
    localStorage.setItem("sm_fav_products", JSON.stringify(ids))
  } catch {
    // fallback
  }
}

function getCheapest(product) {
  const valid = Object.entries(product.prices || {}).filter(
    ([, v]) => v !== null && v !== undefined
  )
  if (!valid.length) return null
  return valid.reduce((min, curr) => (curr[1] < min[1] ? curr : min))
}

/**
 * Faixa de Mercados Favoritos do Figma
 */
function FavMarketsStrip({ favs, onToggle }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-border p-3 sm:p-4 flex items-center gap-3 flex-wrap shadow-xs">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-amber-500 text-sm">⭐</span>
        <span className="text-xs font-bold text-brand-navy whitespace-nowrap">
          Mercados favoritos:
        </span>
      </div>

      <div className="hidden sm:block w-px h-5 bg-brand-border shrink-0" />

      <div className="flex items-center gap-2 flex-wrap">
        {MARKETS.map((m) => {
          const isFav = favs.includes(m.id)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onToggle(m.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                isFav
                  ? "bg-amber-50 text-amber-900 border-amber-300 shadow-xs"
                  : "bg-slate-50 text-brand-navy border-brand-border hover:bg-slate-100"
              }`}
              title={isFav ? "Remover dos favoritos" : "Favoritar mercado"}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
              <span>{m.name}</span>
              <span className={isFav ? "text-amber-500 font-bold" : "text-slate-400"}>
                {isFav ? "★" : "☆"}
              </span>
            </button>
          )
        })}
      </div>

      {favs.length === 0 && (
        <span className="text-xs text-brand-muted italic">
          Clique em uma rede para destacar seus preços prioritários.
        </span>
      )}
    </div>
  )
}

/**
 * Card de Produto Individual do Figma
 */
function CatalogProductCard({
  product,
  favMarkets,
  isFavProduct,
  onToggleFavProduct,
  onAdd,
}) {
  const [added, setAdded] = useState(false)
  const best = getCheapest(product)
  const bestMkt = best ? MARKETS.find((m) => m.id === best[0]) : null

  // Preço do mercado favorito mais barato (se o usuário favoritou mercados)
  const favPrices = favMarkets.length > 0
    ? Object.entries(product.prices || {})
        .filter(([id, v]) => favMarkets.includes(id) && v !== null && v !== undefined)
        .sort((a, b) => a[1] - b[1])
    : []
  const favBest = favPrices.length > 0 ? favPrices[0] : null
  const favBestMkt = favBest ? MARKETS.find((m) => m.id === favBest[0]) : null

  const handleAddClick = () => {
    const list = getList()
    list[product.id] = (list[product.id] || 0) + 1
    saveList(list)
    onAdd(product.id)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <Card variant="interactive" className="flex flex-col justify-between group relative overflow-hidden">
      {/* Ribbon de Oferta */}
      {product.promo && (
        <div className="absolute top-0 left-0 bg-brand-amber text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-br-lg tracking-wider z-10 shadow-xs">
          OFERTA
        </div>
      )}

      {/* Área da Imagem / Emoji */}
      <div className="h-32 bg-slate-50 flex items-center justify-center text-5xl border-b border-brand-border/60 relative group-hover:scale-105 transition-transform duration-200">
        {product.image}
        {/* Botão de Favoritar Produto */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavProduct(product.id)
          }}
          title={isFavProduct ? "Remover dos favoritos" : "Favoritar produto"}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-xs ${
            isFavProduct
              ? "bg-rose-50 border-rose-200 text-rose-500 scale-105"
              : "bg-white/90 border-brand-border text-slate-400 hover:text-rose-500 hover:bg-white"
          }`}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Corpo do Card */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-brand-navy line-clamp-1 leading-snug">
            {product.name}
          </h3>
          <p className="text-xs text-brand-muted mt-0.5">
            {product.brand} · {product.unit}
          </p>
        </div>

        {/* Menor Preço e Destaque de Mercado */}
        {best && bestMkt && (
          <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                Menor preço
              </span>
              <p className="text-lg font-extrabold text-brand-green leading-none mt-0.5">
                R$ {best[1].toFixed(2)}
              </p>
              <p className="text-[11px] text-brand-muted mt-1 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bestMkt.color }} />
                <span>{bestMkt.name}</span>
              </p>
            </div>

            {/* Destaque se o mercado favorito tiver bom preço */}
            {favBest && favBestMkt && favBestMkt.id !== bestMkt.id && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-right">
                <span className="text-[9px] font-bold text-amber-800 block">
                  ⭐ {favBestMkt.name}
                </span>
                <span className="text-xs font-bold text-amber-900">
                  R$ {favBest[1].toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Comparativo em Pills para Todos os Mercados */}
        <div className="flex gap-1.5 flex-wrap">
          {MARKETS.map((m) => {
            const price = product.prices?.[m.id]
            const isBest = best?.[0] === m.id
            const isFav = favMarkets.includes(m.id)

            return (
              <div
                key={m.id}
                title={m.name}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 border ${
                  isBest
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : isFav
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : "bg-slate-50 text-brand-muted border-slate-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span>{price ? `R$ ${price.toFixed(2)}` : "—"}</span>
              </div>
            )
          })}
        </div>

        {/* Botão de Adicionar à Lista */}
        <Button
          variant={added ? "subtle" : "primary"}
          size="sm"
          className="w-full mt-1 font-bold text-xs"
          onClick={handleAddClick}
        >
          {added ? (
            <span className="flex items-center gap-1.5 text-brand-green">
              <span>✓</span>
              <span>Adicionado!</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span>🛒</span>
              <span>Adicionar à lista</span>
            </span>
          )}
        </Button>
      </div>
    </Card>
  )
}

export default function CatalogPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("todos")
  const [marketFilter, setMarketFilter] = useState("todos")
  const [sortOrder, setSortOrder] = useState("cheapest") // 'cheapest' | 'highest' | 'name' | 'default'
  const [favMarkets, setFavMarkets] = useState(getFavMarkets)
  const [favProducts, setFavProducts] = useState(getFavProducts)
  const [listCount, setListCount] = useState(() =>
    Object.values(getList()).reduce((a, b) => a + b, 0)
  )

  const toggleFavProduct = (id) => {
    const next = favProducts.includes(id)
      ? favProducts.filter((f) => f !== id)
      : [...favProducts, id]
    setFavProducts(next)
    saveFavProducts(next)
  }

  const toggleFavMarket = (id) => {
    const next = favMarkets.includes(id)
      ? favMarkets.filter((f) => f !== id)
      : [...favMarkets, id]
    setFavMarkets(next)
    saveFavMarkets(next)
  }

  const handleProductAdded = () => {
    setListCount(Object.values(getList()).reduce((a, b) => a + b, 0))
  }

  const clearAllFilters = () => {
    setSearch("")
    setCategory("todos")
    setMarketFilter("todos")
    setSortOrder("cheapest")
  }

  // Filtragem e Ordenação
  const processedProducts = useMemo(() => {
    let result = PRODUCTS.filter((p) => {
      // Filtro de Categoria
      if (category !== "todos" && p.category !== category) return false

      // Filtro de Mercado (somente produtos que possuem preço no mercado selecionado)
      if (marketFilter !== "todos" && (p.prices?.[marketFilter] === null || p.prices?.[marketFilter] === undefined)) {
        return false
      }

      // Filtro de Busca
      if (search) {
        const query = search.toLowerCase()
        const matchName = p.name.toLowerCase().includes(query)
        const matchBrand = p.brand.toLowerCase().includes(query)
        if (!matchName && !matchBrand) return false
      }

      return true
    })

    // Ordenação
    result = [...result].sort((a, b) => {
      const bestA = getCheapest(a)
      const bestB = getCheapest(b)
      const priceA = bestA ? bestA[1] : 999999
      const priceB = bestB ? bestB[1] : 999999

      if (sortOrder === "cheapest") {
        return priceA - priceB // Menor Preço Primeiro
      }
      if (sortOrder === "highest") {
        return priceB - priceA // Maior Preço Primeiro
      }
      if (sortOrder === "name") {
        return a.name.localeCompare(b.name) // Ordem Alfabética
      }
      return 0
    })

    return result
  }, [search, category, marketFilter, sortOrder])

  const hasActiveFilters = search || category !== "todos" || marketFilter !== "todos" || sortOrder !== "cheapest"

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg font-sans">
      {/* Topbar Fixa com Busca e Filtros */}
      <div className="bg-white border-b border-brand-border/80 px-4 sm:px-8 py-5 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          {/* Linha Superior: Título, Busca e Botão da Lista */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-brand-navy tracking-tight">
                Catálogo de Produtos
              </h1>
              <p className="text-xs text-brand-muted mt-0.5">
                Compare preços oficiais do Fort Atacadista, Carrefour e redes parceiras.
              </p>
            </div>

            {/* Barra de Busca Central */}
            <div className="flex-1 max-w-md">
              <Input
                isSearch
                placeholder="Buscar arroz, café, leite, sabão..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                className="h-11 bg-slate-50 border-brand-border/70 focus:bg-white text-xs"
              />
            </div>

            {/* Botão de Atalho para a Lista de Compras */}
            <Link to="/list" className="shrink-0">
              <Button variant="primary" size="md" className="gap-2 shadow-xs">
                <span>🛒</span>
                <span>Minha Lista</span>
                {listCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-white text-brand-green">
                    {listCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>

          {/* Linha Inferior: Filtros de Categoria, Mercado e Ordenação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
            {/* Categorias */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    category === c.id
                      ? "bg-brand-navy text-white shadow-xs"
                      : "bg-slate-100 text-brand-navy hover:bg-slate-200"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label.split(",")[0]}</span>
                </button>
              ))}
            </div>

            {/* Mercado e Ordenação */}
            <div className="flex items-center gap-3 ml-auto flex-wrap">
              {/* Filtro de Mercado */}
              <div className="flex items-center gap-1 text-xs">
                <span className="font-bold text-brand-muted uppercase text-[10px] tracking-wider">
                  Mercado:
                </span>
                <select
                  value={marketFilter}
                  onChange={(e) => setMarketFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-brand-border bg-white text-brand-navy font-semibold focus:outline-none focus:ring-1 focus:ring-brand-green"
                >
                  <option value="todos">Todos os Mercados</option>
                  {MARKETS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seletor de Ordenação (Requisito Explícito do Card) */}
              <div className="flex items-center gap-1 text-xs">
                <span className="font-bold text-brand-muted uppercase text-[10px] tracking-wider">
                  Ordenar:
                </span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-brand-border bg-white text-brand-navy font-semibold focus:outline-none focus:ring-1 focus:ring-brand-green"
                >
                  <option value="cheapest">Menor Preço Primeiro</option>
                  <option value="highest">Maior Preço Primeiro</option>
                  <option value="name">Nome (A - Z)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corpo Principal com Grade de Produtos */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 flex-1 flex flex-col gap-6">
        {/* Faixa de Mercados Favoritos */}
        <FavMarketsStrip favs={favMarkets} onToggle={toggleFavMarket} />

        {/* Barra de Contagem e Limpeza de Filtros */}
        <div className="flex items-center justify-between text-xs text-brand-muted">
          <div>
            Exibindo{" "}
            <strong className="text-brand-navy font-bold">{processedProducts.length}</strong> de{" "}
            <strong className="text-brand-navy font-bold">{PRODUCTS.length}</strong> produtos
            disponíveis
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-brand-green font-bold hover:underline flex items-center gap-1"
            >
              <span>✕</span>
              <span>Limpar todos os filtros</span>
            </button>
          )}
        </div>

        {/* Grade de Produtos ou Empty State */}
        {processedProducts.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center my-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-brand-muted flex items-center justify-center text-3xl mb-4">
              🔍
            </div>
            <h2 className="text-lg font-bold text-brand-navy mb-1">
              Nenhum produto corresponde aos filtros
            </h2>
            <p className="text-xs text-brand-muted max-w-sm mx-auto mb-6">
              Não encontramos produtos para os critérios de busca selecionados. Tente buscar por
              outro termo ou limpe os filtros.
            </p>
            <Button variant="primary" size="md" onClick={clearAllFilters}>
              Limpar Filtros e Ver Todos
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {processedProducts.map((product) => (
              <CatalogProductCard
                key={product.id}
                product={product}
                favMarkets={favMarkets}
                isFavProduct={favProducts.includes(product.id)}
                onToggleFavProduct={toggleFavProduct}
                onAdd={handleProductAdded}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
