import { useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button, Input } from "../components/ui"
import logoImg from "../assets/logo.png"

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, isLoading } = useAuth()

  // Determina se a URL veio com ?mode=register ou ?mode=login
  const queryParams = new URLSearchParams(location.search)
  const initialMode = queryParams.get("mode") === "register" ? "cadastro" : "login"
  const isSessionExpired = queryParams.get("expired") === "true"

  const [tab, setTab] = useState(initialMode)
  const [errorMessage, setErrorMessage] = useState(
    isSessionExpired ? "Sua sessão expirou. Por favor, autentique-se novamente." : ""
  )
  const [successMessage, setSuccessMessage] = useState("")

  // Form Login
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Form Cadastro
  const [cadNome, setCadNome] = useState("")
  const [cadEmail, setCadEmail] = useState("")
  const [cadPassword, setCadPassword] = useState("")
  const [cadConfirm, setCadConfirm] = useState("")

  // Destino pós-login (ou padrão /catalog)
  const fromDestination = location.state?.from?.pathname || "/catalog"

  const handleSwitchTab = (newTab) => {
    setTab(newTab)
    setErrorMessage("")
    setSuccessMessage("")
  }

  // Atalhos de teste para avaliadores
  const fillCredentials = (type) => {
    if (type === "admin") {
      setLoginEmail("davi@smartmarket.com.br")
      setLoginPassword("admin")
    } else {
      setLoginEmail("maria@email.com")
      setLoginPassword("user")
    }
    setTab("login")
    setErrorMessage("")
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage("")

    if (!loginEmail || !loginPassword) {
      setErrorMessage("Por favor, preencha o e-mail e a senha.")
      return
    }

    const result = await login(loginEmail, loginPassword)
    if (result.success) {
      navigate(fromDestination, { replace: true })
    } else {
      setErrorMessage(result.error || "Credenciais inválidas.")
    }
  }

  const handleCadastroSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage("")

    if (!cadNome || !cadEmail || !cadPassword || !cadConfirm) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    if (cadPassword !== cadConfirm) {
      setErrorMessage("As senhas informadas não coincidem.")
      return
    }

    if (cadPassword.length < 6) {
      setErrorMessage("A senha deve ter no mínimo 6 caracteres.")
      return
    }

    const result = await register(cadNome, cadEmail, cadPassword)
    if (result.success) {
      setSuccessMessage("Conta criada com sucesso! Redirecionando...")
      setTimeout(() => {
        navigate(fromDestination, { replace: true })
      }, 1000)
    } else {
      setErrorMessage(result.error || "Falha ao criar conta.")
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 font-sans bg-brand-bg">
      {/* Coluna Esquerda: Marca e Apresentação (Figma) */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-brand-navy via-brand-navy-light to-[#0A3D2E] text-white relative overflow-hidden">
        {/* Elementos visuais de fundo */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand-green/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-brand-teal/15 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <Link to="/" className="inline-block mb-12">
            <img
              src={logoImg}
              alt="SmartMarket"
              className="h-12 w-auto object-contain brightness-0 invert"
            />
          </Link>

          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Economize em cada <br />
            <span className="text-brand-teal">compra de supermercado</span>
          </h1>

          <p className="text-sm text-slate-300 max-w-sm mb-10 leading-relaxed">
            Monte sua lista de compras, compare os preços entre os supermercados da sua cidade e
            saiba onde o carrinho total sai mais barato.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-teal/20 text-brand-teal flex items-center justify-center text-lg shrink-0">
                🛒
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Monte sua lista</h4>
                <p className="text-xs text-slate-300">Adicione os produtos essenciais da sua rotina.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-green/20 text-brand-green flex items-center justify-center text-lg shrink-0">
                📊
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Compare preços em tempo real</h4>
                <p className="text-xs text-slate-300">
                  Veja o comparativo entre Fort Atacadista, Carrefour e outros mercados.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center text-lg shrink-0">
                💰
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Economia comprovada</h4>
                <p className="text-xs text-slate-300">
                  Escolha o mercado mais vantajoso e economize até 30% no mês.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/10 flex items-center gap-3 text-xs text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />
          <span>SmartMarket v1.0 — Gestão com autenticação JWT e segurança de perfis</span>
        </div>
      </div>

      {/* Coluna Direita: Formulários de Autenticação */}
      <div className="flex items-center justify-center p-6 sm:p-10 md:p-12">
        <div className="w-full max-w-md">
          {/* Logo Mobile */}
          <div className="md:hidden flex justify-center mb-6">
            <Link to="/">
              <img src={logoImg} alt="SmartMarket" className="h-10 w-auto" />
            </Link>
          </div>

          <div className="mb-6 text-center md:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              {tab === "login" ? "Área de Acesso" : "Primeira vez aqui?"}
            </span>
            <h2 className="text-2xl font-extrabold text-brand-navy tracking-tight mt-1">
              {tab === "login" ? "Entre na sua conta" : "Cadastre-se grátis"}
            </h2>
          </div>

          {/* Seletor de Abas */}
          <div className="flex bg-white p-1 rounded-2xl border border-brand-border mb-6 shadow-xs">
            <button
              type="button"
              onClick={() => handleSwitchTab("login")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                tab === "login"
                  ? "bg-brand-green text-white shadow-xs"
                  : "text-brand-muted hover:text-brand-navy"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab("cadastro")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                tab === "cadastro"
                  ? "bg-brand-green text-white shadow-xs"
                  : "text-brand-muted hover:text-brand-navy"
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Feedback de Erro ou Sucesso */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <span className="text-sm shrink-0">⚠️</span>
              <p className="font-medium">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <span className="text-sm shrink-0">✅</span>
              <p className="font-medium">{successMessage}</p>
            </div>
          )}

          {/* Card do Formulário */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border/80 shadow-[0_8px_30px_rgba(13,33,55,0.06)]">
            {tab === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <Input
                  label="E-mail"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />

                <Input
                  label="Senha"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isLoading}
                >
                  Entrar no SmartMarket
                </Button>

                {/* Atalhos para Avaliadores / Demonstração */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted text-center mb-2">
                    Acesso Rápido para Avaliação
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fillCredentials("admin")}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-brand-navy transition-colors text-center"
                    >
                      🛡️ Perfil Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => fillCredentials("user")}
                      className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-brand-navy transition-colors text-center"
                    >
                      👤 Perfil Usuário
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCadastroSubmit} className="space-y-4">
                <Input
                  label="Nome Completo"
                  required
                  placeholder="Ex: Davi Souza"
                  value={cadNome}
                  onChange={(e) => setCadNome(e.target.value)}
                />

                <Input
                  label="E-mail"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={cadEmail}
                  onChange={(e) => setCadEmail(e.target.value)}
                />

                <Input
                  label="Senha"
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={cadPassword}
                  onChange={(e) => setCadPassword(e.target.value)}
                />

                <Input
                  label="Confirmar Senha"
                  type="password"
                  required
                  placeholder="Repita a senha"
                  value={cadConfirm}
                  onChange={(e) => setCadConfirm(e.target.value)}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isLoading}
                >
                  Criar Conta
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-brand-muted mt-6">
            <Link to="/" className="hover:text-brand-green transition-colors">
              ← Voltar para a Página Inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
