import { useState, useMemo, useEffect } from "react"
import { ProductImage } from "./ProductImage"
import { Button } from "./Button"
import { ProductViewer360 } from "./ProductViewer360"

/**
 * ProductDetailModal - Fase 2 & 3: Detalhes do Produto Reutilizável Multi-rede com Suporte a 360°
 * 
 * Funcionalidades:
 * 1. Exibição de metadados reais: Nome, Marca, Unidade, Categoria e Código/SKU de origem.
 * 2. Galeria com imagens reais disponíveis e seleção de miniaturas.
 * 3. Modo de ampliação/zoom (LightBox modal) em alta resolução com tecla ESC.
 * 4. Comparativo de preços ordenado pelo menor preço válido, com identificação clara das 8 redes do RS.
 * 5. Comprovação real de condição promocional (preço normal vs efetivo).
 * 6. Acesso à página oficial da loja de origem com URL validada.
 * 7. Ponto de integração e visualizador 360° nativo (Fase 3B) sob demanda com rotação real autenticada.
 * 8. Layout responsivo para desktop e mobile.
 */
export function ProductDetailModal({
  product,
  markets = [],
  isOpen,
  onClose,
  onAddToList,
  isFavorite = false,
  onToggleFavorite,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const [viewMode, setViewMode] = useState("photo") // 'photo' | '360'

  // Reseta estado da galeria e modo de visualização ao trocar de produto
  useEffect(() => {
    setActiveImageIndex(0)
    setIsZoomOpen(false)
    setViewMode("photo")
  }, [product?.id])

  // Fecha o LightBox com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isZoomOpen) {
          setIsZoomOpen(false)
        } else if (isOpen) {
          onClose()
        }
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, isZoomOpen, onClose])

  // 1. Galeria com as imagens realmente disponíveis (sem inventar nem duplicar)
  const galleryImages = useMemo(() => {
    if (!product) return []
    const list = []
    
    // Imagem local de alta resolução (preferencial)
    if (product.imageLocal || product.imagem_local) {
      list.push(product.imageLocal || product.imagem_local)
    }
    // Imagem remota original da CDN da loja
    if (product.imageUrl || product.imagem_url) {
      const url = product.imageUrl || product.imagem_url
      if (!list.includes(url)) {
        list.push(url)
      }
    }
    // Imagens adicionais coletadas da origem (se existirem)
    if (Array.isArray(product.imagensAdicionais)) {
      product.imagensAdicionais.forEach((img) => {
        if (img && !list.includes(img)) list.push(img)
      })
    }
    // Fallback de URL genérica se for string http
    if (typeof product.image === "string" && product.image.startsWith("http") && !list.includes(product.image)) {
      list.push(product.image)
    }

    return list
  }, [product])

  const activeImage = galleryImages[activeImageIndex] || galleryImages[0] || null

  // Validação estrita de rotação 360° (somente com sequência fotográfica real com 2+ quadros)
  const hasValid360 = Boolean(
    product?.recursosVisuais?.has360 &&
    Array.isArray(product?.recursosVisuais?.frames) &&
    product.recursosVisuais.frames.length >= 2
  )

  // 2. Preços ordenados estritamente pelo menor preço válido
  const { validPrices, unavailableMarkets, bestOffer, highestOffer, maxEconomy } = useMemo(() => {
    if (!product || !markets.length) {
      return { validPrices: [], unavailableMarkets: [], bestOffer: null, highestOffer: null, maxEconomy: 0 }
    }

    const valids = []
    const unavails = []

    markets.forEach((m) => {
      const p =
        product.prices?.[m.id] ??
        product.prices?.[m.id?.toString()] ??
        product.prices?.[m.name?.toLowerCase()] ??
        null

      if (p !== null && p !== undefined && Number(p) > 0) {
        valids.push({ market: m, price: Number(p) })
      } else {
        unavails.push(m)
      }
    })

    // Ordenação estrita pelo menor preço
    valids.sort((a, b) => a.price - b.price)

    const best = valids.length > 0 ? valids[0] : null
    const highest = valids.length > 1 ? valids[valids.length - 1] : null
    const economy = best && highest ? highest.price - best.price : 0

    return {
      validPrices: valids,
      unavailableMarkets: unavails,
      bestOffer: best,
      highestOffer: highest,
      maxEconomy: economy,
    }
  }, [product, markets])

  // 3. Comprovação real da condição promocional
  const promoVerification = useMemo(() => {
    if (!product || !bestOffer) return null
    const precoNormal = Number(product.precoNormal || product.preco_normal || 0)
    const precoAtual = bestOffer.price

    // Só é promoção comprovada se o preço normal for maior que o preço atual
    if (product.promo && precoNormal > precoAtual) {
      const descontoPerc = Math.round(((precoNormal - precoAtual) / precoNormal) * 100)
      const economiaPromo = precoNormal - precoAtual
      return {
        comprovada: true,
        precoNormal,
        precoAtual,
        descontoPerc,
        economiaPromo,
      }
    }

    return { comprovada: false }
  }, [product, bestOffer])

  if (!isOpen || !product) return null

  // Validação de URL oficial do produto
  const urlOficialValida =
    product.urlProduto ||
    product.url_produto ||
    (typeof product.url === "string" && product.url.startsWith("http") ? product.url : null)

  const codigoIdentificador = product.idOrigem || product.codigo_barras || product.codigoBarras || product.ean || null

  return (
    <>
      {/* Modal Principal de Detalhes */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Cabeçalho Superior com Metadados e Ações */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                {product.brand || "Marca Geral"}
              </span>

              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 capitalize">
                {product.category || "Mercearia"}
              </span>

              {codigoIdentificador && (
                <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-slate-100 text-slate-600 border border-slate-200" title="Código / SKU de origem">
                  SKU #{codigoIdentificador}
                </span>
              )}

              {promoVerification?.comprovada && (
                <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-rose-600 text-white uppercase tracking-wider shadow-xs animate-pulse">
                  Oferta -{promoVerification.descontoPerc}%
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors text-base font-bold border border-slate-200/70 shadow-xs cursor-pointer"
              title="Fechar (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Corpo do Modal com Scroll e Grid Responsivo */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* COLUNA ESQUERDA: Galeria de Imagens & Visualizador 360° (5 colunas no desktop) */}
              <div className="md:col-span-5 space-y-3">
                {/* Seletor de Modo (Apenas exibido quando o produto possui rotação 360° com 2+ quadros reais) */}
                {hasValid360 && (
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setViewMode("photo")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === "photo"
                          ? "bg-white text-slate-800 shadow-2xs border border-slate-200/80"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      🖼️ Fotos ({galleryImages.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("360")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === "360"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      🔄 Giro 360°
                    </button>
                  </div>
                )}

                {/* Exibição: Modo 360° ou Galeria Convencional de Fotos */}
                {hasValid360 && viewMode === "360" ? (
                  <ProductViewer360
                    frames={product.recursosVisuais.frames}
                    alt={product.name || product.nome_bruto}
                  />
                ) : (
                  <>
                    {/* Imagem Principal em Destaque */}
                    <div
                      className="relative w-full aspect-square bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex items-center justify-center overflow-hidden group cursor-zoom-in shadow-inner"
                      onClick={() => activeImage && setIsZoomOpen(true)}
                      title="Clique para ampliar em alta resolução"
                    >
                      <ProductImage
                        src={activeImage}
                        alt={product.name || product.nome_bruto}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        fallbackIcon={product.image || "📦"}
                      />

                      {/* Botão de Lupa Sobreposto */}
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs text-slate-700 p-2 rounded-xl border border-slate-200/80 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs font-semibold">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6" />
                          <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                        <span>Ampliar</span>
                      </div>

                      {/* Indicador de Unidade */}
                      <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-slate-800 font-bold text-[11px] px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        {product.unit || "1 un"}
                      </span>
                    </div>

                    {/* Miniaturas da Galeria (apenas imagens reais disponíveis) */}
                    {galleryImages.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        {galleryImages.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImageIndex(idx)}
                            className={`w-14 h-14 rounded-xl border-2 p-1 bg-white shrink-0 overflow-hidden transition-all cursor-pointer ${
                              activeImageIndex === idx
                                ? "border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs scale-105"
                                : "border-slate-200 opacity-70 hover:opacity-100"
                            }`}
                            title={`Ver imagem ${idx + 1}`}
                          >
                            <ProductImage
                              src={img}
                              alt={`Miniatura ${idx + 1}`}
                              className="w-full h-full object-contain"
                              fallbackIcon="📦"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* 
                  PONTO DE INTEGRAÇÃO FASE 3: Visualizador 360° / Modelos 3D
                  Este nó serve de âncora arquitetural para o runtime 360º nativo.
                */}
                <div
                  data-integration="product-viewer-360-anchor"
                  data-has-360={hasValid360 ? "true" : "false"}
                  className="p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-center"
                >
                  <p className="text-[11px] text-slate-500 font-medium">
                    {hasValid360
                      ? `🔄 Visualização 360° ativa (${product.recursosVisuais.frames.length} quadros autenticados)`
                      : "🔄 Visualização 360°: aguardando sequência fotográfica autenticada da rede"}
                  </p>
                </div>
              </div>

              {/* COLUNA DIREITA: Informações, Comparador e Ações (7 colunas no desktop) */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                    {product.name || product.nome_bruto}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {product.brand && `Marca: ${product.brand} • `}
                    {product.unit && `Embalagem: ${product.unit} • `}
                    {product.supermercadoOrigem && `Coletado em: ${product.supermercadoOrigem}`}
                  </p>
                </div>

                {/* Box de Economia Máxima & Preço Comprovado */}
                {bestOffer && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/80 space-y-2">
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                          Melhor Preço do RS
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-3xl font-black text-emerald-700">
                            R$ {bestOffer.price.toFixed(2)}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            no {bestOffer.market.name}
                          </span>
                        </div>
                      </div>

                      {/* Comprovação de Promoção Real */}
                      {promoVerification?.comprovada && (
                        <div className="text-right">
                          <span className="text-xs text-slate-400 line-through block font-medium">
                            De R$ {promoVerification.precoNormal.toFixed(2)}
                          </span>
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Economia de R$ {promoVerification.economiaPromo.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Economia entre Redes */}
                    {maxEconomy > 0 && highestOffer && (
                      <p className="text-xs text-emerald-800 font-medium pt-1 border-t border-emerald-200/60">
                        💰 <strong>Economize até R$ {maxEconomy.toFixed(2)}</strong> comprando no <strong>{bestOffer.market.name}</strong> em vez do {highestOffer.market.name}.
                      </p>
                    )}
                  </div>
                )}

                {/* Descrição Detalhada / Especificações */}
                {product.descricao && (
                  <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                    <p className="font-bold text-slate-800 mb-1">Especificações do Produto:</p>
                    <p>{product.descricao}</p>
                  </div>
                )}

                {/* Link Confiável para a Página Oficial da Loja */}
                {urlOficialValida && (
                  <div className="pt-1">
                    <a
                      href={urlOficialValida}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-300 transition-colors shadow-2xs"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M12 8.667v4.666a1.333 1.333 0 01-1.333 1.334H3.333A1.333 1.333 0 012 13.333V6a1.333 1.333 0 011.333-1.333h4.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 2h4v4M6.667 9.333L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Ver produto na loja oficial {product.supermercadoOrigem ? `(${product.supermercadoOrigem})` : ""} &rarr;</span>
                    </a>
                  </div>
                )}

                {/* Comparativo de Preços nos Supermercados do RS (Ordenado do Menor para o Maior) */}
                <div className="space-y-2.5 pt-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                    <span>Preços por Supermercado (Ordenado por Menor Preço)</span>
                    <span className="text-[11px] font-normal text-slate-500">8 redes monitoradas</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Redes com Preço Válido Ordenadas */}
                    {validPrices.map((item, idx) => {
                      const isBest = idx === 0
                      return (
                        <div
                          key={item.market.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                            isBest
                              ? "bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-200/80 shadow-2xs"
                              : "bg-white border-slate-200/90 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: item.market.color || "#0D2137" }}
                            />
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-900 block truncate">
                                {item.market.name}
                              </span>
                              {isBest ? (
                                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">
                                  ★ Menor Preço
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-medium">
                                  +{((item.price - bestOffer.price) / bestOffer.price * 100).toFixed(0)}% vs melhor
                                </span>
                              )}
                            </div>
                          </div>

                          <span className={`text-sm font-black whitespace-nowrap pl-2 ${
                            isBest ? "text-emerald-700 text-base" : "text-slate-800"
                          }`}>
                            R$ {item.price.toFixed(2)}
                          </span>
                        </div>
                      )
                    })}

                    {/* Redes Indisponíveis / Sem Cotação */}
                    {unavailableMarkets.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between opacity-60"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-300"
                          />
                          <span className="text-xs text-slate-500 font-medium truncate">
                            {m.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium italic">
                          Indisponível
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Rodapé Fixo de Ações */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer"
              onClick={() => onToggleFavorite && onToggleFavorite(product.id)}
              title={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
            >
              <span>{isFavorite ? "❤️" : "🤍"}</span>
              <span className="hidden sm:inline font-bold text-xs text-slate-700">
                {isFavorite ? "Salvo" : "Favoritar"}
              </span>
            </Button>

            <Button
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
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

      {/* MODAL DE ZOOM / LIGHTBOX EM TELA CHEIA */}
      {isZoomOpen && activeImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão de Fechar Zoom */}
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="absolute -top-12 right-0 sm:right-2 w-10 h-10 rounded-full bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors text-lg font-bold cursor-pointer"
              title="Fechar ampliação (Esc)"
            >
              ✕
            </button>

            {/* Imagem Ampliada em Alta Resolução */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-2xl max-h-[80vh] flex items-center justify-center overflow-hidden">
              <img
                src={activeImage}
                alt={product.name || product.nome_bruto}
                className="max-w-full max-h-[70vh] object-contain select-none"
              />
            </div>

            <p className="text-white/80 text-xs font-semibold mt-3 text-center">
              {product.name} {product.unit && `(${product.unit})`}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

