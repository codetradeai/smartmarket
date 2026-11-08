import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
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
  CarrosselRedes,
} from "../components/ui"
import { MARKETS, TOTAIS } from "../catalogoResumo"
import { useProdutos } from "../hooks/useProdutos"
import { CatalogoCarregando, CatalogoErro } from "../components/ComCatalogo"
import { urlPublica } from "../utils/urlAssets"

const SEM_PRODUTOS = []

const SECTOR_BANNERS = [
  { id: "todos", label: "Todos", img: urlPublica("/images/categorias/master/todos.png"), icon: "🏪" },
  { id: "hortifruti", label: "Hortifrúti", img: urlPublica("/images/categorias/master/hortifruti.png"), icon: "🍎" },
  { id: "carnes", label: "Carnes", img: urlPublica("/images/categorias/master/carnes.png"), icon: "🥩" },
  { id: "padaria", label: "Padaria", img: urlPublica("/images/categorias/master/padaria.png"), icon: "🥖" },
  { id: "leites", label: "Frios e Laticínios", img: urlPublica("/images/categorias/master/leites.png"), icon: "🥛" },
  { id: "bebidas", label: "Bebidas", img: urlPublica("/images/categorias/master/bebidas.png"), icon: "🍺" },
  { id: "congelados", label: "Congelados", img: urlPublica("/images/categorias/master/congelados.png"), icon: "🧊" },
  { id: "graos", label: "Grãos e Arroz", img: urlPublica("/images/categorias/master/graos.png"), icon: "🌾" },
  { id: "cafe", label: "Café e Matinais", img: urlPublica("/images/categorias/master/cafe.png"), icon: "☕" },
  { id: "limpeza", label: "Limpeza", img: urlPublica("/images/categorias/master/limpeza.png"), icon: "🧹" },
  { id: "higiene", label: "Higiene", img: urlPublica("/images/categorias/master/higiene.png"), icon: "🧴" },
  { id: "oleos", label: "Óleos e Azeites", img: urlPublica("/images/categorias/master/oleos.png"), icon: "🫙" },
  { id: "biscoitos", label: "Biscoitos", img: urlPublica("/images/categorias/master/biscoitos.png"), icon: "🍪" },
  { id: "mercearia", label: "Mercearia", img: urlPublica("/images/categorias/master/mercearia.png"), icon: "🛒" },
  { id: "bazar", label: "Bazar", img: urlPublica("/images/categorias/master/bazar.png"), icon: "🍽️" },
]

// Cobertura real do catálogo: cada produto tem preço só nas redes onde foi coletado.
// Totais gerados do data.js (scripts/gerar-catalogo-resumo.mjs), por produto distinto (rede + id de origem).
const TOTAL_PRODUTOS = TOTAIS.produtosDistintos
const PRODUTOS_COM_PRECO = TOTAIS.produtosComPreco
const PRODUTOS_EM_2_REDES = TOTAIS.produtosEm2Redes

function contarItensDaLista(lista) {
  return Object.values(lista).filter((qty) => Number(qty || 0) > 0).length
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
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [termoConvite, setTermoConvite] = useState("")

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace("#", "")
      const el = document.getElementById(targetId)
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 60)
      }
    }
  }, [location.hash])
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("nenhum")
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

  // O catálogo (data.js) só é baixado quando algo precisa dele: usuário logado (busca da Navbar),
  // setor/rede/busca escolhidos ou produto aberto. A primeira dobra não depende dele.
  const precisaProdutos =
    isAuthenticated ||
    selectedCategory !== "nenhum" ||
    selectedMarket !== "todos" ||
    searchTerm.trim() !== "" ||
    Boolean(selectedProductDetail)
  const { produtos, carregando: carregandoProdutos, erro: erroProdutos, recarregar } = useProdutos(precisaProdutos)
  const PRODUCTS = produtos || SEM_PRODUTOS

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
        selectedCategory === "todos" ||
        selectedCategory === "nenhum" ||
        p.category === selectedCategory

      const insights = getProductInsights(p)
      const matchesMarket =
        selectedMarket === "todos" ||
        (insights && insights.bestMarketKey === selectedMarket) ||
        (p.prices && p.prices[selectedMarket] > 0)

      return matchesSearch && matchesCategory && matchesMarket
    })
  }, [PRODUCTS, searchTerm, selectedCategory, selectedMarket])

  const heroVideoRef = useRef(null)
  // O vídeo do hero (1,8 MB) só é pedido depois da primeira renderização e com a janela ociosa:
  // até lá a página mostra o poster. Quem prefere menos movimento ou usa economia de dados não baixa.
  const [heroVideoSrc, setHeroVideoSrc] = useState(undefined)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (media?.matches || navigator.connection?.saveData) return undefined

    let cancelado = false
    let idle
    const liberar = () => {
      if (!cancelado) setHeroVideoSrc(urlPublica("/video/hero.mp4"))
    }
    const agendar = () => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(liberar, { timeout: 3000 })
      } else {
        idle = window.setTimeout(liberar, 1500)
      }
    }
    if (document.readyState === "complete") agendar()
    else window.addEventListener("load", agendar, { once: true })

    return () => {
      cancelado = true
      window.removeEventListener("load", agendar)
      if (idle !== undefined) {
        if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle)
        else window.clearTimeout(idle)
      }
    }
  }, [])

  // Pausa/retoma o vídeo se a preferência de movimento mudar com a página aberta.
  useEffect(() => {
    const video = heroVideoRef.current
    if (!video || !heroVideoSrc || typeof window === "undefined" || !window.matchMedia) return undefined
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
  }, [heroVideoSrc])

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
                  <div className="flex flex-col gap-2 rounded-2xl bg-white p-1.5 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.65)] xl:flex-row xl:items-center">
                    <input
                      id="busca-home"
                      name="q"
                      type="text"
                      autoComplete="off"
                      value={termoConvite}
                      onChange={(event) => setTermoConvite(event.target.value)}
                      placeholder="Arroz, leite, café…"
                      className="min-w-0 w-full flex-1 bg-transparent px-3 py-2.5 text-sm font-medium text-brand-navy placeholder:text-brand-muted focus:outline-none"
                    />
                    <button type="submit" className="sm-cta w-full justify-center xl:w-auto shrink-0">
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
                <dt className="text-[11px] uppercase tracking-wider text-white/45">Produtos com preço coletado</dt>
                <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums text-white">{PRODUTOS_COM_PRECO.toLocaleString("pt-BR")}</dd>
                <p className="mt-0.5 text-[11px] text-white/55">
                  {PRODUTOS_EM_2_REDES > 0
                    ? `${PRODUTOS_EM_2_REDES.toLocaleString("pt-BR")} com preço em 2+ redes`
                    : "cada um com o preço da rede onde foi coletado"}
                </p>
              </div>
            </dl>
          </div>

          <div className="sm-hero-panel lg:col-span-7 xl:col-span-7 relative min-h-[24rem] overflow-hidden sm:min-h-[30rem] lg:min-h-0">
            <video
              ref={heroVideoRef}
              className="sm-hero-video"
              src={heroVideoSrc}
              poster={urlPublica("/video/hero-poster.jpg")}
              muted
              autoPlay
              loop
              playsInline
              preload="none"
              aria-label="No caixa, o cupom assusta. Em seguida, a lista é comparada no SmartMarket."
            />
          </div>
        </div>
      </section>

      <section id="redes" className="scroll-mt-24 w-full py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-5 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-green">
                <span className="h-1.5 w-1.5 rounded-[2px] bg-brand-green" aria-hidden="true" />
                Ecossistema de varejo
              </p>
              <h2 className="mt-2 font-display text-[1.75rem] font-extrabold tracking-tight text-brand-navy sm:text-[2rem] text-balance">
                Redes que fazem parte da sua economia.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-muted sm:text-base">
                Explore as redes disponíveis e descubra onde sua lista de compras pode custar menos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:pb-1">
              {selectedMarket !== "todos" && (
                <button
                  type="button"
                  onClick={() => setSelectedMarket("todos")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/25 bg-brand-green-light px-3 py-1.5 text-xs font-semibold text-brand-green transition-colors duration-200 hover:bg-brand-green/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                >
                  Filtrando: {MARKETS.find((m) => m.id === selectedMarket)?.name}
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">Limpar filtro de rede</span>
                </button>
              )}
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-3.5 py-1.5 text-xs shadow-[0_1px_2px_rgba(13,33,55,0.04)]">
                <span className="font-display text-sm font-extrabold tabular-nums text-brand-navy">
                  {String(MARKETS.length).padStart(2, "0")}
                </span>
                <span className="font-medium text-brand-muted">redes disponíveis</span>
              </p>
            </div>
          </header>

          <CarrosselRedes
            selectedMarket={selectedMarket}
            onSelect={(id) => {
              setSelectedMarket((current) => (current === id ? "todos" : id))
              document.getElementById("catalogo-ofertas")?.scrollIntoView({ behavior: "smooth" })
            }}
          />
        </div>
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
        {/* Cabeçalho dos Setores */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-brand-navy">
                  Explore por Setor do Supermercado
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-green-light text-brand-green">
                  {TOTAL_PRODUTOS.toLocaleString("pt-BR")} produtos monitorados
                </span>
              </div>
              <p className="text-xs text-brand-muted mt-0.5">
                Clique em qualquer setor abaixo para espiar uma amostra de produtos. Para pesquisar e comparar todos os preços, crie sua conta gratuita.
              </p>
            </div>

            {/* Botão de Alerta de Preço / Cadastro */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate(caminhoDoCadastro("comparador"))
                    return
                  }
                  setIsAlertModalOpen(true)
                }}
                className="text-xs font-bold border-brand-border gap-1.5"
              >
                <svg className="w-4 h-4 text-brand-amber" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                Criar Alerta de Preço
              </Button>
            </div>
          </div>

          {/* Banners Visuais dos Setores (Sem "Todos" aberto de cara para incentivar o clique no setor) */}
          <div className="bg-white rounded-2xl border border-brand-border/80 p-3 sm:p-4 shadow-2xs">
            <div className="flex items-start justify-between gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth py-1 px-2">
              {SECTOR_BANNERS.filter((cat) => cat.id !== "todos").map((cat) => {
                const isActive = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategory((prev) => (prev === cat.id ? "nenhum" : cat.id))
                    }
                    className="group flex flex-col items-center shrink-0 cursor-pointer select-none transition-all duration-200 outline-none"
                    title={`Ver amostra de ${cat.label}`}
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

        {/* Conteúdo abaixo dos setores: Oculto até que o usuário clique em um setor, e limitado a 4 produtos de amostra */}
        {selectedCategory === "nenhum" && selectedMarket === "todos" && !searchTerm.trim() ? (
          <div className="rounded-3xl border border-brand-border/80 bg-white p-8 sm:p-10 text-center shadow-2xs">
            <div className="mx-auto max-w-xl space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-light px-3 py-1 text-xs font-extrabold text-brand-green uppercase tracking-wider">
                👆 Escolha um setor acima para espiar
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-brand-navy">
                Quer ver todos os {TOTAL_PRODUTOS.toLocaleString("pt-BR")} produtos do catálogo?
              </h3>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                Clique em um dos setores acima para ver uma prévia de produtos ou cadastre-se gratuitamente para liberar o catálogo completo e o comparador de listas.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to={isAuthenticated ? "/catalog" : caminhoDoCadastro("catalogo")}
                  className="sm-cta"
                >
                  {isAuthenticated ? "Abrir Catálogo Completo" : "Criar conta grátis e liberar tudo"}
                  <span aria-hidden="true" className="sm-cta-arrow">→</span>
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/auth?mode=login"
                    className="px-4 py-2.5 rounded-xl border border-brand-border text-xs sm:text-sm font-bold text-brand-navy hover:bg-slate-50"
                  >
                    Já tenho conta
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : erroProdutos ? (
          <CatalogoErro onTentarNovamente={recarregar} className="rounded-3xl border border-brand-border bg-white" />
        ) : carregandoProdutos ? (
          <CatalogoCarregando className="rounded-3xl border border-brand-border bg-white" />
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-brand-border p-8 space-y-4">
            <h3 className="text-base font-bold text-brand-navy">
              Nenhum produto encontrado neste filtro
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setSelectedCategory("nenhum")
                setSelectedMarket("todos")
              }}
            >
              Fechar prévia
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs sm:text-sm font-bold text-brand-navy">
                Prévia do setor:{" "}
                <span className="text-brand-green">
                  mostrando 4 de {filteredProducts.length} produtos disponíveis
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("nenhum")
                  setSelectedMarket("todos")
                }}
                className="text-xs font-bold text-brand-muted hover:text-brand-navy cursor-pointer"
              >
                ✕ Ocultar prévia
              </button>
            </div>

            {/* Exibe apenas 4 produtos como degustação para incentivar o cadastro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.slice(0, 4).map((produto) => {
                const insights = getProductInsights(produto)

                return (
                  <Card
                    key={produto.id}
                    variant="interactive"
                    className="flex flex-col justify-between group overflow-hidden cursor-pointer border-brand-border/80 hover:border-brand-green/60 hover:shadow-lg transition-all"
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate(caminhoDoCadastro("busca", produto.name))
                        return
                      }
                      setSelectedProductDetail(produto)
                    }}
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
                                {insights.totalMarkets > 1
                                  ? `Melhor Preço (${insights.bestMarketName})`
                                  : `Preço no ${insights.bestMarketName}`}
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
                            <span>
                              {insights.totalMarkets > 1
                                ? `Comparado em ${insights.totalMarkets} mercados`
                                : "Preço só nesta rede"}
                            </span>
                            <span className="text-brand-navy font-bold hover:underline">
                              {isAuthenticated ? "Ver comparativo →" : "Cadastre-se p/ comparar →"}
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
                          if (!isAuthenticated) {
                            navigate(caminhoDoCadastro("lista", produto.name))
                            return
                          }
                          setCartItemsCount(adicionarNaLista(produto.id))
                          showToast(`"${produto.name}" adicionado à lista!`)
                        }}
                      >
                        {isAuthenticated ? "+ Adicionar à Minha Lista" : "🔒 Criar conta para usar"}
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>

            {/* Banner de Bloqueio / Incentivo ao Cadastro logo abaixo dos 4 itens de amostra */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-navy via-[#133250] to-brand-navy p-6 sm:p-8 text-white shadow-lg border border-brand-green/30 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 px-3 py-1 text-xs font-extrabold text-[#7dffe0] uppercase tracking-wider">
                  🔒 +{Math.max(0, filteredProducts.length - 4)} produtos ocultos neste setor
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  Cadastre-se grátis para desbloquear todos os {filteredProducts.length} itens deste setor!
                </h3>
                <p className="text-xs sm:text-sm text-white/75 max-w-2xl">
                  Com a sua conta gratuita, você libera os {TOTAL_PRODUTOS.toLocaleString("pt-BR")} produtos do catálogo, pesquisa qualquer marca e descobre em qual dos 8 supermercados sua lista sai mais barata.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <Link
                  to={isAuthenticated ? "/catalog" : caminhoDoCadastro("catalogo")}
                  className="sm-cta sm-cta-light whitespace-nowrap"
                >
                  {isAuthenticated ? "Ver todos no Catálogo" : "Criar conta gratuita"}
                  <span aria-hidden="true" className="sm-cta-arrow">→</span>
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/auth?mode=login"
                    className="sm-cta sm-cta-ghost whitespace-nowrap"
                  >
                    Entrar
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 6. SEÇÃO SOBRE (#sobre) INTEGRADA NA HOME */}
      <section id="sobre" className="scroll-mt-24 bg-white border-t border-brand-border/60 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-brand-green-light px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-green">
              Sobre o SmartMarket
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl text-balance">
              Economia inteligente na palma da sua mão.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-brand-muted leading-relaxed">
              O SmartMarket nasceu com um propósito claro: eliminar o desperdício de tempo e dinheiro na comparação de preços em supermercados do Rio Grande do Sul.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-6 border-brand-border/80">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-base font-extrabold text-brand-navy mb-1.5">Coleta Automatizada RS</h3>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                Robôs especializados que monitoram VTEX, VipCommerce e APIs oficiais das 8 maiores redes do RS.
              </p>
            </Card>

            <Card className="p-6 border-brand-border/80">
              <div className="text-3xl mb-3">📸</div>
              <h3 className="text-base font-extrabold text-brand-navy mb-1.5">Fotos e 360° em Alta Definição</h3>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                Catálogo visual enriquecido com imagens originais em alta resolução e rotação 360° interativa.
              </p>
            </Card>

            <Card className="p-6 border-brand-border/80">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-base font-extrabold text-brand-navy mb-1.5">Comparação Cesta a Cesta</h3>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                Calculamos a economia líquida e apontamos o supermercado mais vantajoso para sua compra inteira.
              </p>
            </Card>

            <Card className="p-6 border-brand-border/80">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="text-base font-extrabold text-brand-navy mb-1.5">Transparência Total</h3>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                Preços neutros, sem favorecimento de marcas, focados 100% no benefício do consumidor gaúcho.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. FAIXA FINAL — dois blocos de cor, como o banner do Desco */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
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
              <a href="#sobre" className="text-xs font-bold text-brand-green hover:underline">
                Sobre o projeto &rarr;
              </a>
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
