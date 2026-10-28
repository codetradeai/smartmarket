import { useState, useEffect, useRef, useCallback } from "react"
import { ProductImage } from "./ProductImage"

/**
 * Product360HoverPreview - Componente de Pré-visualização Automática 360° em Cards
 * 
 * Funcionalidades:
 * 1. Ao passar o mouse sobre o card de um produto com rotação 360° autêntica,
 *    inicia rotação suave e contínua dos quadros reais.
 * 2. Ao retirar o mouse, cancela imediatamente a animação e retorna ao quadro frontal (frame 0).
 * 3. Respeita a preferência do usuário prefers-reduced-motion (sem animação se ativado).
 * 4. Carrega os quadros sob demanda com debounce de intenção para poupar rede e CPU.
 * 5. Não interfere em eventos de clique (abre o modal de detalhes normalmente).
 * 6. Para produtos sem 360°, renderiza a imagem estática convencional sem overhead.
 * 7. Libera timers e listeners com segurança na desmontagem.
 */
export function Product360HoverPreview({
  product,
  alt = "Produto",
  className = "",
  fallbackIcon = "📦",
  fps = 6, // ~160ms por quadro para rotação contemplativa e suave
  isCardHovered = false, // controle opcional via card pai
}) {
  const frames = product?.recursosVisuais?.frames || []
  const has360 = Boolean(
    product?.recursosVisuais?.has360 &&
    Array.isArray(frames) &&
    frames.length >= 2
  )

  const [currentFrame, setCurrentFrame] = useState(0)
  const [isInternalHover, setIsInternalHover] = useState(false)
  const isHovered = isCardHovered || isInternalHover

  const timerRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const totalFrames = frames.length

  // Obtém imagem estática inicial para produtos sem 360 ou antes do hover
  const staticSrc =
    product?.imageLocal ||
    product?.imagem_local ||
    product?.imageUrl ||
    product?.imagem_url ||
    (typeof product?.image === "string" && product?.image.startsWith("http")
      ? product?.image
      : null)

  // 1. Controle da rotação no hover
  useEffect(() => {
    if (!has360 || totalFrames < 2) return

    // Respeita preferência por redução de movimento
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      setCurrentFrame(0)
      return
    }

    if (isHovered) {
      // Debounce sutil de 80ms para evitar disparar a animação se o cursor apenas passar rápido
      debounceTimerRef.current = setTimeout(() => {
        const intervalMs = Math.round(1000 / fps)
        timerRef.current = setInterval(() => {
          setCurrentFrame((prev) => (prev + 1) % totalFrames)
        }, intervalMs)
      }, 80)
    } else {
      // Para a animação e reseta imediatamente para o quadro frontal 0
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      setCurrentFrame(0)
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isHovered, has360, totalFrames, fps])

  // Se o produto não possuir 360° autêntico, exibe a imagem convencional da galeria
  if (!has360) {
    return (
      <ProductImage
        src={staticSrc}
        alt={alt}
        className={className}
        fallbackIcon={fallbackIcon}
      />
    )
  }

  const activeSrc = frames[currentFrame] || staticSrc

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}
      onMouseEnter={() => setIsInternalHover(true)}
      onMouseLeave={() => setIsInternalHover(false)}
      data-testid="product-360-hover-preview"
      data-active-frame={currentFrame}
      data-is-hovering={isHovered ? "true" : "false"}
    >
      <img
        src={activeSrc}
        alt={alt}
        draggable={false}
        className="w-full h-full object-contain p-2 transition-transform duration-200 group-hover:scale-105 pointer-events-none"
      />

      {/* Símbolo Oficial de 360° no Canto Superior Esquerdo (Estilo Oficial Asun) */}
      <div
        className={`absolute top-2 left-2 w-8 h-8 rounded-lg border shadow-2xs flex flex-col items-center justify-center p-0.5 transition-all pointer-events-none z-10 ${
          isHovered
            ? "bg-white border-slate-300 shadow-xs scale-105"
            : "bg-slate-100/95 backdrop-blur-xs border-slate-200/90"
        }`}
        title="Produto com rotação 360° disponível"
      >
        <span className="text-[9px] font-black text-slate-800 leading-none">360°</span>
        <svg
          className={`w-3.5 h-2.5 text-slate-800 mt-0.5 transition-transform duration-300 ${
            isHovered ? "rotate-[-20deg]" : ""
          }`}
          viewBox="0 0 20 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6c0 2.5-3.6 4.5-8 4.5S2 8.5 2 6s3.6-4.5 8-4.5c2.8 0 5.2.8 6.6 2.1" />
          <path d="M15 1.5l3.8 2.2-2.3 3.3" />
        </svg>
      </div>
    </div>
  )
}
