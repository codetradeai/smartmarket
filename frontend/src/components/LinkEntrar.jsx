import { Link } from "react-router-dom"
import { useLoginModal } from "../hooks/useLoginModal"

/**
 * Link "Entrar": abre o card de login em modal sobre a página atual. Continua sendo um <a> para
 * /auth?mode=login, então Ctrl/Cmd+clique, botão do meio e o uso fora do provider levam à página de login.
 * Passar o mouse ou focar no link já baixa o corpo do card, para ele abrir sem espera.
 */
export default function LinkEntrar({ onClick, children, ...props }) {
  const loginModal = useLoginModal()

  const aoClicar = (evento) => {
    onClick?.(evento)
    const modificado = evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey
    if (!loginModal || evento.defaultPrevented || evento.button !== 0 || modificado) return
    evento.preventDefault()
    loginModal.abrirLogin()
  }

  return (
    <Link
      to="/auth?mode=login"
      {...props}
      onClick={aoClicar}
      onMouseEnter={loginModal?.preCarregarLogin}
      onFocus={loginModal?.preCarregarLogin}
      onTouchStart={loginModal?.preCarregarLogin}
    >
      {children}
    </Link>
  )
}
