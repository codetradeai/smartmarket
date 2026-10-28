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
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 })
  const [viewMode, setViewMode] = useState("photo") // 'photo' | '360'

  // Reseta estado da galeria, zoom e modo ao trocar de produto
  useEffect(() => {
    setActiveImageIndex(0)
    setIsZoomed(false)
    setZoomOrigin({ x: 50, y: 50 })
    setViewMode("photo")
  }, [product?.id])

  // Fecha o modal com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isZoomed) {
          setIsZoomed(false)
          setZoomOrigin({ x: 50, y: 50 })
        } else if (isOpen) {
          onClose()
        }
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, isZoomed, onClose])

  // Manipuladores de Zoom In-Place (mexer na foto dentro do quadro e voltar ao centro)
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
    if (!isZoomed) setIsZoomed(true)
  }

  const handleMouseLeave = () => {
    setIsZoomed(false)
    setZoomOrigin({ x: 50, y: 50 })
  }

  const handleImageClick = () => {
    setIsZoomed((prev) => {
      if (prev) {
        setZoomOrigin({ x: 50, y: 50 })
      }
      return !prev
    })
  }

  const handleTouchMove = (e) => {
    if (!e.touches || e.touches.length === 0) return
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100
    setZoomOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
    setIsZoomed(true)
  }

  const handleTouchEnd = () => {
    setIsZoomed(false)
    setZoomOrigin({ x: 50, y: 50 })
  }

  // 1. Galeria com as imagens realmente disponíveis (prioriza as 4 fotos oficiais da embalagem)
  const galleryImages = useMemo(() => {
    if (!product) return []
    if (Array.isArray(product.imagensAdicionais) && product.imagensAdicionais.length > 0) {
      return product.imagensAdicionais
    }
    const list = []
    if (product.imageLocal || product.imagem_local) {
      list.push(product.imageLocal || product.imagem_local)
    }
    if (product.imageUrl || product.imagem_url) {
      const url = product.imageUrl || product.imagem_url
      if (!list.includes(url)) {
        list.push(url)
      }
    }
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
              
              {/* COLUNA ESQUERDA: Galeria Vertical com Botão 360° no Topo e Quadro Principal (6 colunas no desktop) */}
              <div className="md:col-span-6 space-y-3">
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  
                  {/* Coluna Vertical de Miniaturas (com botão 360° no topo) */}
                  <div className="flex sm:flex-col gap-2 shrink-0 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
                    {/* Botão de 360° no Topo da Coluna */}
                    {hasValid360 && (
                      <button
                        type="button"
                        onClick={() => setViewMode("360")}
                        aria-label="Giro 360°"
                        className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center p-1 transition-all cursor-pointer ${
                          viewMode === "360"
                            ? "border-red-500 ring-2 ring-red-500/20 bg-white shadow-xs"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                        title="Giro 360°"
                      >
                        <span className="text-[10px] font-black text-slate-800 leading-none">360°</span>
                        <svg
                          className="w-4.5 h-3 text-slate-700 mt-0.5"
                          viewBox="0 0 20 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6c0 2.5-3.6 4.5-8 4.5S2 8.5 2 6s3.6-4.5 8-4.5c2.8 0 5.2.8 6.6 2.1" />
                          <path d="M15 1.5l3.8 2.2-2.3 3.3" />
                        </svg>
                      </button>
                    )}

                    {/* 4 Miniaturas da Galeria (Frente, Lado Direito, Trás, Lado Esquerdo) */}
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveImageIndex(idx)
                          setViewMode("photo")
                        }}
                        className={`w-12 h-12 rounded-xl border p-1 bg-white shrink-0 overflow-hidden transition-all cursor-pointer ${
                          viewMode === "photo" && activeImageIndex === idx
                            ? "border-red-500 ring-2 ring-red-500/20 shadow-xs"
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

                  {/* Quadro Principal: Visualizador 360° ou Imagem Estática com Zoom In-Place */}
                  <div className="flex-1 w-full min-w-0">
                    {hasValid360 && viewMode === "360" ? (
                      <ProductViewer360
                        frames={product.recursosVisuais.frames}
                        alt={product.name || product.nome_bruto}
                      />
                    ) : (
                      <div
                        className="relative w-full aspect-square bg-[#f8f9fa] rounded-2xl p-4 border border-slate-200/90 flex items-center justify-center overflow-hidden select-none"
                        style={{ cursor: isZoomed ? "zoom-out" : "zoom-in" }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onClick={handleImageClick}
                        title={isZoomed ? "Clique para desativar zoom" : "Passe o mouse ou clique para ampliar detalhes"}
                      >
                        <div
                          className="w-full h-full flex items-center justify-center pointer-events-none"
                          style={{
                            transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                            transform: isZoomed ? "scale(2.2)" : "scale(1)",
                            transition: isZoomed
                              ? "transform 0.08s ease-out"
                              : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), transform-origin 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
                          }}
                        >
                          <ProductImage
                            src={activeImage}
                            alt={product.name || product.nome_bruto}
                            className="w-full h-full object-contain"
                            fallbackIcon={product.image || "📦"}
                          />
                        </div>

                        {/* Pílula / Badge 360° Flutuante no Canto Superior Direito (Parte 3) */}
                        {hasValid360 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setViewMode("360")
                            }}
                            className="absolute top-3 right-3 bg-white/95 hover:bg-white backdrop-blur-xs border border-slate-200/90 shadow-2xs rounded-full px-2.5 py-1 flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer z-10"
                            title="Abrir giro 360° do produto"
                            aria-label="Abrir visualização 360°"
                          >
                            <div className="w-4 h-4 rounded-xs bg-blue-600 flex items-center justify-center text-white shrink-0">
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                <path d="M16 21h5v-5" />
                              </svg>
                            </div>
                            <span className="text-[11px] font-bold text-slate-800 tracking-tight leading-none">360°</span>
                          </button>
                        ) : (
                          /* Indicador de Lupa para produtos comuns sem 360 */
                          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs text-slate-700 w-8 h-8 rounded-full border border-slate-200/80 shadow-2xs flex items-center justify-center text-xs pointer-events-none transition-opacity duration-200">
                            🔍
                          </div>
                        )}

                        {/* Indicador de Unidade */}
                        <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs text-slate-800 font-bold text-[11px] px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs pointer-events-none">
                          {product.unit || "1 un"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aviso oficial de direitos autorais das imagens 360° da OSuper Sistemas Ltda */}
                {hasValid360 && (
                  <div className="flex flex-row items-center gap-2 pt-1 px-1 text-slate-400">
                    <svg
                      className="w-4 h-4 shrink-0 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 9a3 3 0 100 6 3 3 0 000-6zm-7-3h2.18l1.45-2h6.74l1.45 2H19a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm7 11a5 5 0 100-10 5 5 0 000 10z" />
                    </svg>
                    <p className="text-[10px] leading-tight text-slate-400">
                      Proibida a cópia ou reprodução das imagens 360° do produto sem autorização da{" "}
                      <span className="font-bold text-slate-500">OSuper Sistemas Ltda</span>, detentora dos direitos.
                    </p>
                  </div>
                )}

                {/* Âncora de integração documentada */}
                <div
                  data-integration="product-viewer-360-anchor"
                  data-has-360={hasValid360 ? "true" : "false"}
                  className="hidden"
                />
              </div>

              {/* COLUNA DIREITA: Informações, Comparador e Ações (6 colunas no desktop) */}
              <div className="md:col-span-6 space-y-4">
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

    </>
  )
}

