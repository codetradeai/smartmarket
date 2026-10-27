import { useState } from "react"
import { ProductImage } from "./ProductImage"
import { Button } from "./Button"

export function ProductDetailModal({
  product,
  markets = [],
  isOpen,
  onClose,
  onAddToList,
  isFavorite = false,
  onToggleFavorite,
}) {
  if (!isOpen || !product) return null

  // Calcular melhor preço entre os mercados
  const validPrices = markets
    .map((m) => {
      const p =
        product.prices?.[m.id] ??
        product.prices?.[m.id?.toString()] ??
        product.prices?.[m.name?.toLowerCase()] ??
        null
      return { market: m, price: p }
    })
    .filter((item) => item.price !== null && item.price !== undefined)

  validPrices.sort((a, b) => a.price - b.price)
  const bestOffer = validPrices.length > 0 ? validPrices[0] : null
  const highestOffer = validPrices.length > 1 ? validPrices[validPrices.length - 1] : null
  const maxEconomy = bestOffer && highestOffer ? (highestOffer.price - bestOffer.price) : 0

  const imageUrl =
    product.imagem_local ||
    product.imageLocal ||
    product.imagem_url ||
    product.imagemUrl ||
    (typeof product.image === "string" && product.image.startsWith("http") ? product.image : null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              {product.brand || "Marca Geral"}
            </span>
            {product.promo && (
              <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-500 text-white uppercase tracking-wider animate-pulse">
                Oferta RS
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors text-base font-bold"
          >
            ✕
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Foto HD do Produto */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex-shrink-0 flex items-center justify-center shadow-inner">
              <ProductImage
                src={imageUrl}
                alt={product.name || product.nome_bruto}
                className="w-full h-full"
                fallbackIcon={product.image || "🛒"}
              />
            </div>

            {/* Informações Principais */}
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {product.name || product.nome_bruto}
              </h2>

              <p className="text-xs text-slate-500 font-medium">
                {product.unit || "Unidade"} {product.category && `• Categoria: ${product.category}`}
              </p>

              {/* Box de Economia Máxima */}
              {maxEconomy > 0 && (
                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <div>
                      <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                        Economia nesta compra
                      </p>
                      <p className="text-xs text-emerald-700">
                        Comprando no <strong>{bestOffer.market.name}</strong> em vez de {highestOffer.market.name}
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-extrabold text-emerald-700">
                    - R$ {maxEconomy.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Descrição Detalhada */}
              {product.descricao || product.description ? (
                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <p className="font-semibold text-slate-700 mb-1">Especificações & Detalhes:</p>
                  <p>{product.descricao || product.description}</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Comparativo de Preços em Todas as Redes */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Comparativo de Preços nos Supermercados do RS</span>
              <span className="text-xs font-normal text-slate-500">Atualizado hoje</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {markets.map((m) => {
                const itemPrice =
                  product.prices?.[m.id] ??
                  product.prices?.[m.id?.toString()] ??
                  product.prices?.[m.name?.toLowerCase()] ??
                  null
                const isBest = bestOffer?.market?.id === m.id
                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isBest
                        ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-200/60"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.color || "#0D2137" }}
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {m.name}
                        </span>
                        {isBest && (
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                            ★ Melhor Preço
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {itemPrice !== null ? (
                        <span
                          className={`text-sm font-extrabold ${
                            isBest ? "text-emerald-700" : "text-slate-800"
                          }`}
                        >
                          R$ {Number(itemPrice).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          Indisponível
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Rodapé com Ações Rápidas */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => onToggleFavorite && onToggleFavorite(product.id)}
          >
            <span>{isFavorite ? "❤️" : "🤍"}</span>
            <span className="hidden sm:inline">
              {isFavorite ? "Salvo" : "Favoritar"}
            </span>
          </Button>

          <Button
            variant="primary"
            className="flex-1 flex items-center justify-center gap-2 py-3 shadow-md shadow-emerald-500/20"
            onClick={() => {
              if (onAddToList) onAddToList(product)
              onClose()
            }}
          >
            <span>🛒</span>
            <span>Adicionar à Lista de Compras</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
