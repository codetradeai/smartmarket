import { useServidorAcordando } from "../../hooks/useServidorAcordando"

/**
 * Aviso discreto de "servidor acordando": aparece quando uma chamada à API passa de 8 s sem resposta
 * (o backend do plano Free hiberna e leva alguns minutos para voltar) e some quando ela termina.
 * Não renderiza nada no resto do tempo, então não ocupa espaço no layout.
 */
export default function AvisoServidorAcordando({ className = "" }) {
  const acordando = useServidorAcordando()
  if (!acordando) return null

  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800 ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700 motion-reduce:animate-none"
      />
      <span>O servidor estava dormindo e está acordando; pode levar alguns minutos.</span>
    </p>
  )
}
