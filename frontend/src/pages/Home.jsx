import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Navbar,
  SearchSuggest,
  ProductDetailModal,
  Product360HoverPreview,
  SmartMarketLogo,
} from "../components/ui"
import { PRODUCTS, MARKETS, CATEGORIES } from "../data"
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

const RAIL_GAP = 14
const RAIL_SPEED = 42

function CarrosselRedes({ selectedMarket, onSelect }) {
  const n = MARKETS.length
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const meterRef = useRef(null)
  const offsetRef = useRef(n)
  const logicalRef = useRef(0)
  const centerRef = useRef(n)
  const fromPointer = useRef(false)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [logical, setLogical] = useState(0)
  const [centerIndex, setCenterIndex] = useState(n)
  const [pointerInside, setPointerInside] = useState(false)
  const [focusInside, setFocusInside] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined
    const measure = () => setViewportWidth(el.clientWidth)
    measure()
    if (typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const applyMedia = () => setReduced(media?.matches ?? false)
    applyMedia()
    media?.addEventListener?.("change", applyMedia)
    const onHide = () => setHidden(document.hidden)
    document.addEventListener("visibilitychange", onHide)
    return () => {
      media?.removeEventListener?.("change", applyMedia)
      document.removeEventListener("visibilitychange", onHide)
    }
  }, [])

  const paused = pointerInside || focusInside || reduced || hidden || selectedMarket !== "todos"
  const cardWidth = viewportWidth < 640
    ? Math.min(Math.max(viewportWidth * 0.78, 210), 280)
    : viewportWidth < 1024
      ? 250
      : Math.min(320, Math.max(280, viewportWidth * 0.29))
  const step = cardWidth + RAIL_GAP
  const slides = [...MARKETS, ...MARKETS, ...MARKETS]

  function place(offset) {
    let next = offset
    while (next >= n * 2) next -= n
    while (next < n) next += n
    offsetRef.current = next
    const width = viewportRef.current?.clientWidth || viewportWidth
    const translate = width > 0 ? width / 2 - cardWidth / 2 - next * step : 0
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${translate}px, 0, 0)`
    if (meterRef.current) meterRef.current.style.transform = `scaleX(${next - Math.floor(next)})`
    const center = Math.min(n * 3 - 1, Math.max(0, Math.round(next)))
    const nextLogical = ((center % n) + n) % n
    if (centerRef.current !== center) {
      centerRef.current = center
      setCenterIndex(center)
    }
    if (logicalRef.current !== nextLogical) {
      logicalRef.current = nextLogical
      setLogical(nextLogical)
    }
  }

  useLayoutEffect(() => {
    place(offsetRef.current)
  })

  useEffect(() => {
    if (paused || viewportWidth <= 0) return undefined
    let frame = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      place(offsetRef.current + (RAIL_SPEED / step) * dt)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [paused, viewportWidth, step, cardWidth, n])

  function stepBy(direction) {
    place(offsetRef.current + direction)
  }

  function goTo(target) {
    const current = logicalRef.current
    if (target === current) return
    const delta = target > current ? target - current : target + n - current
    place(offsetRef.current + delta)
  }

  return (
    <div
      className={`sm-rail ${paused ? "is-paused" : ""}`}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Redes do catálogo"
      onMouseEnter={() => setPointerInside(true)}
      onMouseLeave={() => setPointerInside(false)}
      onPointerDown={() => {
        fromPointer.current = true
      }}
      onFocus={(event) => {
        if (fromPointer.current) {
          fromPointer.current = false
          return
        }
        if (event.target instanceof Element && event.target.matches(":focus-visible")) setFocusInside(true)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusInside(false)
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault()
          stepBy(1)
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          stepBy(-1)
        }
      }}
    >
      <div className="sm-rail-stage">
        <button type="button" className="sm-rail-nav is-prev" aria-label="Rede anterior" onClick={() => stepBy(-1)}>
          <span aria-hidden="true">←</span>
        </button>

        <div
          className="sm-rail-window min-w-0"
          ref={viewportRef}
          style={{ opacity: viewportWidth > 0 ? 1 : 0 }}
        >
          <div
            ref={trackRef}
            className="sm-rail-track"
            style={{ gap: RAIL_GAP }}
          >
            {slides.map((market, slideIndex) => {
              const isSelected = selectedMarket === market.id
              const clone = Math.floor(slideIndex / n) !== 1
              return (
                <button
                  key={`${market.id}-${slideIndex}`}
                  type="button"
                  aria-hidden={clone}
                  tabIndex={clone ? -1 : 0}
                  aria-label={market.name}
                  aria-pressed={isSelected}
                  onClick={() => {
                    place(slideIndex)
                    onSelect(market.id)
                  }}
                  className={`sm-rail-card market-card ${slideIndex === centerIndex ? "is-center" : ""} ${
                    isSelected ? "is-selected" : ""
                  }`}
                  style={{ width: cardWidth || 240, "--market": market.color || "#22A95E" }}
                >
                  <span className="sm-rail-logo">
                    {MARKET_LOGOS[market.id] ? (
                      <img src={MARKET_LOGOS[market.id]} alt="" />
                    ) : (
                      <span className="sm-rail-sigla" style={{ backgroundColor: market.color || "#0D2137" }}>
                        {market.sigla || market.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <button type="button" className="sm-rail-nav is-next" aria-label="Próxima rede" onClick={() => stepBy(1)}>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 px-1">
        <p className="font-display text-sm font-extrabold tabular-nums text-brand-navy" aria-hidden="true">
          {String(logical + 1).padStart(2, "0")}
          <span className="font-semibold text-brand-muted"> / {String(n).padStart(2, "0")}</span>
        </p>
        <div className="sm-rail-meter" aria-hidden="true">
          <span ref={meterRef} />
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Escolher rede">
          {MARKETS.map((market, dotIndex) => (
            <button
              key={market.id}
              type="button"
              aria-label={market.name}
              aria-current={dotIndex === logical ? "true" : undefined}
              onClick={() => goTo(dotIndex)}
              className={`sm-rail-pip ${dotIndex === logical ? "is-on" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function contarItensDaLista(lista) {
  return Object.values(lista).reduce((acc, qty) => acc + Number(qty || 0), 0)
}

function lerLista() {
  try {
    const stored = JSON.parse(sessionStorage.getItem("sm_list") || "{}")
    return stored && typeof stored === "object" ? stored : {}
  } catch {
    return {}
  }
}

function adicionarNaLista(produtoId) {
  const lista = lerLista()
  lista[produtoId] = (Number(lista[produtoId]) || 0) + 1
  sessionStorage.setItem("sm_list", JSON.stringify(lista))
  return contarItensDaLista(lista)
}

function caminhoDoCadastro(intent, termo) {
  const params = new URLSearchParams({ mode: "register", intent })
  const texto = String(termo || "").trim()
  if (texto) params.set("q", texto)
  return `/auth?${params.toString()}`
}

export function Home() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [termoConvite, setTermoConvite] = useState("")
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("todos")
  const [selectedMarket, setSelectedMarket] = useState("todos")
  const [cartItemsCount, setCartItemsCount] = useState(() => contarItensDaLista(lerLista()))
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const [alertTargetPrice, setAlertTargetPrice] = useState("")
  const [toastMessage, setToastMessage] = useState(null)
  const [visibleHomeLimit, setVisibleHomeLimit] = useState(32)

  // Mostra um feedback sutil quando o usuário adiciona um item à lista
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 2800)
  }

  // Obtém melhor preço e economia de um produto entre todos os mercados do RS
  const getProductInsights = (produto) => {
    const prices = produto.prices || {}
    const validEntries = Object.entries(prices).filter(([, val]) => typeof val === "number" && val > 0)
    if (validEntries.length === 0) return null

    const sorted = [...validEntries].sort((a, b) => a[1] - b[1])
    const [bestMarketKey, bestPrice] = sorted[0]
    const highestPrice = sorted[sorted.length - 1][1]
    const economia = highestPrice - bestPrice
    const marketObj = MARKETS.find((m) => m.id === bestMarketKey)

    const isClube = Boolean(
      produto.clubPrices?.[bestMarketKey] ||
      (produto.isClube && (produto.mercadoMenorPreco === bestMarketKey || produto.supermercadoOrigem?.toLowerCase().includes(marketObj?.name?.toLowerCase().split(" ")[0]))) ||
      (bestMarketKey === "stok" && produto.promo && produto.supermercadoOrigem === "Stok Center")
    )
    const clubeNome = produto.clubPrices?.[bestMarketKey] || marketObj?.clube || "Preço Clube"

    return {
      bestMarketKey,
      bestMarketName: marketObj?.name || bestMarketKey,
      bestPrice,
      highestPrice,
      economia,
      totalMarkets: validEntries.length,
      isClube,
      clubeNome,
    }
  }

  // Filtra produtos reais do catálogo com suporte a pesquisa, categoria e rede parceira
  const filteredProducts = useMemo(() => {
    const fold = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    const queryFolded = fold(searchTerm).trim()
    const tokens = queryFolded
      .split(/\s+/)
      .filter((tk) => tk.length > 1 && tk !== "de" && tk !== "em" && tk !== "do" && tk !== "da" && tk !== "com" && tk !== "para")

    return PRODUCTS.filter((p) => {
      const nameAndBrand = `${fold(p.name)} ${fold(p.brand)} ${fold(p.category)}`
      let matchesSearch = true
      if (queryFolded) {
        if (nameAndBrand.includes(queryFolded)) {
          matchesSearch = true
        } else {
          const words = nameAndBrand.split(/[^a-z0-9]+/).filter(Boolean)
          matchesSearch =
            tokens.length > 0 &&
            tokens.every((tk) =>
              tk.length <= 3 ? words.includes(tk) : words.some((w) => w.includes(tk))
            )
        }
      }

      const matchesCategory =
        selectedCategory === "todos" || p.category === selectedCategory

      const insights = getProductInsights(p)
      const matchesMarket =
        selectedMarket === "todos" ||
        (insights && insights.bestMarketKey === selectedMarket) ||
        (p.prices && p.prices[selectedMarket] > 0)

      return matchesSearch && matchesCategory && matchesMarket
    })
  }, [searchTerm, selectedCategory, selectedMarket])

  const heroVideoRef = useRef(null)

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return undefined
    if (typeof window === "undefined" || !window.matchMedia) return undefined
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => {
      if (media?.matches) {
        video.pause()
      } else {
        video.play?.().catch(() => {})
      }
    }
    apply()
    media?.addEventListener?.("change", apply)
    return () => media?.removeEventListener?.("change", apply)
  }, [])

  // Sugestões de busca rápida
  const quickSearchTags = ["Café Melitta", "Arroz", "Azeite", "Leite", "Cerveja"]

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col text-brand-navy selection:bg-brand-green/20 selection:text-brand-navy">
      {/* Toast flutuante de feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-navy text-white text-xs font-semibold shadow-2xl border border-brand-green/40 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-brand-green animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. NAVBAR OFICIAL INTEGRADA */}
      <Navbar
        modo={isAuthenticated ? "app" : "apresentacao"}
        cartCount={cartItemsCount}
        products={isAuthenticated ? PRODUCTS : undefined}
        onAddProduct={(produto) => {
          setCartItemsCount(adicionarNaLista(produto.id))
          showToast(`"${produto.name}" adicionado à lista!`)
        }}
        onSearch={(query) => {
          setSearchTerm(query)
          document.getElementById("catalogo-ofertas")?.scrollIntoView({ behavior: "smooth" })
        }}
      />

      {/* 2. PRIMEIRA DOBRA — blocos chapados no espírito do Desco, cores do SmartMarket */}
      <section className="relative bg-white" aria-label="Compare sua lista de compras">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:min-h-[calc(100svh-5rem)]">
          <div className="sm-hero-copy relative lg:col-span-5 xl:col-span-5 text-white flex flex-col justify-center px-6 sm:px-10 lg:px-10 xl:px-16 py-10 sm:py-12">
            <p className="sm-rise text-[11px] font-bold uppercase tracking-[0.22em] text-[#7dffe0]">
              Comparação de preços
            </p>
            <h1 className="sm-hero-title sm-rise sm-rise-2 mt-4">
              <span className="block">Sua lista.</span>
              <span className="block text-[#7dffe0]">O menor</span>
              <span className="block">preço.</span>
            </h1>
            <p className="sm-rise sm-rise-3 mt-6 max-w-md text-sm sm:text-base leading-relaxed text-white/75">
              Monte a lista e veja, com os preços do catálogo, em qual mercado do Rio Grande do Sul a compra sai mais barata.
            </p>

            <div className="sm-rise sm-rise-4 relative z-30 mt-8 max-w-3xl">
              {isAuthenticated ? (
                <SearchSuggest
                  id="busca-home"
                  variant="hero"
                  value={searchTerm}
                  onChange={setSearchTerm}
                  onSubmit={() => {
                    document.getElementById("catalogo-ofertas")?.scrollIntoView({ behavior: "smooth" })
                  }}
                  onAdd={(produto) => {
                    setCartItemsCount(adicionarNaLista(produto.id))
                    showToast(`"${produto.name}" adicionado à lista!`)
                  }}
                  products={PRODUCTS}
                  placeholder="Arroz, leite, café…"
                />
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    navigate(caminhoDoCadastro("busca", termoConvite))
                  }}
                >
                  <label htmlFor="busca-home" className="sr-only">Buscar no catálogo</label>
                  <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.65)]">
                    <input
                      id="busca-home"
                      name="q"
                      type="text"
                      autoComplete="off"
                      value={termoConvite}
                      onChange={(event) => setTermoConvite(event.target.value)}
                      placeholder="Arroz, leite, café…"
                      className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-medium text-brand-navy placeholder:text-brand-muted focus:outline-none"
                    />
                    <button type="submit" className="sm-cta shrink-0">
                      Criar conta e buscar
                    </button>
                  </div>
                </form>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-white/45">
                  {isAuthenticated ? "Atalhos" : "A busca abre com a sua conta"}
                </span>
                {quickSearchTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate(caminhoDoCadastro("busca", tag))
                        return
                      }
                      setSearchTerm(tag)
                      document.getElementById("catalogo-ofertas")?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition-colors duration-200 hover:border-[#7dffe0] hover:text-[#7dffe0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7dffe0]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm-rise sm-rise-5 mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={isAuthenticated ? "/list" : caminhoDoCadastro("lista")}
                className="sm-cta sm-cta-light"
              >
                Montar a lista
                <span aria-hidden="true" className="sm-cta-arrow">→</span>
              </Link>
              <Link
                to={isAuthenticated ? "/catalog" : caminhoDoCadastro("catalogo")}
                className="sm-cta sm-cta-ghost"
              >
                Ver o catálogo
              </Link>
            </div>

            <dl className="sm-rise sm-rise-5 mt-6 grid grid-cols-2 gap-6 max-w-sm border-t border-white/15 pt-4">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-white/45">Redes no catálogo</dt>
                <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums text-white">{MARKETS.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-white/45">Produtos com preço</dt>
                <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums text-white">{PRODUCTS.length}</dd>
              </div>
            </dl>
          </div>

          <div className="sm-hero-panel lg:col-span-7 xl:col-span-7 relative min-h-[24rem] overflow-hidden sm:min-h-[30rem] lg:min-h-0">
            <video
              ref={heroVideoRef}
              className="sm-hero-video"
              src="/video/hero.mp4"
              poster="/video/hero-poster.jpg"
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              aria-label="No caixa, o cupom assusta. Em seguida, a lista é comparada no SmartMarket."
            />
          </div>
        </div>
      </section>

      {/* 3. SHOWCASE DAS 8 REDES DO RIO GRANDE DO SUL (INSPIRADO NO DESCO & ATACAREJOS) */}
      <section id="redes" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-brand-border pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-green uppercase tracking-wider mb-1">
              <span>●</span> Redes Conectadas
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-brand-navy">
              Redes de Supermercados & Atacarejos do RS
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted mt-0.5">
              A faixa passa pelas redes do catálogo. Clique em uma para filtrar os produtos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedMarket !== "todos" && (
              <button
                type="button"
                onClick={() => setSelectedMarket("todos")}
                className="text-xs font-bold text-brand-green hover:underline cursor-pointer"
              >
                Limpar Filtro ({MARKETS.find((m) => m.id === selectedMarket)?.name})
              </button>
            )}
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-green-light text-brand-green border border-brand-green/20">
              8 Redes Ativas
            </span>
          </div>
        </div>

        <CarrosselRedes
          selectedMarket={selectedMarket}
          onSelect={(id) => {
            setSelectedMarket((current) => (current === id ? "todos" : id))
            document.getElementById("catalogo-ofertas")?.scrollIntoView({ behavior: "smooth" })
          }}
        />
      </section>

      {/* 4. COMO FUNCIONA — faixas sólidas, lettering curto */}
      <section id="como-funciona" className="scroll-mt-24 bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl text-balance">
              Três passos.
              <span className="block text-brand-green">Uma lista mais barata.</span>
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-brand-muted">
              Sem abrir um aplicativo por rede. A comparação usa os preços que já estão no catálogo.
            </p>
          </div>
          <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <li className="rounded-3xl bg-brand-bg p-6">
              <span className="font-display text-5xl font-extrabold text-brand-green">01</span>
              <h3 className="mt-6 text-lg font-extrabold text-brand-navy">Monte a lista</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">Escolha os produtos do dia a dia e guarde a lista para a próxima compra.</p>
            </li>
            <li className="rounded-3xl bg-brand-navy p-6 text-white">
              <span className="font-display text-5xl font-extrabold text-[#7dffe0]">02</span>
              <h3 className="mt-6 text-lg font-extrabold">Cruze os preços</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">O comparador olha o preço de cada item nas redes presentes no catálogo.</p>
            </li>
            <li className="rounded-3xl bg-brand-green p-6 text-white">
              <span className="font-display text-5xl font-extrabold text-white">03</span>
              <h3 className="mt-6 text-lg font-extrabold">Escolha o mercado</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/85">Veja onde a cesta fecha mais barata antes de sair de casa.</p>
            </li>
          </ol>
          <div className="mt-8">
            <Link to="/list" className="sm-cta">
              Começar pela lista
              <span aria-hidden="true" className="sm-cta-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. SHOWCASE DO CATÁLOGO DE PRODUTOS & COMPARADOR AO VIVO */}
      <main id="catalogo-ofertas" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 space-y-8 w-full">
        {/* Cabeçalho do Catálogo com Filtros */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-brand-navy">
                  Ofertas & Comparativo em Destaque
                </h2>
                <span className="text-xs font-bold text-brand-muted">
                  ({filteredProducts.length} itens encontrados)
                </span>
              </div>
              <p className="text-xs text-brand-muted mt-0.5">
                Passe o mouse para inspecionar em 360°. Clique em qualquer produto para abrir o comparativo entre todas as 8 redes.
              </p>
            </div>

            {/* Botão de Alerta de Preço */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAlertModalOpen(true)}
                className="text-xs font-bold border-brand-border gap-1.5"
              >
                <svg className="w-4 h-4 text-brand-amber" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                Criar Alerta de Preço
              </Button>
            </div>
          </div>

          {/* Banners Visuais dos Setores (Modelo Master Supermercados) */}
          <div className="bg-white rounded-2xl border border-brand-border/80 p-3 sm:p-4 shadow-2xs">
            <div className="flex items-start justify-between gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth py-1 px-2">
              {SECTOR_BANNERS.map((cat) => {
                const isActive = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="group flex flex-col items-center shrink-0 cursor-pointer select-none transition-all duration-200 outline-none"
                    title={`Ver ${cat.label}`}
                  >
                    <div
                      className={`relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-2xl transition-all duration-300 ${
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

        {/* Grade de Produtos */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-brand-border p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-green-light flex items-center justify-center text-3xl mx-auto">
              🔍
            </div>
            <h3 className="text-lg font-bold text-brand-navy">
              Nenhum produto encontrado com os filtros atuais
            </h3>
            <p className="text-xs text-brand-muted max-w-md mx-auto">
              Tente buscar por termos mais genéricos como "arroz", "leite" ou redefinir a categoria e rede selecionada.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setSelectedCategory("todos")
                setSelectedMarket("todos")
              }}
            >
              Limpar todos os filtros
            </Button>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.slice(0, visibleHomeLimit).map((produto) => {
              const insights = getProductInsights(produto)

              return (
                <Card
                  key={produto.id}
                  variant="interactive"
                  className="flex flex-col justify-between group overflow-hidden cursor-pointer border-brand-border/80 hover:border-brand-green/60 hover:shadow-lg transition-all"
                  onClick={() => setSelectedProductDetail(produto)}
                >
                  <CardHeader className="pb-2">
                    {/* Visual 360 / Foto com Preview e Badges */}
                    <div className="relative w-full h-48 bg-slate-50 rounded-2xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center group-hover:bg-emerald-50/30 transition-colors">
                      <Product360HoverPreview
                        product={produto}
                        alt={produto.name}
                        className="w-full h-full object-contain p-3 transition-transform group-hover:scale-105"
                      />

                      {produto.promo && (
                        <span className="absolute top-2.5 left-2.5 bg-brand-coral text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider pointer-events-none">
                          Oferta
                        </span>
                      )}

                      <span className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-xs text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 pointer-events-none">
                        {produto.unit || "Unidade"}
                      </span>
                    </div>

                    {/* Metadados da Marca e Categoria */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold text-brand-green bg-brand-green-light px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {produto.category}
                      </span>
                      <span className="text-xs text-brand-muted font-medium">
                        {produto.brand}
                      </span>
                    </div>

                    <CardTitle className="text-sm font-bold text-brand-navy mt-2 line-clamp-2 leading-snug group-hover:text-brand-green transition-colors">
                      {produto.name}
                    </CardTitle>

                    {produto.descricao && (
                      <CardDescription className="line-clamp-2 text-[11px] text-brand-muted mt-1">
                        {produto.descricao}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-2 py-2">
                    {insights ? (
                      <>
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-green-light/60 border border-brand-green/20 text-xs">
                          <div>
                            <span className="block text-[10px] font-semibold text-emerald-800">
                              Melhor Preço ({insights.bestMarketName})
                              {insights.isClube && (
                                <span className="ml-1 text-[9px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded">
                                  🏷️ {insights.clubeNome}
                                </span>
                              )}
                            </span>
                            <span className="text-lg font-black text-brand-green">
                              R$ {insights.bestPrice.toFixed(2)}
                            </span>
                          </div>
                          {insights.economia > 0 && (
                            <span className="text-[10px] font-black text-white bg-brand-green px-2 py-1 rounded-lg shadow-xs">
                              -R$ {insights.economia.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-brand-muted flex items-center justify-between px-1">
                          <span>Comparado em {insights.totalMarkets} mercados</span>
                          <span className="text-brand-navy font-bold hover:underline">
                            Ver comparativo &rarr;
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 text-center text-xs text-brand-muted bg-slate-50 rounded-2xl">
                        Consultando preços ao vivo...
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full text-xs font-bold py-2 justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCartItemsCount(adicionarNaLista(produto.id))
                        showToast(`"${produto.name}" adicionado à lista!`)
                      }}
                    >
                      + Adicionar à Minha Lista
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
          {filteredProducts.length > visibleHomeLimit && (
            <div className="flex flex-col items-center justify-center pt-6 gap-2">
              <span className="text-xs font-semibold text-brand-muted">
                Exibindo {visibleHomeLimit} de {filteredProducts.length} produtos encontrados
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleHomeLimit((prev) => prev + 32)}
              >
                Carregar mais produtos (+32)
              </Button>
            </div>
          )}
          </>
        )}
      </main>

      {/* 6. FAIXA FINAL — dois blocos de cor, como o banner do Desco */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] lg:grid-cols-12">
          <div className="bg-brand-navy px-8 py-12 text-white sm:px-12 lg:col-span-7">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
              A próxima compra
              <span className="block text-[#7dffe0]">pode custar menos.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
              Abra a lista ou entre no catálogo. Os preços continuam os do SmartMarket, sem estimativa inventada.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 bg-brand-green px-8 py-12 lg:col-span-5">
            <Link to="/list" className="sm-cta sm-cta-light justify-center">
              Abrir minha lista
            </Link>
            <Link to="/catalog" className="sm-cta sm-cta-ghost justify-center border-white/40 text-white hover:bg-white hover:text-brand-navy">
              Ver o catálogo
            </Link>
          </div>
        </div>
      </section>

      {/* 7. MODAL DE DETALHES COMPLETOS DO PRODUTO (PRESERVADO) */}
      <ProductDetailModal
        product={selectedProductDetail}
        allProducts={PRODUCTS}
        onSelectProduct={setSelectedProductDetail}
        isOpen={Boolean(selectedProductDetail)}
        onClose={() => setSelectedProductDetail(null)}
        markets={MARKETS}
        onAddToList={(prod) => {
          if (prod?.id != null) setCartItemsCount(adicionarNaLista(prod.id))
          showToast(`"${prod?.name || 'Produto'}" adicionado à lista!`)
        }}
      />

      {/* 8. MODAL DE ALERTA DE PREÇO (PRESERVADO) */}
      <Modal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        size="md"
      >
        <ModalHeader>
          <ModalTitle>Criar Alerta de Preço</ModalTitle>
          <ModalDescription>
            Receba notificações quando o produto atingir o valor desejado em qualquer uma das 8 redes do RS.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div className="p-4 rounded-2xl bg-brand-green-light border border-brand-green/20">
            <h4 className="text-sm font-bold text-brand-green">Dica de Economia do SmartMarket</h4>
            <p className="text-xs text-brand-navy mt-1 leading-relaxed">
              O robô de inteligência de preços verifica os encartes e canais de atacado diariamente. Você será alertado assim que o valor baixar.
            </p>
          </div>

          <div className="space-y-2">
            <Input
              label="Preço Alvo Desejado (R$)"
              placeholder="Ex: 22.90"
              value={alertTargetPrice}
              onChange={(e) => setAlertTargetPrice(e.target.value)}
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setIsAlertModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setIsAlertModalOpen(false)
              showToast("Alerta de preço configurado com sucesso!")
            }}
          >
            Salvar Alerta
          </Button>
        </ModalFooter>
      </Modal>

      {/* 9. FOOTER INSTITUCIONAL COMPLETO */}
      <footer className="bg-white border-t border-brand-border py-12 px-4 sm:px-6 lg:px-8 text-xs text-brand-muted">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          {/* Coluna 1: Marca & Propósito */}
          <div className="space-y-3 md:col-span-1">
            <SmartMarketLogo size="lg" />
            <p className="text-xs text-brand-muted leading-relaxed pt-2">
              Plataforma independente de inteligência e comparação de preços de supermercados e atacarejos no Rio Grande do Sul.
            </p>
          </div>

          {/* Coluna 2: Navegação */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-brand-navy uppercase tracking-wider">
              Navegação
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link to="/catalog" className="hover:text-brand-green transition-colors">
                  Catálogo de Produtos
                </Link>
              </li>
              <li>
                <Link to="/list" className="hover:text-brand-green transition-colors">
                  Minha Lista de Compras
                </Link>
              </li>
              <li>
                <Link to="/compare" className="hover:text-brand-green transition-colors">
                  Comparador Inteligente
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-brand-green transition-colors">
                  Meus Favoritos
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Redes Integradas */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-brand-navy uppercase tracking-wider">
              Redes no RS
            </h4>
            <p className="text-xs text-brand-muted">
              Fort Atacadista • Stok Center • Asun Supermercados • Zaffari / Bourbon • Rissul • Atacadão • Master • Carrefour.
            </p>
          </div>

          {/* Coluna 4: Institucional */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-brand-navy uppercase tracking-wider">
              Sobre o Projeto
            </h4>
            <p className="text-xs text-brand-muted leading-relaxed">
              Desenvolvido pelo Grupo 40 Dev Full Stack. Dados coletados de fontes públicas oficiais para auxílio aos consumidores do RS.
            </p>
            <div className="pt-1">
              <Link to="/sobre" className="text-xs font-bold text-brand-green hover:underline">
                Conheça a equipe &rarr;
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-brand-border/60 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            SmartMarket &copy; 2026 — Todos os direitos reservados. Feito com excelência para o Rio Grande do Sul.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-semibold text-brand-green">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              Sistemas Operacionais 100%
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home
