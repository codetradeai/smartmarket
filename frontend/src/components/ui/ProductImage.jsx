import { useState } from "react"

/**
 * Componente resiliente para exibição de imagens de produtos.
 * Suporta imagens locais (/images/produtos/...), URLs remotas em alta resolução (CDN)
 * e fallback elegante em caso de falha de carregamento ou ausência.
 */
export function ProductImage({
  src,
  alt = "Produto",
  className = "",
  fallbackIcon = "🛒",
  aspectRatio = "square", // 'square', 'video', 'auto'
}) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const isLocalOrRemote = src && typeof src === "string" && (
    src.startsWith("/") ||
    src.startsWith("http://") ||
    src.startsWith("https://")
  )

  if (!src || hasError || !isLocalOrRemote) {
    return (
      <div
        className={`bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-center text-slate-400 select-none overflow-hidden ${className}`}
        title={alt}
      >
        <span className="text-2xl filter drop-shadow-xs transition-transform duration-300 group-hover:scale-110">
          {fallbackIcon}
        </span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-white rounded-xl flex items-center justify-center ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
        className={`w-full h-full object-contain p-2 transition-all duration-300 group-hover:scale-105 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  )
}
