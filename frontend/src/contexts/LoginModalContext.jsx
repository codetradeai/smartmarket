import { createContext, useCallback, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import LoginDialogo from "../components/LoginDialogo"
import { importarCartaoLogin } from "../components/carregarCartaoLogin"

// eslint-disable-next-line react-refresh/only-export-components
export const LoginModalContext = createContext(null)

/**
 * Controla o card de login em modal. Precisa ficar dentro do Router (o card tem link para o cadastro e
 * o modal fecha sozinho quando a rota muda). A rota /auth continua existindo para o cadastro com CEP,
 * o ProtectedRoute e o redirecionamento de sessão expirada.
 */
export function LoginModalProvider({ children }) {
  // Guarda a rota em que o card foi aberto; ao navegar, o estado é zerado já no render (sem effect),
  // para o card não reaparecer se o usuário voltar à rota anterior.
  const [abertoEm, setAbertoEm] = useState(null)
  const { pathname } = useLocation()
  if (abertoEm !== null && abertoEm !== pathname) setAbertoEm(null)
  const aberto = abertoEm === pathname

  const abrirLogin = useCallback(() => setAbertoEm(pathname), [pathname])
  const fecharLogin = useCallback(() => setAbertoEm(null), [])
  // Baixa o corpo do card antes do clique (hover/foco no "Entrar"); falha de rede é ignorada aqui,
  // o Suspense tenta de novo quando o card abrir.
  const preCarregarLogin = useCallback(() => {
    importarCartaoLogin().catch(() => {})
  }, [])

  const valor = useMemo(
    () => ({ abrirLogin, fecharLogin, preCarregarLogin }),
    [abrirLogin, fecharLogin, preCarregarLogin]
  )

  return (
    <LoginModalContext.Provider value={valor}>
      {children}
      {aberto && <LoginDialogo onFechar={fecharLogin} />}
    </LoginModalContext.Provider>
  )
}

export default LoginModalProvider
