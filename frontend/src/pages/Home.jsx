import { useState } from "react"
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
} from "../components/ui"

export function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingButton, setLoadingButton] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("todos")
  const [cartItemsCount, setCartItemsCount] = useState(3)

  // Produtos de demonstração integrando Fort Atacadista e Carrefour Mercado
  const demoProducts = [
    {
      id: 1,
      nome: "Arroz Branco Tipo 1 5kg",
      marca: "Camil",
      categoria: "graos",
      unidade: "5kg",
      fortPrice: 26.90,
      carrefourPrice: 28.50,
      melhorMercado: "Fort Atacadista",
      economia: 1.60,
    },
    {
      id: 2,
      nome: "Feijão Preto Tipo 1 1kg",
      marca: "Kicaldo",
      categoria: "graos",
      unidade: "1kg",
      fortPrice: 8.79,
      carrefourPrice: 7.99,
      melhorMercado: "Carrefour",
      economia: 0.80,
    },
    {
      id: 3,
      nome: "Leite UHT Integral 1L",
      marca: "Piracanjuba",
      categoria: "laticinios",
      unidade: "1L",
      fortPrice: 4.89,
      carrefourPrice: 4.89,
      melhorMercado: "Empate",
      economia: 0.00,
    },
    {
      id: 4,
      nome: "Café Torrado e Moído 500g",
      marca: "Pilão",
      categoria: "mercearia",
      unidade: "500g",
      fortPrice: 19.98,
      carrefourPrice: 21.49,
      melhorMercado: "Fort Atacadista",
      economia: 1.51,
    },
  ]

  const filteredProducts = demoProducts.filter((p) => {
    const matchesSearch =
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.marca.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      selectedCategory === "todos" || p.categoria === selectedCategory
    return matchesSearch && matchesCategory
  })

  const triggerLoading = () => {
    setLoadingButton(true)
    setTimeout(() => setLoadingButton(false), 2000)
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col text-brand-navy">
      {/* 1. NAVBAR OFICIAL */}
      <Navbar
        cartCount={cartItemsCount}
        onSearch={(query) => setSearchTerm(query)}
        user={{ name: "Davi Cardozo", email: "davi@smartmarket.com.br" }}
      />

      {/* 2. HERO / APRESENTAÇÃO DO DESIGN SYSTEM */}
      <section className="bg-gradient-to-b from-white via-white to-brand-bg border-b border-brand-border/60 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-green-light border border-brand-green/30 text-brand-green text-xs font-bold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            Design System & Tailwind CSS v4 Concluído
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-brand-navy leading-tight">
            Economize no mercado com{" "}
            <span className="bg-gradient-to-r from-brand-emerald to-brand-teal bg-clip-text text-transparent">
              inteligência e agilidade
            </span>
          </h1>

          <p className="text-base sm:text-lg text-brand-muted max-w-2xl mx-auto leading-relaxed">
            Componentes UI profissionais construídos com base no design oficial do Figma,
            garantindo consistência visual, máxima performance e acessibilidade.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setIsModalOpen(true)
              }}
            >
              Testar Modal de Comparação
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={triggerLoading}
              isLoading={loadingButton}
            >
              Testar Estado Loading
            </Button>
          </div>
        </div>
      </section>

      {/* 3. SHOWCASE DOS COMPONENTES BASE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 space-y-16">
        {/* SEÇÃO A: PALETA DE CORES OFICIAIS */}
        <section className="space-y-4">
          <div className="border-b border-brand-border/60 pb-3">
            <h2 className="text-xl font-bold tracking-tight text-brand-navy">
              1. Cores e Tokens do Tema (Figma)
            </h2>
            <p className="text-xs text-brand-muted">
              Cores semânticas configuradas no Tailwind CSS v4 para manter a identidade da marca.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-brand-navy text-white flex flex-col justify-between h-28 shadow-sm">
              <span className="text-xs font-bold">Navy (Principal)</span>
              <span className="text-[11px] opacity-80 font-mono">#0D2137</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-green text-white flex flex-col justify-between h-28 shadow-sm">
              <span className="text-xs font-bold">Green (Economia)</span>
              <span className="text-[11px] opacity-80 font-mono">#22A95E</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-teal text-white flex flex-col justify-between h-28 shadow-sm">
              <span className="text-xs font-bold">Teal (Modern)</span>
              <span className="text-[11px] opacity-80 font-mono">#1DB4A3</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-green-light border border-brand-green/30 text-brand-green flex flex-col justify-between h-28">
              <span className="text-xs font-bold">Green Light</span>
              <span className="text-[11px] opacity-80 font-mono">#E8F8F0</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-brand-border text-brand-navy flex flex-col justify-between h-28 shadow-xs">
              <span className="text-xs font-bold">Border / Card</span>
              <span className="text-[11px] text-brand-muted font-mono">#D4E8DC</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand-coral text-white flex flex-col justify-between h-28 shadow-sm">
              <span className="text-xs font-bold">Coral (Alerta/Promo)</span>
              <span className="text-[11px] opacity-80 font-mono">#FF6B4A</span>
            </div>
          </div>
        </section>

        {/* SEÇÃO B: BUTTONS REUTILIZÁVEIS */}
        <section className="space-y-4">
          <div className="border-b border-brand-border/60 pb-3">
            <h2 className="text-xl font-bold tracking-tight text-brand-navy">
              2. Componente Button e Variantes
            </h2>
            <p className="text-xs text-brand-muted">
              Variações com transições suaves, múltiplos tamanhos, suporte a ícones e estados de acessibilidade.
            </p>
          </div>

          <div className="p-6 bg-white border border-brand-border/80 rounded-2xl space-y-6">
            <div>
              <span className="text-xs font-bold text-brand-muted uppercase tracking-wider block mb-3">
                Variantes de Cor
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary (Green)</Button>
                <Button variant="secondary">Secondary (Navy)</Button>
                <Button variant="teal">Teal</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="subtle">Subtle</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-brand-muted uppercase tracking-wider block mb-3">
                Tamanhos
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Pequeno (sm)</Button>
                <Button size="md">Médio (md - padrão)</Button>
                <Button size="lg">Grande (lg)</Button>
                <Button size="icon" aria-label="Favorito">
                  <svg className="w-5 h-5 text-amber-500 fill-amber-500" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO C: INPUTS REUTILIZÁVEIS */}
        <section className="space-y-4">
          <div className="border-b border-brand-border/60 pb-3">
            <h2 className="text-xl font-bold tracking-tight text-brand-navy">
              3. Componente Input
            </h2>
            <p className="text-xs text-brand-muted">
              Inputs flexíveis com rótulos, ícones internos, limpeza rápida e tratamento de erros.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white border border-brand-border/80 rounded-2xl">
            <Input
              label="Nome do Produto"
              placeholder="Ex: Arroz Integral 1kg"
              helperText="Digite para filtrar o catálogo"
            />
            <Input
              label="Busca Especializada"
              isSearch
              placeholder="Pesquisar por categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
            />
            <Input
              label="Validação com Erro"
              placeholder="Digite um e-mail..."
              defaultValue="email-invalido@"
              error="Informe um e-mail válido para receber alertas"
            />
          </div>
        </section>

        {/* SEÇÃO D: CARDS E CATÁLOGO DE COMPARAÇÃO */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                4. Componente Card (Catálogo & Comparador de Preços)
              </h2>
              <p className="text-xs text-brand-muted">
                Comparação ao vivo entre Fort Atacadista e Carrefour Mercado.
              </p>
            </div>

            {/* Filtro de Categorias */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-brand-border">
              {["todos", "graos", "laticinios", "mercearia"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    selectedCategory === cat
                      ? "bg-brand-green text-white"
                      : "text-brand-muted hover:text-brand-navy"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((produto) => (
              <Card key={produto.id} variant="interactive" className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold text-brand-green bg-brand-green-light px-2 py-0.5 rounded-full uppercase">
                      {produto.categoria}
                    </span>
                    <span className="text-xs text-brand-muted font-medium">
                      {produto.unidade}
                    </span>
                  </div>
                  <CardTitle className="text-base mt-1">{produto.nome}</CardTitle>
                  <CardDescription>Marca: {produto.marca}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-2.5">
                  {/* Linha Fort Atacadista */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-medium text-slate-700">Fort Atacadista</span>
                    <span className="font-bold text-brand-navy">
                      R$ {produto.fortPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Linha Carrefour Mercado */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-medium text-slate-700">Carrefour</span>
                    <span className="font-bold text-brand-navy">
                      R$ {produto.carrefourPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Vantagem de Economia */}
                  {produto.economia > 0 && (
                    <div className="text-[11px] font-bold text-brand-green flex items-center justify-between pt-1">
                      <span>Mais barato no {produto.melhorMercado}</span>
                      <span>-R$ {produto.economia.toFixed(2)}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  <Button
                    variant="subtle"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setCartItemsCount((prev) => prev + 1)
                    }}
                  >
                    + Adicionar à Lista
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* 4. MODAL DEMONSTRATIVO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="md"
      >
        <ModalHeader>
          <ModalTitle>Comparação Detalhada de Preço</ModalTitle>
          <ModalDescription>
            Visualização de histórico de ofertas coletadas automaticamente pelo scraper.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div className="p-4 rounded-2xl bg-brand-green-light/40 border border-brand-green/20">
            <h4 className="text-sm font-bold text-brand-green">Dica de Economia do SmartMarket</h4>
            <p className="text-xs text-brand-navy mt-1 leading-relaxed">
              Comprando os itens na loja recomendada, sua lista de compras desta semana fica até
              <strong> 14% mais barata</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <Input label="Definir alerta de preço (R$)" placeholder="Ex: 24.90" />
            <span className="text-[11px] text-brand-muted">
              Você receberá uma notificação quando o produto atingir este valor.
            </span>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setIsModalOpen(false)
            }}
          >
            Salvar Alerta
          </Button>
        </ModalFooter>
      </Modal>

      {/* 5. FOOTER */}
      <footer className="bg-white border-t border-brand-border py-8 px-4 text-center text-xs text-brand-muted">
        <p className="max-w-md mx-auto">
          SmartMarket &copy; 2026 — Grupo 40 Dev Full Stack. Design System e Componentes UI
          reutilizáveis desenvolvidos com Tailwind CSS v4 e React 19.
        </p>
      </footer>
    </div>
  )
}

export default Home
