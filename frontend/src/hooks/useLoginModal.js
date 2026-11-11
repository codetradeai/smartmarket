import { useContext } from "react"
import { LoginModalContext } from "../contexts/LoginModalContext"

/**
 * Acesso ao card de login em modal. Devolve null fora de um <LoginModalProvider>; quem usa deve cair
 * no link /auth?mode=login (ver LinkEntrar), assim componentes e testes isolados continuam funcionando.
 */
export function useLoginModal() {
  return useContext(LoginModalContext)
}

export default useLoginModal
