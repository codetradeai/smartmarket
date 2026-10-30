import React from "react"
import { cn } from "../../lib/utils"

/**
 * SmartMarketLogo - Componente oficial de logotipo e símbolo da marca SmartMarket
 * Baseado rigorosamente no Brand Guide oficial (Figma Friendly Consumer & Brand Guide)
 * Cores oficiais:
 * - Índigo Escuro / Navy: #0D2137 / #1E1B4B
 * - Verde Menta / Emerald: #00E5A3 / #22A95E
 */
export function SmartMarketLogo({
  variant = "full", // "full" | "icon" | "app-badge"
  size = "md", // "sm" | "md" | "lg"
  showTagline = false,
  className = "",
  animateOnHover = true,
}) {
  // Tamanhos de ícone
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  }

  // Tamanhos de texto
  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl sm:text-3xl",
  }

  // Ícone em formato de App Badge do Brand Guide (Squircle escuro com carrinho e seta menta)
  if (variant === "app-badge") {
    return (
      <div
        className={cn(
          "rounded-2xl bg-[#0D2137] p-2.5 flex items-center justify-center shadow-md shadow-brand-navy/20 transition-transform",
          animateOnHover && "hover:scale-105",
          iconSizes[size] || iconSizes.md,
          className
        )}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Cesto formando 'S' em curva contínua */}
          <path
            d="M 18 24 L 28 24 L 38 60 L 78 60 C 82 60 84 57 84 53 L 84 45 C 84 41 81 38 77 38 L 44 38 C 39 38 35 42 35 47 C 35 52 39 56 44 56 L 68 56"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Seta Verde Menta de Economia para baixo */}
          <path
            d="M 62 30 L 78 30 L 78 44 L 86 44 L 70 60 L 54 44 L 62 44 Z"
            fill="#00E5A3"
          />
          {/* Rodas do carrinho */}
          <circle cx="42" cy="74" r="6" fill="#FFFFFF" />
          <circle cx="74" cy="74" r="6" fill="#FFFFFF" />
        </svg>
      </div>
    )
  }

  // Ícone SVG padrão sobre fundo transparente
  const SvgSymbol = (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0",
        iconSizes[size] || iconSizes.md,
        animateOnHover && "group-hover:scale-105 transition-transform"
      )}
    >
      <svg
        viewBox="0 0 100 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        {/* Curva contínua do carrinho em Índigo Escuro #0D2137 */}
        <path
          d="M 12 18 L 24 18 L 34 56 L 78 56 C 82 56 85 53 85 49 L 85 41 C 85 37 82 34 78 34 L 42 34 C 36 34 32 39 32 45 C 32 51 36 56 42 56 L 68 56"
          stroke="#0D2137"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Seta Verde Menta / Emerald de Economia (indicando queda de preço) */}
        <path
          d="M 64 24 L 78 24 L 78 38 L 86 38 L 71 54 L 56 38 L 64 38 Z"
          fill="#00C853"
        />
        {/* Rodinhas em Índigo */}
        <circle cx="38" cy="72" r="6.5" fill="#0D2137" />
        <circle cx="74" cy="72" r="6.5" fill="#0D2137" />
      </svg>
    </div>
  )

  if (variant === "icon") {
    return SvgSymbol
  }

  // Logo Completo (Símbolo + Tipografia Oficial)
  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      {SvgSymbol}
      <div className="flex flex-col">
        <span
          className={cn(
            "font-extrabold tracking-tight leading-none text-brand-navy flex items-center",
            textSizes[size] || textSizes.md
          )}
        >
          Smart<span className="text-brand-green">Market</span>
        </span>
        {showTagline ? (
          <span className="text-[10px] sm:text-xs font-medium text-brand-muted mt-1 tracking-tight">
            Compare preços. Economize de verdade.
          </span>
        ) : (
          <span className="text-[9px] font-bold tracking-widest text-brand-muted uppercase mt-0.5">
            RS • Radar de Economia
          </span>
        )}
      </div>
    </div>
  )
}

export default SmartMarketLogo
