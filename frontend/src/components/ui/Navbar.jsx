import { useState, useContext } from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "../../lib/utils"
import { AuthContext } from "../../contexts/AuthContext"
import { Button } from "./Button"
import { Input } from "./Input"
import { SmartMarketLogo } from "./SmartMarketLogo"

export function Navbar({
  brandName = "SmartMarket",
  logoUrl,
  navLinks,
  user: propUser,
  cartCount = 0,
  onSearch,
  className,
}) {
  const authContext = useContext(AuthContext)
  const user = propUser || authContext?.user
  const isAdmin = authContext?.isAdmin || user?.papel === "ADMIN"
  const displayName = user?.nome || user?.name || ""

  const defaultNavLinks = [
    { label: "Catálogo", href: "/catalog" },
    { label: "Favoritos", href: "/favorites" },
    { label: "Minha Lista", href: "/list", badgeCount: cartCount },
    { label: "Comparador", href: "/compare" },
    ...(isAdmin ? [{ label: "Admin", href: "/admin" }] : []),
  ]

  const activeNavLinks = navLinks || defaultNavLinks
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const location = useLocation()

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    onSearch?.(searchTerm)
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-brand-border/70",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Lado Esquerdo: Logo e Marca */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group select-none">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-10 w-auto object-contain" />
            ) : (
              <SmartMarketLogo size="md" />
            )}
          </Link>

          {/* Links Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {activeNavLinks.map((link) => {
              const isActive = location.pathname === link.href
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-1.5",
                    isActive
                      ? "text-brand-green bg-brand-green-light"
                      : "text-brand-muted hover:text-brand-navy hover:bg-slate-50"
                  )}
                >
                  <span>{link.label}</span>
                  {link.badgeCount !== undefined && link.badgeCount > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold rounded-full",
                        isActive
                          ? "bg-brand-green text-white"
                          : "bg-slate-200 text-brand-navy"
                      )}
                    >
                      {link.badgeCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Centro: Barra de Busca Rápida (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-4">
          <form onSubmit={handleSearchSubmit} className="w-full">
            <Input
              isSearch
              placeholder="Buscar produtos, marcas ou categorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
              className="h-10 text-xs bg-slate-50 border-brand-border/60 hover:bg-white"
            />
          </form>
        </div>

        {/* Lado Direito: Ações e Usuário */}
        <div className="flex items-center gap-3">
          {/* Botão de Lista / Carrinho */}
          <Link to="/list" className="relative">
            <Button variant="ghost" size="icon" aria-label="Minha Lista de Compras">
              <svg
                className="w-5 h-5 text-brand-navy"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-green text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Usuário ou Botão de Ação */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-brand-border">
              <div className="w-9 h-9 rounded-xl bg-brand-green-light border border-brand-green/30 text-brand-green font-bold text-sm flex items-center justify-center">
                {displayName[0]?.toUpperCase() || "U"}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-brand-navy leading-tight">
                  {displayName || "Conta"}
                </span>
                <span className="text-[10px] text-brand-muted">{user.email}</span>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/auth?mode=login">
                <Button variant="outline" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/auth?mode=register">
                <Button variant="primary" size="sm">
                  Cadastrar
                </Button>
              </Link>
            </div>
          )}

          {/* Botão Hambúrguer Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Abrir menu"
            className="md:hidden p-2 rounded-xl text-brand-navy hover:bg-slate-100 transition-colors"
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menu Drawer Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-brand-border bg-white px-4 pt-3 pb-6 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSearchSubmit} className="mb-2">
            <Input
              isSearch
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50"
            />
          </form>

          <nav className="flex flex-col gap-1">
            {activeNavLinks.map((link) => {
              const isActive = location.pathname === link.href
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between",
                    isActive
                      ? "text-brand-green bg-brand-green-light"
                      : "text-brand-navy hover:bg-slate-50"
                  )}
                >
                  <span>{link.label}</span>
                  {link.badgeCount !== undefined && link.badgeCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-brand-green text-white">
                      {link.badgeCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {!user && (
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <Link to="/auth?mode=login" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  Entrar
                </Button>
              </Link>
              <Link to="/auth?mode=register" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="primary" size="sm" className="w-full">
                  Cadastrar
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
