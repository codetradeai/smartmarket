import { useState } from "react"
import { Link } from "react-router-dom"
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
  ProductImage,
  ProductDetailModal,
  Product360HoverPreview,
} from "../components/ui"
import { PRODUCTS, MARKETS, CATEGORIES } from "../data"

export function Home() {
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("todos")
  const [cartItemsCount, setCartItemsCount] = useState(3)
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const [alertTargetPrice, setAlertTargetPrice] = useState("")

  // Filtra produtos reais do catálogo
  const filteredProducts = PRODUCTS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      selectedCategory === "todos" || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

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

    return {
      bestMarketName: marketObj?.name || bestMarketKey,
      bestPrice,
      highestPrice,
      economia,
      totalMarkets: validEntries.length,
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col text-brand-navy">
      {/* 1. NAVBAR OFICIAL */}
      <Navbar
        cartCount={cartItemsCount}
        onSearch={(query) => setSearchTerm(query)}
        user={{ name: "Davi Cardozo", email: "davi@smartmarket.com.br" }}
      />

      {/* 2. HERO / APRESENTAÇÃO */}
      <section className="bg-gradient-to-b from-white via-white to-brand-bg border-b border-brand-border/60 py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-green-light border border-brand-green/30 text-brand-green text-xs font-bold tracking-wide uppercase shadow-xs">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            Cobertura Rio Grande do Sul: 8 Maiores Redes Ativas
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-brand-navy leading-tight">
            Economize no mercado com{" "}
            <span className="bg-gradient-to-r from-brand-emerald to-brand-teal bg-clip-text text-transparent">
              inteligência e comparação de preços no RS
            </span>
          </h1>

          <p className="text-base sm:text-lg text-brand-muted max-w-2xl mx-auto leading-relaxed">
            Monitoramento diário com fotos em alta definição, especificações técnicas completas
            e inteligência para você economizar até 32% nas suas compras de supermercado.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/catalog">
              <Button variant="primary" size="lg">
                Explorar Catálogo Completo
              </Button>
            </Link>
            <Link to="/list">
              <Button variant="outline" size="lg">
                Montar Lista Inteligente
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. SHOWCASE DAS 8 REDES DO RIO GRANDE DO SUL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 w-full">
        <div className="flex items-center justify-between mb-4 border-b border-brand-border/60 pb-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-brand-navy">
              Redes de Supermercados & Atacados Integradas no RS
            </h2>
            <p className="text-xs text-brand-muted">
              Preços raspados e atualizados diretamente dos canais oficiais no Rio Grande do Sul.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-brand-green border border-emerald-200">
            8 Redes Online
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {MARKETS.map((m) => (
            <div
              key={m.id}
              className="p-3 rounded-2xl bg-white border border-brand-border/80 shadow-xs hover:shadow-md transition-all flex flex-col items-center text-center group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-xs mb-2 transition-transform group-hover:scale-105"
                style={{ backgroundColor: m.color || "#0D2137" }}
              >
                {m.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-brand-navy line-clamp-1">
                {m.name}
              </span>
              <span className="text-[10px] text-brand-muted line-clamp-1 mt-0.5">
                {m.city || "RS"}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-green mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                Ativo
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. SHOWCASE DO CATÁLOGO DE PRODUTOS */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-12 w-full">
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                Ofertas & Comparador em Destaque
              </h2>
              <p className="text-xs text-brand-muted">
                Clique em qualquer produto para abrir a ficha técnica detalhada e o comparativo entre todas as redes.
              </p>
            </div>

            {/* Filtro de Categorias */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-brand-border overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setSelectedCategory("todos")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap ${
                  selectedCategory === "todos"
                    ? "bg-brand-green text-white"
                    : "text-brand-muted hover:text-brand-navy"
                }`}
              >
                Todos
              </button>
              {CATEGORIES.slice(0, 5).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? "bg-brand-green text-white"
                      : "text-brand-muted hover:text-brand-navy"
                  }`}
                >
                  {cat.label.split(",")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((produto) => {
              const insights = getProductInsights(produto)

              return (
                <Card
                  key={produto.id}
                  variant="interactive"
                  className="flex flex-col justify-between group overflow-hidden cursor-pointer"
                  onClick={() => setSelectedProductDetail(produto)}
                >
                  <CardHeader className="pb-2">
                    <div className="relative w-full h-44 bg-slate-50 rounded-xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center">
                      <Product360HoverPreview
                        product={produto}
                        alt={produto.name}
                        className="w-full h-full object-contain p-2"
                      />
                      {produto.promo && (
                        <span className="absolute top-2 left-2 bg-brand-coral text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider pointer-events-none">
                          Oferta
                        </span>
                      )}
                      <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200 pointer-events-none">
                        {produto.unit}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold text-brand-green bg-brand-green-light px-2 py-0.5 rounded-full uppercase">
                        {produto.category}
                      </span>
                      <span className="text-xs text-brand-muted font-medium">
                        {produto.brand}
                      </span>
                    </div>
                    <CardTitle className="text-sm mt-1.5 line-clamp-2 leading-snug">
                      {produto.name}
                    </CardTitle>
                    {produto.descricao && (
                      <CardDescription className="line-clamp-2 text-[11px] mt-1">
                        {produto.descricao}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-2 py-2">
                    {insights ? (
                      <>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
                          <div>
                            <span className="block text-[10px] font-medium text-emerald-800">
                              Melhor Preço ({insights.bestMarketName})
                            </span>
                            <span className="text-base font-extrabold text-brand-green">
                              R$ {insights.bestPrice.toFixed(2)}
                            </span>
                          </div>
                          {insights.economia > 0 && (
                            <span className="text-[10px] font-extrabold text-white bg-brand-green px-2 py-1 rounded-lg">
                              -R$ {insights.economia.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-brand-muted flex items-center justify-between px-1">
                          <span>Comparado em {insights.totalMarkets} mercados</span>
                          <span className="text-brand-navy font-bold hover:underline">
                            Ver todos &rarr;
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-2 text-center text-xs text-brand-muted bg-slate-50 rounded-xl">
                        Consultando preços...
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2">
                    <Button
                      variant="subtle"
                      size="sm"
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCartItemsCount((prev) => prev + 1)
                      }}
                    >
                      + Adicionar à Lista
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </section>
      </main>

      {/* 5. MODAL DE ESPECIFICAÇÕES E COMPARATIVO COMPLETO DO PRODUTO */}
      <ProductDetailModal
        product={selectedProductDetail}
        allProducts={PRODUCTS}
        onSelectProduct={setSelectedProductDetail}
        isOpen={Boolean(selectedProductDetail)}
        onClose={() => setSelectedProductDetail(null)}
        markets={MARKETS}
        onAddToList={(prod) => {
          setCartItemsCount((prev) => prev + 1)
        }}
      />

      {/* 6. MODAL DEMONSTRATIVO DE ALERTA */}
      <Modal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        size="md"
      >
        <ModalHeader>
          <ModalTitle>Criar Alerta de Preço</ModalTitle>
          <ModalDescription>
            Receba notificações quando o produto atingir o valor desejado em qualquer rede do RS.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div className="p-4 rounded-2xl bg-brand-green-light/40 border border-brand-green/20">
            <h4 className="text-sm font-bold text-brand-green">Dica de Economia do SmartMarket</h4>
            <p className="text-xs text-brand-navy mt-1 leading-relaxed">
              O robô de inteligência de preços verifica os encartes e catálogos diariamente.
            </p>
          </div>

          <div className="space-y-2">
            <Input
              label="Preço Alvo Desejado (R$)"
              placeholder="Ex: 24.90"
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
            onClick={() => setIsAlertModalOpen(false)}
          >
            Salvar Alerta
          </Button>
        </ModalFooter>
      </Modal>

      {/* 7. FOOTER */}
      <footer className="bg-white border-t border-brand-border py-8 px-4 text-center text-xs text-brand-muted">
        <p className="max-w-md mx-auto">
          SmartMarket &copy; 2026 — Grupo 40 Dev Full Stack. Monitoramento inteligente de preços no Rio Grande do Sul.
        </p>
      </footer>
    </div>
  )
}

export default Home

