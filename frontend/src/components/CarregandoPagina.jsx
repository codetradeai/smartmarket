/** Fallback do Suspense enquanto o chunk de uma rota é baixado. */
export default function CarregandoPagina() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-brand-bg">
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-4 border-brand-border border-t-brand-green"
      />
      <span className="sr-only">Carregando a página…</span>
    </div>
  )
}
