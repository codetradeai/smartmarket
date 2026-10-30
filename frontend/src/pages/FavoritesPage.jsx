import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { PRODUCTS, MARKETS, CATEGORIES } from "../data"
import { Button, Input, Card, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, ProductImage, ProductDetailModal, Product360HoverPreview } from "../components/ui"
import { favoritoService } from "../services"
import logoFort from "../../logo/logo-fort.png"
import logoAsun from "../../logo/logo-asun.png"
import logoStok from "../../logo/logo-stok.png"
import logoAtacadao from "../../logo/logo-atacadao.png"
import logoCarrefour from "../../logo/logo-carrefour.png"
import logoRissul from "../../logo/logo-rissul,.png"
import logoZaffari from "../../logo/zaffari-bourbon-logo.png"
import logoMaster from "../../logo/mastersupermercados-logo.png"

const MARKET_LOGOS = {
  fort: logoFort,
  asun: logoAsun,
  stok: logoStok,
  atacadao: logoAtacadao,
  carrefour: logoCarrefour,
  rissul: logoRissul,
  zaffari: logoZaffari,
  master: logoMaster,
}

const MARKET_LOGO_OPTICAL_CLASS = {
  zaffari: "max-h-10 sm:max-h-11 scale-[1.18]",
  rissul: "max-h-11 sm:max-h-12 scale-[1.85]",
  asun: "max-h-10 sm:max-h-11 scale-[1.38]",
  stok: "max-h-10 sm:max-h-11 scale-[1.42]",
  atacadao: "max-h-9 sm:max-h-10 scale-[1.16]",
  master: "max-h-9 sm:max-h-10 scale-[1.18]",
  fort: "max-h-10 sm:max-h-11 scale-[1.48]",
  carrefour: "max-h-10 sm:max-h-11 scale-[1.48]",
}

const SECTOR_BANNERS = [
  { id: "todos", label: "Todos", img: "/images/categorias/master/todos.png", icon: "🏪" },
  { id: "hortifruti", label: "Hortifrúti", img: "/images/categorias/master/hortifruti.png", icon: "🍎" },
  { id: "carnes", label: "Carnes", img: "/images/categorias/master/carnes.png", icon: "🥩" },
  { id: "padaria", label: "Padaria", img: "/images/categorias/master/padaria.png", icon: "🥖" },
  { id: "leites", label: "Frios e Laticínios", img: "/images/categorias/master/leites.png", icon: "🥛" },
  { id: "bebidas", label: "Bebidas", img: "/images/categorias/master/bebidas.png", icon: "🍺" },
  { id: "congelados", label: "Congelados", img: "/images/categorias/master/congelados.png", icon: "🧊" },
  { id: "graos", label: "Grãos e Arroz", img: "/images/categorias/master/graos.png", icon: "🌾" },
  { id: "cafe", label: "Café e Matinais", img: "/images/categorias/master/cafe.png", icon: "☕" },
  { id: "limpeza", label: "Limpeza", img: "/images/categorias/master/limpeza.png", icon: "🧹" },
  { id: "higiene", label: "Higiene", img: "/images/categorias/master/higiene.png", icon: "🧴" },
  { id: "oleos", label: "Óleos e Azeites", img: "/images/categorias/master/oleos.png", icon: "🫙" },
  { id: "biscoitos", label: "Biscoitos", img: "/images/categorias/master/biscoitos.png", icon: "🍪" },
  { id: "mercearia", label: "Mercearia", img: "/images/categorias/master/mercearia.png", icon: "🛒" },
  { id: "bazar", label: "Bazar", img: "/images/categorias/master/bazar.png", icon: "🍽️" },
]

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
  const valid = Object.entries(product.prices || {}).filter(([, v]) => v !== null && v !== undefined && Number(v) > 0)
  if (!valid.length) return null
  return valid.reduce((min, curr) => (Number(curr[1]) < Number(min[1]) ? curr : min))
}

function getProductPricingSummary(product) {
  const valid = Object.entries(product.prices || {})
    .filter(([, v]) => v !== null && v !== undefined && Number(v) > 0)
    .map(([mId, v]) => [mId, Number(v)])
  if (!valid.length) return null
  valid.sort((a, b) => a[1] - b[1])
  const [bestMarketId, bestPrice] = valid[0]
  const worstPrice = valid[valid.length - 1][1]
  const bestMarket = MARKETS.find((m) => m.id === bestMarketId)
  return {
    bestMarketId,
    bestMarketName: bestMarket?.name || bestMarketId,
    bestPrice,
    economia: Math.max(0, worstPrice - bestPrice),
    totalMarkets: valid.length,
  }
}

export default function FavoritesPage() {
  const [favProductIds, setFavProductIds] = useState(getFavProducts)
  const [favMarketIds, setFavMarketIds] = useState(getFavMarkets)
  const [priceAlerts, setPriceAlerts] = useState(getPriceAlerts)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("todos")
  const [activeTab, setActiveTab] = useState("produtos") // 'produtos' | 'mercados' | 'alertas'
  const [toastMessage, setToastMessage] = useState("")
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const sectorScrollRef = useRef(null)

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
    const fold = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    const tokens = fold(search).split(/\s+/).filter(Boolean)
    const haystack = `${fold(p.name)} ${fold(p.brand)} ${fold(p.descricao)}`
    const matchesSearch = tokens.length === 0 || tokens.every((tk) => haystack.includes(tk))
    const catP = (p.category || "").toLowerCase()
    const selCat = selectedCategory.toLowerCase()
    const matchesCategory =
      selectedCategory === "todos" || catP === selCat || catP.includes(selCat)
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
    <div className="flex flex-col min-h-screen bg-brand-bg text-brand-navy">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-navy text-white px-5 py-3 rounded-2xl shadow-xl border border-brand-green/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* TOPO COM LOGOS DAS REDES E BANNERS DOS SETORES */}
      <header className="bg-white border-b border-brand-border/80 sticky top-0 z-30 shadow-xs">
        <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-3.5 space-y-3">
          {/* Linha 1: Título, Busca e Ações */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-brand-navy tracking-tight">
                  Meus Favoritos
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                  {favProductIds.length} produtos · {favMarketIds.length} mercados
                </span>
              </div>
              <p className="text-xs text-brand-muted mt-0.5">
                Monitore seus produtos essenciais e redes favoritas para economizar na cesta mensal.
              </p>
            </div>

            <div className="relative flex-1 max-w-lg">
              <Input
                isSearch
                placeholder="Buscar em seus favoritos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                className="h-10 text-xs bg-brand-bg"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link to="/catalog">
                <Button variant="outline" size="sm" leftIcon={<span>🏪</span>}>
                  Explorar Catálogo
                </Button>
              </Link>
              <Link to="/list">
                <Button variant="primary" size="sm" leftIcon={<span>🛒</span>}>
                  Minha Lista
                </Button>
              </Link>
            </div>
          </div>

          {/* Linha 2: Fita de Mercados com Logos Reais */}
          <div className="bg-white rounded-2xl border border-brand-border/70 p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 shadow-xs overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 shrink-0 px-2.5 sm:px-3.5 py-1.5 border-r border-brand-border/60">
              <span className="text-amber-500 text-base">⭐</span>
              <span className="text-xs sm:text-sm font-extrabold text-brand-navy whitespace-nowrap tracking-tight">
                Redes do RS:
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap flex-1 min-w-0">
              {MARKETS.map((m) => {
                const isFav = favMarketIds.includes(m.id)
                const logoSrc = MARKET_LOGOS[m.id]
                const opticalClass = MARKET_LOGO_OPTICAL_CLASS[m.id] || "max-h-9 sm:max-h-10"
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleFavMarket(m.id)}
                    className={`group flex items-center justify-between gap-2 h-13 sm:h-14 px-3 sm:px-3.5 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer select-none flex-1 min-w-[118px] sm:min-w-[130px] ${
                      isFav
                        ? "bg-amber-50/90 border-amber-300 ring-2 ring-amber-300/40 shadow-xs"
                        : "bg-white border-brand-border/80 hover:bg-slate-50 hover:border-brand-green/50 shadow-2xs"
                    }`}
                    title={isFav ? `${m.name} (Favorito — Clique para desfavoritar)` : `Favoritar ${m.name}`}
                    aria-label={isFav ? `Remover ${m.name} dos favoritos` : `Favoritar ${m.name}`}
                  >
                    <div className="h-9 sm:h-10 flex-1 min-w-0 flex items-center justify-center overflow-hidden px-1">
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={m.name}
                          className={`w-full object-contain transition-transform duration-200 group-hover:scale-105 ${opticalClass}`}
                        />
                      ) : (
                        <span className="text-xs sm:text-sm font-bold text-brand-navy truncate">
                          {m.name}
                        </span>
                      )}
                    </div>
                    <span className={`shrink-0 text-sm transition-transform duration-200 ${isFav ? "text-amber-500 scale-110" : "text-slate-300 group-hover:scale-110"}`}>
                      ★
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Linha 3: Banners Visuais dos Setores abaixo das logos */}
          <div className="relative bg-white rounded-2xl border border-brand-border/70 p-2 sm:p-2.5 shadow-xs">
            <div
              ref={sectorScrollRef}
              className="flex items-start justify-between gap-4 sm:gap-6 md:gap-7 overflow-x-auto no-scrollbar scroll-smooth py-1.5 px-3"
            >
              {SECTOR_BANNERS.map((cat) => {
                const isActive = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id)
                      setActiveTab("produtos")
                    }}
                    className="group flex flex-col items-center shrink-0 cursor-pointer select-none transition-all duration-200 outline-none"
                    title={`Filtrar favoritos em ${cat.label}`}
                  >
                    <div
                      className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                        isActive
                          ? "ring-3 ring-[#065417] ring-offset-2 scale-105 bg-emerald-50/70 shadow-sm"
                          : "group-hover:scale-105"
                      }`}
                    >
                      <img
                        src={cat.img}
                        alt={cat.label}
                        loading="lazy"
                        style={{ clipPath: "inset(0 0 8% 0)" }}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-108 pointer-events-none"
                      />
                    </div>
                    <span
                      className={`mt-1.5 text-xs sm:text-[13px] font-extrabold text-center tracking-tight transition-colors line-clamp-1 ${
                        isActive
                          ? "text-[#065417] underline decoration-2 underline-offset-4"
                          : "text-[#065417]/90 group-hover:text-[#065417]"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 space-y-6">
        {/* Banner de Inteligência de Preços (Insight) */}
        {bestMarket && favProductsList.length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-brand-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/70 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("produtos")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "produtos"
                  ? "bg-brand-green text-white shadow-xs"
                  : "text-brand-muted hover:text-brand-navy hover:bg-slate-100"
              }`}
            >
              <span>❤️</span>
              <span>Produtos Favoritos</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === "produtos" ? "bg-white/20 text-white" : "bg-slate-200 text-brand-navy"}`}>
                {filteredProducts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("mercados")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
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

          {selectedCategory !== "todos" && (
            <button
              type="button"
              onClick={() => setSelectedCategory("todos")}
              className="text-xs font-bold text-brand-green hover:underline px-3 py-1.5 rounded-xl bg-brand-green-light/70 cursor-pointer"
            >
              &larr; Mostrar todos os setores
            </button>
          )}
        </div>

        {/* ABA 1: PRODUTOS FAVORITOS */}
        {activeTab === "produtos" && (
          <section aria-label="Produtos Favoritos">
            {/* Grid de Produtos ou Empty State */}
            {filteredProducts.length === 0 ? (
              <Card className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-3xl mb-4">
                  💔
                </div>
                <h2 className="text-xl font-bold text-brand-navy mb-1">
                  {search || selectedCategory !== "todos"
                    ? "Nenhum produto favorito encontrado neste filtro"
                    : "Você ainda não favoritou nenhum produto"}
                </h2>
                <p className="text-xs text-brand-muted max-w-md mx-auto mb-6">
                  {search || selectedCategory !== "todos"
                    ? "Tente buscar por outro termo ou selecione o setor 'Todos' acima."
                    : "Navegue pelo catálogo e clique no coração dos itens que você compra com frequência para acompanhar as variações de preço."}
                </p>
                <div className="flex items-center gap-2">
                  {(search || selectedCategory !== "todos") && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch("")
                        setSelectedCategory("todos")
                      }}
                    >
                      Ver Todos os Favoritos
                    </Button>
                  )}
                  <Link to="/catalog">
                    <Button variant="primary">Ir para o Catálogo</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((p) => {
                  const pricing = getProductPricingSummary(p)
                  const hasAlert = Boolean(priceAlerts[p.id])

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProductDetail(p)}
                      className="group relative bg-white rounded-3xl border border-brand-border/80 p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:border-brand-green/60 hover:-translate-y-0.5 cursor-pointer select-none w-full"
                    >
                      <div>
                        {/* Botão de Desfavoritar */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavProduct(p.id)
                          }}
                          className="absolute top-6 right-6 z-10 w-8 h-8 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs hover:scale-110 transition-transform"
                          title="Remover dos favoritos"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {/* Imagem com Preview 360° e Badges */}
                        <div className="relative w-full h-48 bg-slate-50/70 rounded-2xl overflow-hidden mb-3.5 border border-slate-100 flex items-center justify-center p-3 group-hover:bg-emerald-50/30 transition-colors">
                          <Product360HoverPreview
                            product={p}
                            alt={p.name}
                            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                            fallbackIcon={p.image || "🛒"}
                          />

                          {p.promo && (
                            <span className="absolute top-2.5 left-2.5 bg-brand-coral text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider pointer-events-none">
                              Oferta
                            </span>
                          )}

                          <span className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-xs text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 pointer-events-none">
                            {p.unit || "1 un"}
                          </span>
                        </div>

                        {/* Categoria e Marca */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-bold text-brand-green bg-brand-green-light px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {p.category}
                          </span>
                          <span className="text-xs text-brand-muted font-medium truncate">
                            {p.brand || "Geral"}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-brand-navy mt-2 line-clamp-2 leading-snug group-hover:text-brand-green transition-colors">
                          {p.name}
                        </h3>

                        <p className="line-clamp-2 text-[11px] text-brand-muted mt-1 min-h-[1.75rem]">
                          {p.descricao || p.name}
                        </p>
                      </div>

                      {/* Comparativo de Preços e Ações */}
                      <div className="space-y-2.5 pt-3 mt-2">
                        {pricing ? (
                          <>
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-green-light/60 border border-brand-green/20 text-xs">
                              <div className="min-w-0">
                                <span className="block text-[10px] font-semibold text-emerald-800 truncate">
                                  Melhor Preço ({pricing.bestMarketName})
                                </span>
                                <span className="text-lg font-black text-brand-green">
                                  R$ {pricing.bestPrice.toFixed(2)}
                                </span>
                              </div>
                              {pricing.economia > 0 && (
                                <span className="text-[10px] font-black text-white bg-brand-green px-2 py-1 rounded-lg shadow-xs shrink-0">
                                  -R$ {pricing.economia.toFixed(2)}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-brand-muted flex items-center justify-between px-1">
                              <span>Comparado em {pricing.totalMarkets} mercados</span>
                              <span className="text-brand-navy font-bold group-hover:underline">
                                Ver comparativo &rarr;
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="p-3 text-center text-xs text-brand-muted bg-slate-50 rounded-2xl">
                            Indisponível
                          </div>
                        )}

                        {hasAlert && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-[11px] text-amber-900"
                          >
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

                        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => addToList(p.id)}
                            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-brand-green text-white hover:bg-brand-green-hover transition-all shadow-xs cursor-pointer"
                          >
                            + Adicionar à Minha Lista
                          </button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-3 rounded-xl"
                            title="Definir alerta de preço"
                            onClick={() => openAlertModal(p)}
                          >
                            🔔
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

      {/* ABA 2: MERCADOS FAVORITOS */}
      {activeTab === "mercados" && (
        <section aria-label="Mercados Favoritos">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MARKETS.map((m) => {
              const isFav = favMarketIds.includes(m.id)
              const countCheapest = marketScores[m.id] || 0
              const logoSrc = MARKET_LOGOS[m.id]
              const opticalClass = MARKET_LOGO_OPTICAL_CLASS[m.id] || "max-h-10"

              return (
                <Card key={m.id} variant="elevated" className="p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-24 h-12 rounded-2xl bg-white border border-brand-border/80 flex items-center justify-center px-2 overflow-hidden shadow-2xs shrink-0">
                          {logoSrc ? (
                            <img src={logoSrc} alt={m.name} className={`w-full object-contain ${opticalClass}`} />
                          ) : (
                            <span className="font-bold text-sm text-brand-navy">{m.name}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-brand-navy truncate">{m.name}</h3>
                          <span className="text-xs text-brand-muted">Porto Alegre e Região</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavMarket(m.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
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
      </main>

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

      {/* Modal de Detalhes e Fotos HD do Produto Favorito */}
      <ProductDetailModal
        product={selectedProductDetail}
        allProducts={PRODUCTS}
        onSelectProduct={setSelectedProductDetail}
        markets={MARKETS}
        isOpen={Boolean(selectedProductDetail)}
        onClose={() => setSelectedProductDetail(null)}
        onAddToList={(prod) => addToList(prod.id)}
        isFavorite={selectedProductDetail ? favProductIds.includes(selectedProductDetail.id) : false}
        onToggleFavorite={toggleFavProduct}
      />
    </div>
  )
}
