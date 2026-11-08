import { useEffect } from "react"

// Elementos que recebem foco pelo teclado dentro do diálogo.
const SELETOR_FOCAVEIS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

/**
 * Acessibilidade de foco para diálogos modais (role="dialog" aria-modal="true"):
 * - ao abrir, move o foco para o próprio contêiner (que precisa de tabIndex={-1}), de modo que o
 *   leitor de tela anuncie o nome do diálogo e o primeiro Tab caia no primeiro controle;
 * - prende o Tab/Shift+Tab dentro do contêiner;
 * - ao fechar (ou desmontar), devolve o foco ao elemento que o tinha antes de abrir.
 *
 * @param {boolean} ativo         diálogo aberto e com o contêiner montado
 * @param {{current: HTMLElement|null}} containerRef ref do contêiner do diálogo
 */
export function useFocoNoDialogo(ativo, containerRef) {
  useEffect(() => {
    if (!ativo) return undefined
    const container = containerRef.current
    if (!container) return undefined

    const origem = document.activeElement
    container.focus({ preventScroll: true })

    const aoPressionarTecla = (evento) => {
      if (evento.key !== "Tab") return

      const focaveis = Array.from(container.querySelectorAll(SELETOR_FOCAVEIS)).filter(
        (el) => !el.hidden && el.getAttribute("aria-hidden") !== "true"
      )
      if (focaveis.length === 0) {
        evento.preventDefault()
        container.focus({ preventScroll: true })
        return
      }

      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      const atual = document.activeElement

      // Foco fora do diálogo ou no próprio contêiner: entra pelo extremo correspondente.
      if (!container.contains(atual) || atual === container) {
        evento.preventDefault()
        ;(evento.shiftKey ? ultimo : primeiro).focus()
        return
      }
      if (evento.shiftKey && atual === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && atual === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener("keydown", aoPressionarTecla)
    return () => {
      document.removeEventListener("keydown", aoPressionarTecla)
      if (origem && typeof origem.focus === "function" && document.contains(origem)) {
        origem.focus({ preventScroll: true })
      }
    }
  }, [ativo, containerRef])
}
