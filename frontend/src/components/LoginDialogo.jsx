import { Suspense, lazy, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { ShoppingCart, X } from "lucide-react"
import { useFocoNoDialogo } from "../hooks/useFocoNoDialogo"
import { importarCartaoLogin } from "./carregarCartaoLogin"

// O corpo do card (título, formulário, colunas) é baixado sob demanda; o casco abaixo fica no bundle
// inicial e é pequeno de propósito: overlay, cabeçalho e botão de fechar.
const CartaoLogin = lazy(importarCartaoLogin)

// Altura reservada para o esqueleto e para o card carregado: o diálogo não "pula" quando o chunk chega.
// 46.625rem (746px) é a altura natural do card em telas largas (3 colunas), medida no navegador; o min()
// com o viewport evita que a reserva passe do espaço disponível em telas baixas, onde o card rola por
// dentro (max-h abaixo). Se o conteúdo do card mudar de tamanho, reajuste este valor.
const ALTURA_MINIMA = "min-h-[min(46.625rem,calc(100dvh-2rem))]"

function EsqueletoCartao() {
  return (
    <div aria-hidden="true" data-testid="login-esqueleto" className="flex-1">
      <div className="px-6 pb-7 pt-8 sm:px-10 sm:pt-10 sm:pb-8">
        <div className="h-9 w-4/5 animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-3 h-9 w-3/5 animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-5 h-4 w-full max-w-md animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 max-w-md space-y-3">
          <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
      <div className="h-px w-full bg-slate-100" />
      <div className="h-40 bg-slate-50 sm:h-32" />
    </div>
  )
}

/**
 * Casco do login em modal: overlay de cor sólida (sem backdrop-filter), cartão com uma sombra só e
 * animação apenas de opacity/transform (ver .sm-login-* no index.css). Foco preso, ESC, clique fora e
 * devolução do foco ao botão de origem vêm do `useFocoNoDialogo`, o mesmo do `Modal` do design system.
 */
export default function LoginDialogo({ onFechar }) {
  const dialogoRef = useRef(null)
  useFocoNoDialogo(true, dialogoRef)

  useEffect(() => {
    const aoPressionarTecla = (evento) => {
      if (evento.key === "Escape") onFechar()
    }
    const overflowAnterior = document.body.style.overflow
    document.addEventListener("keydown", aoPressionarTecla)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", aoPressionarTecla)
      document.body.style.overflow = overflowAnterior
    }
  }, [onFechar])

  // mousedown (e não click): arrastar para selecionar texto do campo e soltar fora não fecha o card.
  const aoClicarNoFundo = (evento) => {
    if (evento.target === evento.currentTarget) onFechar()
  }

  return createPortal(
    <div
      ref={dialogoRef}
      role="dialog"
      aria-modal="true"
      aria-label="Entrar no SmartMarket"
      tabIndex={-1}
      onMouseDown={aoClicarNoFundo}
      className="sm-login-overlay fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/60 p-4 outline-none"
    >
      <div
        className={`sm-login-card relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[34rem] flex-col overflow-y-auto rounded-[28px] bg-white shadow-[0_24px_48px_-16px_rgba(13,33,55,0.3)] ${ALTURA_MINIMA}`}
      >
        <div className="flex items-center justify-between px-6 pt-6 sm:px-8 sm:pt-8">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100">
              <ShoppingCart size={16} className="text-slate-600" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-brand-navy">SmartMarket</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Supermercados do RS
            </span>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <Suspense fallback={<EsqueletoCartao />}>
          <CartaoLogin onFechar={onFechar} />
        </Suspense>
      </div>
    </div>,
    document.body
  )
}
