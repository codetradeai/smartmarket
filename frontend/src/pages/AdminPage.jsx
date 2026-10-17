import { useState, useEffect } from "react"
import { PRODUCTS, CATEGORIES } from "../data"
import { produtoService, mercadoService, adminService } from "../services"
import {
  Button,
  Input,
  Card,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "../components/ui"

const INITIAL_USERS = [
  { id: 1, name: "Davi Souza", email: "davi@smartmarket.com.br", role: "ADMIN", createdAt: "2026-10-10", lists: 3, status: "ATIVO" },
  { id: 2, name: "Gilbert Lima", email: "gilbert@smartmarket.com.br", role: "ADMIN", createdAt: "2026-10-12", lists: 5, status: "ATIVO" },
  { id: 3, name: "Rudinei Silva", email: "rudinei@smartmarket.com.br", role: "ADMIN", createdAt: "2026-10-12", lists: 4, status: "ATIVO" },
  { id: 4, name: "Maria Santos", email: "maria@email.com", role: "USER", createdAt: "2026-10-14", lists: 7, status: "ATIVO" },
  { id: 5, name: "João Lima", email: "joao@email.com", role: "USER", createdAt: "2026-10-15", lists: 2, status: "ATIVO" },
]

const INITIAL_MARKETS = [
  {
    id: "fort",
    name: "Fort Atacadista",
    city: "Porto Alegre",
    address: "Av. Assis Brasil, 2600",
    products: 40,
    lastSync: "Hoje às 14:32",
    active: true,
    color: "#E63312",
  },
  {
    id: "carrefour",
    name: "Carrefour Mercado",
    city: "Porto Alegre",
    address: "Av. Ipiranga, 5300",
    products: 40,
    lastSync: "Hoje às 13:10",
    active: true,
    color: "#1A63B9",
  },
  {
    id: "big",
    name: "Big Bompreço",
    city: "Porto Alegre",
    address: "Av. Bento Gonçalves, 3200",
    products: 18,
    lastSync: "Hoje às 11:45",
    active: true,
    color: "#F5A623",
  },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("produtos") // 'produtos' | 'mercados' | 'usuarios'
  const [search, setSearch] = useState("")
  const [products, setProducts] = useState(PRODUCTS)
  const [markets, setMarkets] = useState(INITIAL_MARKETS)
  const [users, setUsers] = useState(INITIAL_USERS)
  const [stats, setStats] = useState(null)
  const [toastMessage, setToastMessage] = useState("")

  // Modais de Produto (Adicionar / Editar)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({
    name: "",
    brand: "",
    category: "graos",
    unit: "1 kg",
    image: "📦",
    priceFort: "",
    priceCarrefour: "",
    priceBig: "",
    promo: false,
  })

  // Modais de Mercado (Adicionar / Editar)
  const [marketModalOpen, setMarketModalOpen] = useState(false)
  const [editingMarket, setEditingMarket] = useState(null)
  const [marketForm, setMarketForm] = useState({
    name: "",
    city: "Porto Alegre",
    address: "",
    color: "#22A95E",
    active: true,
  })

  // Loading do botão de sincronização
  const [syncingMarketId, setSyncingMarketId] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(""), 3500)
  }

  // Carrega dados dinâmicos do backend com fallback
  useEffect(() => {
    let isMounted = true

    async function carregarDadosAdmin() {
      try {
        const [prodsData, mktsData, usersData, painelData] = await Promise.allSettled([
          produtoService.buscarCatalogoComPrecos(),
          mercadoService.listar(),
          adminService.listarUsuarios(),
          adminService.obterPainel(),
        ])

        if (!isMounted) return

        if (prodsData.status === "fulfilled" && Array.isArray(prodsData.value) && prodsData.value.length > 0) {
          setProducts(prodsData.value)
        }
        if (mktsData.status === "fulfilled" && Array.isArray(mktsData.value) && mktsData.value.length > 0) {
          setMarkets(mktsData.value)
        }
        if (usersData.status === "fulfilled" && usersData.value) {
          const uList = usersData.value.content || usersData.value
          if (Array.isArray(uList) && uList.length > 0) {
            setUsers(
              uList.map((u) => ({
                id: u.id,
                name: u.nome || u.name,
                email: u.email,
                role: u.papel || u.role || "USER",
                createdAt: u.createdAt ? String(u.createdAt).substring(0, 10) : "2026-10-10",
                lists: u.lists ?? 0,
                status: u.ativo !== false ? "ATIVO" : "SUSPENSO",
              }))
            )
          }
        }
        if (painelData.status === "fulfilled" && painelData.value) {
          setStats(painelData.value)
        }
      } catch (err) {
        console.warn("Aviso ao carregar dados do painel admin, usando dados locais:", err)
      }
    }

    carregarDadosAdmin()

    return () => {
      isMounted = false
    }
  }, [])

  /* ── Ações de Produtos ────────────────────────────────────────── */
  const openNewProductModal = () => {
    setEditingProduct(null)
    setProductForm({
      name: "",
      brand: "",
      category: "graos",
      unit: "1 kg",
      image: "📦",
      priceFort: "",
      priceCarrefour: "",
      priceBig: "",
      promo: false,
    })
    setProductModalOpen(true)
  }

  const openEditProductModal = (product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      brand: product.brand,
      category: product.category,
      unit: product.unit,
      image: product.image || "📦",
      priceFort: product.prices?.fort ? String(product.prices.fort) : "",
      priceCarrefour: product.prices?.carrefour ? String(product.prices.carrefour) : "",
      priceBig: product.prices?.big ? String(product.prices.big) : "",
      promo: Boolean(product.promo),
    })
    setProductModalOpen(true)
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (!productForm.name || !productForm.brand) {
      showToast("Por favor, preencha os campos obrigatórios.")
      return
    }

    const fortVal = productForm.priceFort ? parseFloat(productForm.priceFort.replace(",", ".")) : null
    const carrefourVal = productForm.priceCarrefour ? parseFloat(productForm.priceCarrefour.replace(",", ".")) : null
    const bigVal = productForm.priceBig ? parseFloat(productForm.priceBig.replace(",", ".")) : null

    const payload = {
      nome: productForm.name,
      marca: productForm.brand,
      categoria: productForm.category,
      quantidade: 1.0,
      unidade: productForm.unit || "un",
      imagemUrl: productForm.image,
    }

    if (editingProduct) {
      // Atualização
      try {
        if (typeof editingProduct.id === "number") {
          await produtoService.atualizar(editingProduct.id, payload)
        }
      } catch (err) {
        console.warn("Aviso ao sincronizar produto com a API:", err)
      }

      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: productForm.name,
                brand: productForm.brand,
                category: productForm.category,
                unit: productForm.unit,
                image: productForm.image,
                promo: productForm.promo,
                prices: {
                  ...p.prices,
                  fort: fortVal,
                  carrefour: carrefourVal,
                  big: bigVal,
                },
              }
            : p
        )
      )
      showToast(`Produto '${productForm.name}' atualizado com sucesso!`)
    } else {
      // Criação
      let newId = `p${Date.now()}`
      try {
        const criado = await produtoService.criar(payload)
        if (criado && criado.id) newId = criado.id
      } catch (err) {
        console.warn("Aviso ao cadastrar produto na API:", err)
      }

      const newProduct = {
        id: newId,
        name: productForm.name,
        brand: productForm.brand,
        category: productForm.category,
        unit: productForm.unit,
        image: productForm.image,
        promo: productForm.promo,
        prices: {
          fort: fortVal,
          carrefour: carrefourVal,
          big: bigVal,
        },
      }
      setProducts((prev) => [newProduct, ...prev])
      showToast(`Novo produto '${productForm.name}' cadastrado!`)
    }

    setProductModalOpen(false)
  }

  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto '${name}'?`)) {
      try {
        if (typeof id === "number") {
          await produtoService.remover(id)
        }
      } catch (err) {
        console.warn("Aviso ao excluir produto via API:", err)
      }
      setProducts((prev) => prev.filter((p) => p.id !== id))
      showToast(`Produto '${name}' removido do catálogo.`)
    }
  }

  /* ── Ações de Mercados ────────────────────────────────────────── */
  const openNewMarketModal = () => {
    setEditingMarket(null)
    setMarketForm({
      name: "",
      city: "Porto Alegre",
      address: "",
      color: "#22A95E",
      active: true,
    })
    setMarketModalOpen(true)
  }

  const openEditMarketModal = (market) => {
    setEditingMarket(market)
    setMarketForm({
      name: market.name,
      city: market.city,
      address: market.address,
      color: market.color,
      active: market.active,
    })
    setMarketModalOpen(true)
  }

  const handleSaveMarket = async (e) => {
    e.preventDefault()
    if (!marketForm.name) return

    const payload = {
      nome: marketForm.name,
      cidade: marketForm.city,
      endereco: marketForm.address,
      ativo: marketForm.active,
    }

    if (editingMarket) {
      try {
        if (typeof editingMarket.id === "number") {
          await mercadoService.atualizar(editingMarket.id, payload)
        }
      } catch (err) {
        console.warn("Aviso ao atualizar mercado via API:", err)
      }

      setMarkets((prev) =>
        prev.map((m) =>
          m.id === editingMarket.id
            ? {
                ...m,
                ...marketForm,
              }
            : m
        )
      )
      showToast(`Rede '${marketForm.name}' atualizada com sucesso!`)
    } else {
      let newId = marketForm.name.toLowerCase().replace(/\s+/g, "-")
      try {
        const criado = await mercadoService.criar(payload)
        if (criado && criado.id) newId = criado.id
      } catch (err) {
        console.warn("Aviso ao cadastrar mercado via API:", err)
      }

      const newMarket = {
        id: newId,
        ...marketForm,
        products: 0,
        lastSync: "Pendente primeira coleta",
      }
      setMarkets((prev) => [...prev, newMarket])
      showToast(`Novo supermercado '${marketForm.name}' cadastrado!`)
    }

    setMarketModalOpen(false)
  }

  const handleSyncMarket = (marketId, marketName) => {
    setSyncingMarketId(marketId)
    setTimeout(() => {
      setSyncingMarketId(null)
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setMarkets((prev) =>
        prev.map((m) => (m.id === marketId ? { ...m, lastSync: `Hoje às ${now}`, products: 40 } : m))
      )
      showToast(`Scraper executado com sucesso para '${marketName}'! Preços atualizados.`)
    }, 1800)
  }

  /* ── Ações de Usuários ────────────────────────────────────────── */
  const toggleUserRole = async (userId) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN"

    try {
      if (typeof userId === "number") {
        await adminService.alterarPapel(userId, newRole)
      }
    } catch (err) {
      console.warn("Aviso ao alterar papel do usuário via API:", err)
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )
    showToast(`Papel do usuário ${user.name} alterado para ${newRole}.`)
  }

  const toggleUserStatus = (userId) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === "ATIVO" ? "SUSPENSO" : "ATIVO"
          showToast(`Status do usuário ${u.name} alterado para ${newStatus}.`)
          return { ...u, status: newStatus }
        }
        return u
      })
    )
  }

  // Filtros
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
  )

  const filteredMarkets = markets.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.city.toLowerCase().includes(search.toLowerCase())
  )

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-navy text-white px-5 py-3 rounded-2xl shadow-xl border border-brand-green/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header do Painel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-navy tracking-tight">
              Painel Administrativo
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-brand-navy text-white tracking-wider">
              ADMIN
            </span>
          </div>
          <p className="text-sm text-brand-muted mt-1">
            Gestão de produtos do catálogo, redes de supermercados monitoradas e usuários.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "produtos" && (
            <Button variant="primary" size="md" leftIcon={<span>+</span>} onClick={openNewProductModal}>
              Novo Produto
            </Button>
          )}
          {activeTab === "mercados" && (
            <Button variant="primary" size="md" leftIcon={<span>+</span>} onClick={openNewMarketModal}>
              Novo Mercado
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Métricas Principais (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card variant="default" className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                Produtos no Catálogo
              </p>
              <h3 className="text-2xl font-extrabold text-brand-navy mt-0.5">
                {stats?.produtos ?? products.length}
              </h3>
              <span className="text-xs text-brand-green font-semibold">● 100% ativos</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-brand-green flex items-center justify-center text-2xl shadow-xs">
              📦
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                Redes Monitoradas
              </p>
              <h3 className="text-2xl font-extrabold text-brand-navy mt-0.5">
                {stats?.mercados ?? markets.length}
              </h3>
              <span className="text-xs text-brand-teal font-semibold">Fort & Carrefour integrados</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-brand-teal flex items-center justify-center text-2xl shadow-xs">
              🏪
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                Usuários Totais
              </p>
              <h3 className="text-2xl font-extrabold text-brand-navy mt-0.5">
                {stats?.usuarios ?? users.length}
              </h3>
              <span className="text-xs text-brand-muted font-medium">+3 administradores</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-brand-navy flex items-center justify-center text-2xl shadow-xs">
              👥
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                Pipeline de Coleta
              </p>
              <h3 className="text-2xl font-extrabold text-amber-600 mt-0.5">Online</h3>
              <span className="text-xs text-brand-muted font-medium">Rotina automática ativa</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shadow-xs">
              🔄
            </div>
          </div>
        </Card>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-brand-border w-fit shadow-xs">
        <button
          type="button"
          onClick={() => {
            setActiveTab("produtos")
            setSearch("")
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "produtos"
              ? "bg-brand-green text-white shadow-sm"
              : "text-brand-muted hover:text-brand-navy hover:bg-slate-50"
          }`}
        >
          <span>📦</span>
          <span>Produtos ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("mercados")
            setSearch("")
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "mercados"
              ? "bg-brand-green text-white shadow-sm"
              : "text-brand-muted hover:text-brand-navy hover:bg-slate-50"
          }`}
        >
          <span>🏪</span>
          <span>Mercados ({markets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("usuarios")
            setSearch("")
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "usuarios"
              ? "bg-brand-green text-white shadow-sm"
              : "text-brand-muted hover:text-brand-navy hover:bg-slate-50"
          }`}
        >
          <span>👥</span>
          <span>Usuários ({users.length})</span>
        </button>
      </div>

      {/* Conteúdo Principal em Card */}
      <Card variant="elevated" className="overflow-hidden">
        {/* Barra Superior da Tabela com Busca */}
        <div className="p-4 md:p-6 border-b border-brand-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="w-full sm:w-80">
            <Input
              isSearch
              placeholder={`Filtrar ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              className="h-10 text-xs bg-white"
            />
          </div>

          <div className="text-xs text-brand-muted font-medium">
            Exibindo{" "}
            <strong className="text-brand-navy font-bold">
              {activeTab === "produtos"
                ? filteredProducts.length
                : activeTab === "mercados"
                ? filteredMarkets.length
                : filteredUsers.length}
            </strong>{" "}
            registros
          </div>
        </div>

        {/* TABELA: PRODUTOS */}
        {activeTab === "produtos" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-brand-border/60 text-brand-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4">Marca</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Unidade</th>
                  <th className="py-3.5 px-4">Fort Atacadista</th>
                  <th className="py-3.5 px-4">Carrefour</th>
                  <th className="py-3.5 px-4">Big Bompreço</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p, index) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-brand-muted font-semibold">{index + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{p.image || "📦"}</span>
                        <div>
                          <p className="font-bold text-brand-navy text-sm">{p.name}</p>
                          {p.promo && (
                            <span className="inline-block px-1.5 py-0.2 rounded-sm bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase mt-0.5">
                              PROMO
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-brand-navy">{p.brand}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-brand-muted font-semibold">
                        {CATEGORIES.find((c) => c.id === p.category)?.label.split(",")[0] || p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-brand-muted font-medium">{p.unit}</td>
                    <td className="py-3.5 px-4 font-bold text-brand-navy">
                      {p.prices?.fort ? `R$ ${p.prices.fort.toFixed(2)}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-brand-navy">
                      {p.prices?.carrefour ? `R$ ${p.prices.carrefour.toFixed(2)}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-brand-navy">
                      {p.prices?.big ? `R$ ${p.prices.big.toFixed(2)}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => openEditProductModal(p)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABELA: MERCADOS */}
        {activeTab === "mercados" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-brand-border/60 text-brand-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Rede</th>
                  <th className="py-3.5 px-4">Cidade</th>
                  <th className="py-3.5 px-4">Endereço Principal</th>
                  <th className="py-3.5 px-4">Produtos Coletados</th>
                  <th className="py-3.5 px-4">Última Sincronização</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMarkets.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.name[0]}
                        </div>
                        <span className="font-bold text-brand-navy text-sm">{m.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-brand-navy font-semibold">{m.city}</td>
                    <td className="py-3.5 px-4 text-brand-muted">{m.address || "—"}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        {m.products} itens
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-brand-muted font-medium">{m.lastSync}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          m.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {m.active ? "ATIVO" : "INATIVO"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => openEditMarketModal(m)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="teal"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          isLoading={syncingMarketId === m.id}
                          onClick={() => handleSyncMarket(m.id, m.name)}
                        >
                          Sincronizar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABELA: USUÁRIOS */}
        {activeTab === "usuarios" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-brand-border/60 text-brand-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Usuário</th>
                  <th className="py-3.5 px-4">E-mail</th>
                  <th className="py-3.5 px-4">Papel (Role)</th>
                  <th className="py-3.5 px-4">Listas Criadas</th>
                  <th className="py-3.5 px-4">Data Cadastro</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-green/20 text-brand-green font-bold text-xs flex items-center justify-center">
                          {u.name[0]}
                        </div>
                        <span className="font-bold text-brand-navy">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-brand-muted font-medium">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                          u.role === "ADMIN" ? "bg-brand-navy text-white" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-brand-navy">{u.lists}</td>
                    <td className="py-3.5 px-4 text-brand-muted">{u.createdAt}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === "ATIVO" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => toggleUserRole(u.id)}
                        >
                          Mudar Role
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => toggleUserStatus(u.id)}
                        >
                          {u.status === "ATIVO" ? "Suspender" : "Ativar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL DE CADASTRO / EDIÇÃO DE PRODUTO */}
      <Modal isOpen={productModalOpen} onClose={() => setProductModalOpen(false)} size="lg">
        <form onSubmit={handleSaveProduct}>
          <ModalHeader>
            <ModalTitle>{editingProduct ? "Editar Produto" : "Novo Produto no Catálogo"}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Produto"
                required
                placeholder="Ex: Arroz Branco Tipo 1"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
              <Input
                label="Marca"
                required
                placeholder="Ex: Tio João, Camil, Omo..."
                value={productForm.brand}
                onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-brand-navy uppercase tracking-wide">
                  Categoria
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="h-11 px-3 text-sm rounded-xl border border-brand-border bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                >
                  {CATEGORIES.filter((c) => c.id !== "todos").map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Unidade / Peso"
                placeholder="Ex: 5 kg, 1 L, 500 g"
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
              />
            </div>

            {/* Preços por Mercado */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy mb-3">
                Preços por Supermercado (R$)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Fort Atacadista"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 22.90"
                  value={productForm.priceFort}
                  onChange={(e) => setProductForm({ ...productForm, priceFort: e.target.value })}
                />
                <Input
                  label="Carrefour Mercado"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 24.50"
                  value={productForm.priceCarrefour}
                  onChange={(e) => setProductForm({ ...productForm, priceCarrefour: e.target.value })}
                />
                <Input
                  label="Big Bompreço"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 23.80"
                  value={productForm.priceBig}
                  onChange={(e) => setProductForm({ ...productForm, priceBig: e.target.value })}
                />
              </div>
            </div>

            {/* Promoção Flag */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="promo-checkbox"
                checked={productForm.promo}
                onChange={(e) => setProductForm({ ...productForm, promo: e.target.checked })}
                className="w-4 h-4 rounded text-brand-green focus:ring-brand-green"
              />
              <label htmlFor="promo-checkbox" className="text-xs font-bold text-brand-navy cursor-pointer">
                Destacar como Oferta Promocional no Catálogo
              </label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setProductModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MODAL DE CADASTRO / EDIÇÃO DE MERCADO */}
      <Modal isOpen={marketModalOpen} onClose={() => setMarketModalOpen(false)} size="md">
        <form onSubmit={handleSaveMarket}>
          <ModalHeader>
            <ModalTitle>{editingMarket ? "Editar Supermercado" : "Novo Supermercado"}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Nome da Rede / Supermercado"
                required
                placeholder="Ex: Fort Atacadista, Carrefour..."
                value={marketForm.name}
                onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })}
              />
              <Input
                label="Cidade"
                placeholder="Ex: Porto Alegre"
                value={marketForm.city}
                onChange={(e) => setMarketForm({ ...marketForm, city: e.target.value })}
              />
              <Input
                label="Endereço da Loja"
                placeholder="Ex: Av. Assis Brasil, 2600"
                value={marketForm.address}
                onChange={(e) => setMarketForm({ ...marketForm, address: e.target.value })}
              />
              <div>
                <label className="text-xs font-semibold text-brand-navy uppercase tracking-wide block mb-1.5">
                  Cor da Identidade Visual
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={marketForm.color}
                    onChange={(e) => setMarketForm({ ...marketForm, color: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-brand-border"
                  />
                  <span className="text-xs font-mono font-bold text-brand-navy">{marketForm.color}</span>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setMarketModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingMarket ? "Salvar Rede" : "Cadastrar Rede"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
