import { useProdutos } from "../hooks/useProdutos"

/** Estado de carregamento visível do catálogo (o chunk do data.js é grande). */
export function CatalogoCarregando({ className = "" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 py-24 text-center ${className}`}
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-4 border-brand-border border-t-brand-green"
      />
      <p className="text-sm font-bold text-brand-navy">Carregando o catálogo…</p>
      <p className="text-xs text-brand-muted">Estamos baixando os produtos e preços. Isso leva alguns segundos.</p>
    </div>
  )
}

/** Falha ao carregar o catálogo, com nova tentativa. */
export function CatalogoErro({ onTentarNovamente, className = "" }) {
  return (
    <div role="alert" className={`mx-auto max-w-md space-y-3 py-20 text-center ${className}`}>
      <p className="text-base font-extrabold text-brand-navy">Não foi possível carregar o catálogo</p>
      <p className="text-xs text-brand-muted">Verifique a conexão e tente de novo.</p>
      <button type="button" onClick={onTentarNovamente} className="sm-cta justify-center">
        Tentar novamente
      </button>
    </div>
  )
}

/**
 * Carrega o catálogo (import dinâmico do data.js) e só então renderiza `children(produtos)`.
 * Mostra carregamento e erro com nova tentativa.
 */
export default function ComCatalogo({ children }) {
  const { produtos, carregando, erro, recarregar } = useProdutos()
  if (erro) return <CatalogoErro onTentarNovamente={recarregar} />
  if (carregando || !produtos) return <CatalogoCarregando />
  return children(produtos)
}
