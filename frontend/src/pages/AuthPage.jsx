import { useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button, Input, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "../components/ui"
import logoImg from "../assets/logo.png"

/**
 * Medidor de Força de Senha conforme especificação do Figma
 */
function PasswordStrengthIndicator({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length

  const levels = [
    { label: "Muito fraca", color: "bg-brand-error text-brand-error", bar: "bg-brand-error" },
    { label: "Fraca", color: "bg-amber-500 text-amber-600", bar: "bg-amber-500" },
    { label: "Média", color: "bg-amber-500 text-amber-600", bar: "bg-amber-500" },
    { label: "Forte", color: "bg-brand-green text-brand-green", bar: "bg-brand-green" },
    { label: "Muito forte", color: "bg-brand-teal text-brand-teal", bar: "bg-brand-teal" },
  ]
  const currentLevel = levels[score] || levels[0]

  return (
    <div className="flex flex-col gap-1.5 mt-1 animate-in fade-in duration-200">
      <div className="flex gap-1.5 h-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-300 ${
              i < score ? currentLevel.bar : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <span className={`text-[11px] font-bold ${currentLevel.color.split(" ")[1]}`}>
        Segurança da Senha: {currentLevel.label}
      </span>
    </div>
  )
}

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, isLoading } = useAuth()

  // Determina se a URL veio com ?mode=register ou ?mode=login
  const queryParams = new URLSearchParams(location.search)
  const initialMode = queryParams.get("mode") === "register" ? "cadastro" : "login"
  const intent = queryParams.get("intent")
  const termoBusca = queryParams.get("q")
  const convite = {
    busca: termoBusca
      ? `Para comparar “${termoBusca}”, entre ou crie sua conta.`
      : "Para pesquisar preços, entre ou crie sua conta.",
    comparador: "Para usar o comparador de preços, entre ou crie sua conta.",
    lista: "Para montar a lista, entre ou crie sua conta.",
    catalogo: "Para abrir o catálogo, entre ou crie sua conta.",
  }[intent] || ""
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

  // Modal Esqueceu a Senha
  const [forgotModalOpen, setForgotModalOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotFeedback, setForgotFeedback] = useState("")

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
      }, 1200)
    } else {
      setErrorMessage(result.error || "Falha ao criar conta.")
    }
  }

  const handleForgotSubmit = (e) => {
    e.preventDefault()
    if (!forgotEmail) return
    setForgotFeedback(`Instruções de redefinição foram enviadas para ${forgotEmail}!`)
    setTimeout(() => {
      setForgotFeedback("")
      setForgotModalOpen(false)
      setForgotEmail("")
    }, 2500)
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 font-sans bg-brand-bg">
      {/* Coluna Esquerda: Marca e Apresentação (Figma Oficial) */}
      <div className="hidden md:flex flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-brand-navy via-brand-navy-light to-[#0A3D2E] text-white relative overflow-hidden">
        {/* Círculos decorativos do Figma */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand-green/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-brand-teal/15 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <Link to="/" className="inline-flex mb-10 rounded-2xl bg-white px-3 py-2">
            <img
              src={logoImg}
              alt="SmartMarket"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Economize em cada <br />
            <span className="text-brand-teal">compra de supermercado</span>
          </h1>

          <p className="text-sm text-slate-300 max-w-sm mb-10 leading-relaxed">
            Monte sua lista, compare os preços entre os mercados e saiba exatamente onde comprar mais barato.
          </p>

          <div className="space-y-5">
            {/* Benefício 1 */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-brand-teal/20 text-brand-teal flex items-center justify-center text-xl shrink-0 shadow-xs">
                🛒
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Monte sua lista</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Adicione os produtos que você precisa comprar no dia a dia.
                </p>
              </div>
            </div>

            {/* Benefício 2 */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-brand-green/20 text-brand-green flex items-center justify-center text-xl shrink-0 shadow-xs">
                📊
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Compare preços</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Veja o total em cada supermercado da sua região (Fort, Carrefour e mais).
                </p>
              </div>
            </div>

            {/* Benefício 3 */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center text-xl shrink-0 shadow-xs">
                💰
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Economize de verdade</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Escolha o mercado mais barato para sua lista completa.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Acadêmico do Figma */}
        <div className="relative z-10 mt-12 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green to-brand-teal flex items-center justify-center text-lg text-white font-bold shrink-0 shadow-xs">
            ⭐
          </div>
          <div>
            <p className="text-xs font-bold text-white">Projeto Acadêmico — Grupo 40</p>
            <p className="text-[11px] text-slate-400">Codifica / +praTI · Dev Full Stack Jr 2026</p>
          </div>
        </div>
      </div>

      {/* Coluna Direita: Formulários Interativos do Frame Home */}
      <div className="flex items-center justify-center p-6 sm:p-10 md:p-12">
        <div className="w-full max-w-md">
          {/* Header Mobile */}
          <div className="md:hidden flex justify-center mb-6">
            <Link to="/">
              <img src={logoImg} alt="SmartMarket" className="h-12 w-auto object-contain" />
            </Link>
          </div>

          <div className="mb-6 text-center md:text-left">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              {tab === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </p>
            <h2 className="text-2xl font-extrabold text-brand-navy tracking-tight mt-1">
              {tab === "login" ? "Acesse sua conta" : "Comece a economizar"}
            </h2>
            {convite && (
              <p className="mt-3 rounded-xl bg-brand-green-light px-3 py-2 text-sm font-semibold text-brand-navy">
                {convite}
              </p>
            )}
          </div>

          {/* Abas Alternadoras no Estilo Figma */}
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
              Criar conta
            </button>
          </div>

          {/* Feedback Visual de Alerta (Estilo Figma) */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <span className="text-sm shrink-0">⚠️</span>
              <div>
                <p className="font-bold">E-mail ou senha inválidos</p>
                <p className="text-[11px]">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <span className="text-sm shrink-0">✅</span>
              <div>
                <p className="font-bold">Conta criada com sucesso!</p>
                <p className="text-[11px]">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Card Principal */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border/80 shadow-[0_4px_24px_rgba(13,33,55,0.08)]">
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

                <div>
                  <Input
                    label="Senha"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(true)}
                      className="text-xs text-brand-green font-semibold hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isLoading}
                >
                  Entrar
                </Button>

                <p className="text-center text-xs text-brand-muted pt-2">
                  Não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => handleSwitchTab("cadastro")}
                    className="text-brand-green font-bold hover:underline"
                  >
                    Criar conta grátis
                  </button>
                </p>

                {/* Atalhos Rápidos para Banca de Avaliação */}
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
                      🛡️ Perfil Administrador
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
                  label="Nome completo"
                  required
                  placeholder="João da Silva"
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

                <div>
                  <Input
                    label="Senha"
                    type="password"
                    required
                    placeholder="Mínimo 8 caracteres"
                    value={cadPassword}
                    onChange={(e) => setCadPassword(e.target.value)}
                  />
                  {cadPassword.length > 0 && <PasswordStrengthIndicator password={cadPassword} />}
                </div>

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
                  Criar conta
                </Button>

                <p className="text-center text-xs text-brand-muted pt-2">
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => handleSwitchTab("login")}
                    className="text-brand-green font-bold hover:underline"
                  >
                    Entrar
                  </button>
                </p>
              </form>
            )}
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6 leading-relaxed">
            Ao continuar, você concorda com os{" "}
            <a href="#" className="underline text-brand-muted">
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a href="#" className="underline text-brand-muted">
              Política de Privacidade
            </a>
            .
          </p>
        </div>
      </div>

      {/* Modal Esqueceu a Senha */}
      <Modal isOpen={forgotModalOpen} onClose={() => setForgotModalOpen(false)} size="sm">
        <form onSubmit={handleForgotSubmit}>
          <ModalHeader>
            <ModalTitle>Recuperar Senha</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className="text-xs text-brand-muted mb-4 leading-relaxed">
              Informe o e-mail cadastrado na sua conta para enviarmos o link de redefinição de
              senha.
            </p>
            <Input
              label="E-mail cadastrado"
              type="email"
              required
              placeholder="seu@email.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            {forgotFeedback && (
              <p className="mt-3 text-xs font-semibold text-brand-green">{forgotFeedback}</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setForgotModalOpen(false)}>
              Fechar
            </Button>
            <Button type="submit" variant="primary">
              Enviar Link
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
