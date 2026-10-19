import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { PRODUCTS, MARKETS, CATEGORIES } from "../data"
import { Button, Input, Card, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "../components/ui"
import { favoritoService, produtoService, mercadoService } from "../services"

// Helpers de persistência
function getFavProducts() {
  try {
    const stored = localStorage.getItem("sm_fav_products")
    if (stored) return JSON.parse(stored)
  } catch {
    // fallback
  }
  const initial = ["p1", "p3", "p9", "p17"]
  try {
    localStorage.setItem("sm_fav_products", JSON.stringify(initial))
  } catch {
    // fallback
  }
  return initial
}

function saveFavProducts(ids) {
  try {
    localStorage.setItem("sm_fav_products", JSON.stringify(ids))
  } catch {
    // fallback
  }
}

function getFavMarkets() {
  try {
    const stored = localStorage.getItem("sm_fav_markets")
    if (stored) return JSON.parse(stored)
  } catch {
    // fallback
  }
  const initial = ["fort", "carrefour"]
  try {
    localStorage.setItem("sm_fav_markets", JSON.stringify(initial))
  } catch {
    // fallback
  }
  return initial
}

function saveFavMarkets(ids) {
  try {
    localStorage.setItem("sm_fav_markets", JSON.stringify(ids))
  } catch {
    // fallback
  }
}

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

function getPriceAlerts() {
  try {
    return JSON.parse(localStorage.getItem("sm_price_alerts") || "{}")
  } catch {
    return {}
  }
}

function savePriceAlerts(alerts) {
  try {
    localStorage.setItem("sm_price_alerts", JSON.stringify(alerts))
  } catch {
    // fallback
  }
}

function getCheapestPrice(product) {
  const valid = Object.entries(product.prices || {}).filter(([, v]) => v !== null && v !== undefined)
  if (!valid.length) return null
  return valid.reduce((min, curr) => (curr[1] < min[1] ? curr : min))
}

export default function FavoritesPage() {
  const [favProductIds, setFavProductIds] = useState(getFavProducts)
  const [favMarketIds, setFavMarketIds] = useState(getFavMarkets)
  const [priceAlerts, setPriceAlerts] = useState(getPriceAlerts)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("todos")
  const [activeTab, setActiveTab] = useState("produtos") // 'produtos' | 'mercados' | 'alertas'
  const [toastMessage, setToastMessage] = useState("")

  useEffect(() => {
    async function carregarFavoritos() {
      try {
        const [mkts, prods] = await Promise.all([
          favoritoService.listarMercados(),
          favoritoService.listarProdutos(),
        ])
        if (Array.isArray(mkts) && mkts.length > 0) {
          setFavMarketIds(mkts.map(m => m.mercadoId || m.id || m))
        }
        if (Array.isArray(prods) && prods.length > 0) {
          setFavProductIds(prods.map(p => p.produtoId || p.id || p))
        }
      } catch {
        // Fallback local
      }
    }
    carregarFavoritos()
  }, [])

  // Estado do Modal de Alerta de Preço
  const [alertModalOpen, setAlertModalOpen] = useState(false)
  const [selectedProductForAlert, setSelectedProductForAlert] = useState(null)
  const [targetPrice, setTargetPrice] = useState("")

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(""), 3000)
  }

  const toggleFavProduct = async (id) => {
    const isFav = favProductIds.includes(id)
    let updated
    if (isFav) {
      updated = favProductIds.filter((pId) => pId !== id)
      showToast("Produto removido dos favoritos.")
    } else {
      updated = [...favProductIds, id]
      showToast("Produto adicionado aos favoritos!")
    }
    setFavProductIds(updated)
    saveFavProducts(updated)

    try {
      if (isFav) await favoritoService.desfavoritarProduto(id)
      else await favoritoService.favoritarProduto(id)
    } catch {
      // Fallback gracioso mantem atualizacao local
    }
  }

  const toggleFavMarket = async (id) => {
    const isFav = favMarketIds.includes(id)
    let updated
    if (isFav) {
      updated = favMarketIds.filter((mId) => mId !== id)
      showToast("Mercado removido dos favoritos.")
    } else {
      updated = [...favMarketIds, id]
      showToast("Mercado adicionado aos favoritos!")
    }
    setFavMarketIds(updated)
    saveFavMarkets(updated)

    try {
      if (isFav) await favoritoService.desfavoritarMercado(id)
      else await favoritoService.favoritarMercado(id)
    } catch {
      // Fallback gracioso mantem atualizacao local
    }
  }

  const addToList = (productId) => {
    const list = getList()
    list[productId] = (list[productId] || 0) + 1
    saveList(list)
    showToast("Adicionado à sua lista de compras!")
  }

  const openAlertModal = (product) => {
    setSelectedProductForAlert(product)
    const currentAlert = priceAlerts[product.id]
    const cheapest = getCheapestPrice(product)
    setTargetPrice(currentAlert ? String(currentAlert) : cheapest ? (cheapest[1] * 0.9).toFixed(2) : "")
    setAlertModalOpen(true)
  }

  const handleSaveAlert = (e) => {
    e.preventDefault()
    if (!selectedProductForAlert || !targetPrice) return

    const parsedPrice = parseFloat(targetPrice.replace(",", "."))
    if (isNaN(parsedPrice) || parsedPrice <= 0) return

    const updated = { ...priceAlerts, [selectedProductForAlert.id]: parsedPrice }
    setPriceAlerts(updated)
    savePriceAlerts(updated)
    setAlertModalOpen(false)
    showToast(`Alerta de R$ ${parsedPrice.toFixed(2)} salvo para ${selectedProductForAlert.name}!`)
  }

  const handleRemoveAlert = (productId) => {
    const updated = { ...priceAlerts }
    delete updated[productId]
    setPriceAlerts(updated)
    savePriceAlerts(updated)
    showToast("Alerta de preço removido.")
  }

  // Filtragem de produtos favoritos
  const favProductsList = PRODUCTS.filter((p) => favProductIds.includes(p.id))
  const filteredProducts = favProductsList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === "todos" || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Estatística: Mercado mais barato entre os favoritos
  const marketScores = {}
  favProductsList.forEach((p) => {
    const cheapest = getCheapestPrice(p)
    if (cheapest) {
      marketScores[cheapest[0]] = (marketScores[cheapest[0]] || 0) + 1
    }
  })

  let bestMarketId = null
  let maxCheapestCount = 0
  Object.entries(marketScores).forEach(([mId, count]) => {
    if (count > maxCheapestCount) {
      maxCheapestCount = count
      bestMarketId = mId
    }
  })
  const bestMarket = MARKETS.find((m) => m.id === bestMarketId)

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-navy text-white px-5 py-3 rounded-2xl shadow-xl border border-brand-green/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-navy tracking-tight">
              Meus Favoritos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
              {favProductIds.length} produtos · {favMarketIds.length} mercados
            </span>
          </div>
          <p className="text-sm text-brand-muted mt-1">
            Monitore seus produtos essenciais e redes favoritas para economizar na cesta mensal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/catalog">
            <Button variant="outline" size="sm" leftIcon={<span>🏪</span>}>
              Explorar Catálogo
            </Button>
          </Link>
          <Link to="/list">
            <Button variant="primary" size="sm" leftIcon={<span>🛒</span>}>
              Ver Minha Lista
            </Button>
          </Link>
        </div>
      </div>

      {/* Banner de Inteligência de Preços (Insight) */}
      {bestMarket && favProductsList.length > 0 && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-brand-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-green text-white flex items-center justify-center text-2xl shadow-sm shadow-brand-green/30">
              💡
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-green">
                Economia Inteligente
              </p>
              <h2 className="text-base font-bold text-brand-navy">
                O <span className="text-brand-green">{bestMarket.name}</span> é o mais barato em{" "}
                <span className="underline decoration-brand-green">{maxCheapestCount} dos seus {favProductsList.length} favoritos</span>!
              </h2>
            </div>
          </div>
          <Link to="/list">
            <Button variant="teal" size="sm">
              Calcular Cesta Completa
            </Button>
          </Link>
        </div>
      )}

      {/* Tabs de Navegação */}
      <div className="flex items-center gap-2 mb-6 border-b border-brand-border/70 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("produtos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "produtos"
              ? "bg-brand-green text-white shadow-xs"
              : "text-brand-muted hover:text-brand-navy hover:bg-slate-100"
          }`}
        >
          <span>❤️</span>
          <span>Produtos Favoritos</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === "produtos" ? "bg-white/20 text-white" : "bg-slate-200 text-brand-navy"}`}>
            {favProductIds.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("mercados")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "mercados"
              ? "bg-brand-green text-white shadow-xs"
              : "text-brand-muted hover:text-brand-navy hover:bg-slate-100"
          }`}
        >
          <span>⭐</span>
          <span>Mercados Favoritos</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === "mercados" ? "bg-white/20 text-white" : "bg-slate-200 text-brand-navy"}`}>
            {favMarketIds.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("alertas")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "alertas"
              ? "bg-brand-green text-white shadow-xs"
              : "text-brand-muted hover:text-brand-navy hover:bg-slate-100"
          }`}
        >
          <span>🔔</span>
          <span>Alertas de Preço</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === "alertas" ? "bg-white/20 text-white" : "bg-slate-200 text-brand-navy"}`}>
            {Object.keys(priceAlerts).length}
          </span>
        </button>
      </div>

      {/* ABA 1: PRODUTOS FAVORITOS */}
      {activeTab === "produtos" && (
        <section aria-label="Produtos Favoritos">
          {/* Barra de Filtro e Busca */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="w-full md:w-80">
              <Input
                isSearch
                placeholder="Buscar em favoritos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                className="h-10 text-xs bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? "bg-brand-navy text-white"
                      : "bg-white border border-brand-border text-brand-muted hover:text-brand-navy"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label.split(",")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Produtos ou Empty State */}
          {filteredProducts.length === 0 ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-3xl mb-4">
                💔
              </div>
              <h2 className="text-xl font-bold text-brand-navy mb-1">
                {search ? "Nenhum produto favorito encontrado" : "Você ainda não favoritou nenhum produto"}
              </h2>
              <p className="text-xs text-brand-muted max-w-md mx-auto mb-6">
                {search
                  ? "Tente buscar por outro termo ou selecione a categoria 'Todos'."
                  : "Navegue pelo catálogo e clique no coração dos itens que você compra com frequência para acompanhar as variações de preço."}
              </p>
              <Link to="/catalog">
                <Button variant="primary">Ir para o Catálogo</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((p) => {
                const cheapest = getCheapestPrice(p)
                const cheapestMarket = cheapest ? MARKETS.find((m) => m.id === cheapest[0]) : null
                const hasAlert = Boolean(priceAlerts[p.id])

                return (
                  <Card key={p.id} variant="interactive" className="flex flex-col group relative">
                    {/* Botão de Desfavoritar */}
                    <button
                      type="button"
                      onClick={() => toggleFavProduct(p.id)}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs border border-rose-200 text-rose-500 flex items-center justify-center shadow-xs hover:scale-110 transition-transform"
                      title="Remover dos favoritos"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Imagem / Emoji */}
                    <div className="h-32 bg-slate-50 flex items-center justify-center text-5xl border-b border-brand-border/60 group-hover:scale-105 transition-transform duration-200">
                      {p.image}
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                            {p.brand}
                          </span>
                          <span className="text-[10px] text-brand-muted">· {p.unit}</span>
                          {p.promo && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded-sm">
                              OFERTA
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-brand-navy line-clamp-1">{p.name}</h3>
                      </div>

                      {/* Comparativo de Preços */}
                      <div className="my-3 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-brand-muted block font-medium">Menor Preço</span>
                          {cheapest ? (
                            <span className="text-lg font-extrabold text-brand-green">
                              R$ {cheapest[1].toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-brand-muted">Indisponível</span>
                          )}
                        </div>
                        {cheapestMarket && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-brand-navy">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cheapestMarket.color }} />
                            <span>{cheapestMarket.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Alerta de Preço Ativo */}
                      {hasAlert && (
                        <div className="mb-3 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-[11px] text-amber-900">
                          <span className="font-semibold">🔔 Alvo: R$ {priceAlerts[p.id].toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAlert(p.id)}
                            className="text-amber-700 hover:text-amber-900 text-xs font-bold"
                            title="Remover alerta"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => addToList(p.id)}
                        >
                          + Lista
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2"
                          title="Definir alerta de preço"
                          onClick={() => openAlertModal(p)}
                        >
                          🔔
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ABA 2: MERCADOS FAVORITOS */}
      {activeTab === "mercados" && (
        <section aria-label="Mercados Favoritos">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MARKETS.map((m) => {
              const isFav = favMarketIds.includes(m.id)
              const countCheapest = marketScores[m.id] || 0

              return (
                <Card key={m.id} variant="elevated" className="p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.name[0]}
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-brand-navy">{m.name}</h3>
                          <span className="text-xs text-brand-muted">Porto Alegre e Região</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavMarket(m.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isFav
                            ? "bg-amber-100 text-amber-600 border border-amber-200"
                            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                        }`}
                        title={isFav ? "Remover dos favoritos" : "Favoritar mercado"}
                      >
                        <span className="text-base">★</span>
                      </button>
                    </div>

                    <div className="space-y-2 py-3 border-y border-slate-100 my-4 text-xs">
                      <div className="flex justify-between text-brand-muted">
                        <span>Menor preço em seus favoritos:</span>
                        <strong className="text-brand-navy font-bold">{countCheapest} itens</strong>
                      </div>
                      <div className="flex justify-between text-brand-muted">
                        <span>Status de coleta:</span>
                        <span className="text-brand-green font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                          Atualizado Hoje
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={isFav ? "subtle" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleFavMarket(m.id)}
                    >
                      {isFav ? "★ Favoritado" : "Favoritar"}
                    </Button>
                    <Link to="/catalog" className="flex-1">
                      <Button variant="primary" size="sm" className="w-full">
                        Ver Ofertas
                      </Button>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* ABA 3: ALERTAS DE PREÇO ATIVOS */}
      {activeTab === "alertas" && (
        <section aria-label="Alertas de Preço">
          {Object.keys(priceAlerts).length === 0 ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-3xl mb-4">
                🔔
              </div>
              <h2 className="text-xl font-bold text-brand-navy mb-1">
                Nenhum alerta de preço configurado
              </h2>
              <p className="text-xs text-brand-muted max-w-md mx-auto mb-6">
                Defina um valor-alvo nos seus produtos favoritos. Quando nossos scrapers encontrarem uma promoção abaixo do seu alvo, você economiza!
              </p>
              <Button variant="primary" onClick={() => setActiveTab("produtos")}>
                Ver Meus Favoritos
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(priceAlerts).map(([prodId, target]) => {
                const prod = PRODUCTS.find((p) => p.id === prodId)
                if (!prod) return null
                const cheapest = getCheapestPrice(prod)
                const isMet = cheapest && cheapest[1] <= target

                return (
                  <Card key={prodId} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{prod.image}</span>
                        <div>
                          <h4 className="text-sm font-bold text-brand-navy">{prod.name}</h4>
                          <span className="text-xs text-brand-muted">{prod.brand} · {prod.unit}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs mb-4">
                        <div className="flex justify-between">
                          <span className="text-brand-muted">Preço Alvo:</span>
                          <span className="font-extrabold text-brand-navy">R$ {target.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-brand-muted">Preço Atual:</span>
                          <span className={`font-extrabold ${isMet ? "text-brand-green" : "text-amber-600"}`}>
                            R$ {cheapest ? cheapest[1].toFixed(2) : "—"}
                          </span>
                        </div>
                        <div className="pt-1 flex justify-between font-bold">
                          <span>Status:</span>
                          {isMet ? (
                            <span className="text-brand-green">🎉 Meta Atingida!</span>
                          ) : (
                            <span className="text-brand-muted">Aguardando Baixa</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRemoveAlert(prodId)}
                      >
                        Excluir Alerta
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => addToList(prod.id)}
                      >
                        Adicionar
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Modal para Definir Alerta de Preço */}
      {selectedProductForAlert && (
        <Modal isOpen={alertModalOpen} onClose={() => setAlertModalOpen(false)} size="md">
          <form onSubmit={handleSaveAlert}>
            <ModalHeader>
              <ModalTitle>Definir Alerta de Preço</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl mb-4">
                <span className="text-4xl">{selectedProductForAlert.image}</span>
                <div>
                  <h4 className="font-bold text-brand-navy text-sm">{selectedProductForAlert.name}</h4>
                  <p className="text-xs text-brand-muted">
                    {selectedProductForAlert.brand} · {selectedProductForAlert.unit}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  label="Preço Alvo Desejado (R$)"
                  type="number"
                  step="0.01"
                  min="0.50"
                  required
                  placeholder="Ex: 19.90"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  helperText="Você será avisado quando o produto estiver igual ou abaixo deste valor."
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onClick={() => setAlertModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Salvar Alerta
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  )
}
