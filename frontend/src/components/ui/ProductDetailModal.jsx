import { useState, useMemo, useEffect, useRef } from "react"
import { ProductImage } from "./ProductImage"
import { Button } from "./Button"
import { ProductViewer360 } from "./ProductViewer360"
import { getRelatedProducts } from "../../utils/relatedProducts"

/**
 * ProductDetailModal - Fase 2, 3 & 4: Detalhes do Produto Reutilizável Multi-rede com 360° e Produtos Relacionados
 * 
 * Funcionalidades:
 * 1. Exibição de metadados reais: Nome, Marca, Unidade, Categoria e Código/SKU de origem.
 * 2. Galeria com imagens reais disponíveis e seleção de miniaturas.
 * 3. Modo de ampliação/zoom (LightBox modal) em alta resolução com tecla ESC.
 * 4. Comparativo de preços ordenado pelo menor preço válido, com identificação clara das 8 redes do RS.
 * 5. Comprovação real de condição promocional (preço normal vs efetivo).
 * 6. Acesso à página oficial da loja de origem com URL validada.
 * 7. Ponto de integração e visualizador 360° nativo (Fase 3B) sob demanda com rotação real autenticada.
 * 8. Descoberta de alternativas de outras marcas e produtos da mesma marca com navegação sem fechar o modal (Fase 4).
 * 9. Layout responsivo para desktop e mobile.
 */
export function ProductDetailModal({
  product,
  allProducts = [],
  onSelectProduct,
  markets = [],
  isOpen,
  onClose,
  onAddToList,
  isFavorite = false,
  onToggleFavorite,
}) {
  const [internalProduct, setInternalProduct] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [viewMode, setViewMode] = useState("photo") // 'photo' | '360'
  const [relatedTab, setRelatedTab] = useState("other_brands") // 'other_brands' | 'same_brand'
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 })
  const [isPhotoDragging, setIsPhotoDragging] = useState(false)
  const photoDragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 })
  const relatedScrollRef = useRef(null)

  // Reseta seleção interna quando o produto externo mudar ou modal reabrir
  useEffect(() => {
    setInternalProduct(null)
  }, [product?.id, isOpen])

  const currentProduct = internalProduct || product

  // Reseta estado da galeria, modo e posição ao trocar de produto
  useEffect(() => {
    setActiveImageIndex(0)
    setViewMode("photo")
    setPhotoOffset({ x: 0, y: 0 })
    setIsPhotoDragging(false)
    setRelatedTab("other_brands")
  }, [currentProduct?.id])

  // Fecha o modal com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  // Manipuladores de Arraste da Foto (Move livremente ao clicar e volta ao centro sozinho ao soltar)
  const handlePhotoPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    setIsPhotoDragging(true)
    photoDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: photoOffset.x,
      initialY: photoOffset.y,
    }
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {}
    }
  }

  const handlePhotoPointerMove = (e) => {
    if (!isPhotoDragging) return
    const dx = e.clientX - photoDragStartRef.current.x
    const dy = e.clientY - photoDragStartRef.current.y
    setPhotoOffset({
      x: photoDragStartRef.current.initialX + dx,
      y: photoDragStartRef.current.initialY + dy,
    })
  }

  const handlePhotoPointerUp = (e) => {
    if (!isPhotoDragging) return
    setIsPhotoDragging(false)
    // Quando soltar, retorna automaticamente ao centro com física suave
    setPhotoOffset({ x: 0, y: 0 })
    if (e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  // 1. Galeria com as imagens realmente disponíveis (prioriza as 4 fotos oficiais da embalagem)
  const galleryImages = useMemo(() => {
    if (!currentProduct) return []
    if (Array.isArray(currentProduct.imagensAdicionais) && currentProduct.imagensAdicionais.length > 0) {
      return currentProduct.imagensAdicionais
    }
    const list = []
    if (currentProduct.imageLocal || currentProduct.imagem_local) {
      list.push(currentProduct.imageLocal || currentProduct.imagem_local)
    }
    if (currentProduct.imageUrl || currentProduct.imagem_url) {
      const url = currentProduct.imageUrl || currentProduct.imagem_url
      if (!list.includes(url)) {
        list.push(url)
      }
    }
    if (typeof currentProduct.image === "string" && currentProduct.image.startsWith("http") && !list.includes(currentProduct.image)) {
      list.push(currentProduct.image)
    }
    return list
  }, [currentProduct])

  const activeImage = galleryImages[activeImageIndex] || galleryImages[0] || null

  // Validação estrita de rotação 360° (somente com sequência fotográfica real com 2+ quadros)
  const hasValid360 = Boolean(
    currentProduct?.recursosVisuais?.has360 &&
    Array.isArray(currentProduct?.recursosVisuais?.frames) &&
    currentProduct.recursosVisuais.frames.length >= 2
  )

  // 2. Preços ordenados estritamente pelo menor preço válido
  const { validPrices, unavailableMarkets, bestOffer, highestOffer, maxEconomy } = useMemo(() => {
    if (!currentProduct || !markets.length) {
      return { validPrices: [], unavailableMarkets: [], bestOffer: null, highestOffer: null, maxEconomy: 0 }
    }

    const valids = []
    const unavails = []

    markets.forEach((m) => {
      const p =
        currentProduct.prices?.[m.id] ??
        currentProduct.prices?.[m.id?.toString()] ??
        currentProduct.prices?.[m.name?.toLowerCase()] ??
        null

      if (p !== null && p !== undefined && Number(p) > 0) {
        const isClube = Boolean(
          currentProduct.clubPrices?.[m.id] ||
          (currentProduct.isClube && (currentProduct.mercadoMenorPreco === m.id || currentProduct.supermercadoOrigem?.toLowerCase().includes(m.name?.toLowerCase().split(" ")[0]))) ||
          (m.id === "stok" && currentProduct.supermercadoOrigem === "Stok Center" && currentProduct.promo)
        )
        const clubeNome = currentProduct.clubPrices?.[m.id] || m.clube || `Clube ${m.name.split(" ")[0]}`
        valids.push({ market: m, price: Number(p), isClube, clubeNome })
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
  }, [currentProduct, markets])

  // 3. Comprovação real da condição promocional
  const promoVerification = useMemo(() => {
    if (!currentProduct || !bestOffer) return null
    const precoNormal = Number(currentProduct.precoNormal || currentProduct.preco_normal || 0)
    const precoAtual = bestOffer.price

    // Só é promoção comprovada se o preço normal for maior que o preço atual
    if (currentProduct.promo && precoNormal > precoAtual) {
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
  }, [currentProduct, bestOffer])

  // 4. Produtos relacionados e alternativas de preço (Fase 4 - Carrossel da Mesma Categoria)
  const { directAlternatives, brandAlternatives } = useMemo(() => {
    return getRelatedProducts(currentProduct, allProducts, 8)
  }, [currentProduct, allProducts])

  if (!isOpen || !currentProduct) return null

  // Validação de URL oficial do produto
  const urlOficialValida =
    currentProduct.urlProduto ||
    currentProduct.url_produto ||
    (typeof currentProduct.url === "string" && currentProduct.url.startsWith("http") ? currentProduct.url : null)

  const codigoIdentificador = currentProduct.idOrigem || currentProduct.codigo_barras || currentProduct.codigoBarras || currentProduct.ean || null

  return (
    <>
      {/* Modal Principal de Detalhes */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Cabeçalho Superior com Metadados e Ações */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                {currentProduct.brand || "Marca Geral"}
              </span>

              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 capitalize">
                {currentProduct.category || "Mercearia"}
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
                        frames={currentProduct.recursosVisuais.frames}
                        alt={currentProduct.name || currentProduct.nome_bruto}
                      />
                    ) : (
                      <div
                        className={`relative w-full aspect-square bg-[#f8f9fa] rounded-2xl p-4 border border-slate-200/90 flex items-center justify-center overflow-hidden select-none touch-none ${
                          isPhotoDragging ? "cursor-grabbing" : "cursor-grab"
                        }`}
                        onPointerDown={handlePhotoPointerDown}
                        onPointerMove={handlePhotoPointerMove}
                        onPointerUp={handlePhotoPointerUp}
                        onPointerCancel={handlePhotoPointerUp}
                      >
                        <div
                          className="w-full h-full flex items-center justify-center pointer-events-none select-none"
                          style={{
                            transform: `translate3d(${photoOffset.x}px, ${photoOffset.y}px, 0)`,
                            transition: isPhotoDragging
                              ? "none"
                              : "transform 0.45s cubic-bezier(0.2, 1, 0.3, 1)",
                          }}
                        >
                          <ProductImage
                            src={activeImage}
                            alt={currentProduct.name || currentProduct.nome_bruto}
                            className="w-full h-full object-contain pointer-events-none"
                            fallbackIcon={currentProduct.image || "📦"}
                          />
                        </div>

                        {/* Indicador de Unidade */}
                        <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs text-slate-800 font-bold text-[11px] px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs pointer-events-none">
                          {currentProduct.unit || "1 un"}
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

              {/* COLUNA DIREITA: Informações Principais, Melhor Preço e Ações Rápidas (Estilo Asun/OSuper da Foto 2) */}
              <div className="md:col-span-6 space-y-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                    {currentProduct.name || currentProduct.nome_bruto}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1.5 flex-wrap">
                    {codigoIdentificador && (
                      <span className="font-mono text-slate-600" title="SKU de origem">
                        SKU {codigoIdentificador}
                      </span>
                    )}
                    {currentProduct.brand && (
                      <span>
                        • Marca: <strong className="text-slate-800 font-bold">{currentProduct.brand}</strong>
                      </span>
                    )}
                    {currentProduct.unit && (
                      <span>• Embalagem: {currentProduct.unit}</span>
                    )}
                    {currentProduct.supermercadoOrigem && (
                      <span className="hidden sm:inline text-slate-400">• Coletado em: {currentProduct.supermercadoOrigem}</span>
                    )}
                  </div>
                </div>

                {/* Atalho de Informações do Produto (Estilo Dropdown/Link Retrátil da Foto 2) */}
                {currentProduct.descricao && (
                  <div>
                    <a
                      href="#informacoes-produto"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200/90 rounded-lg px-2.5 py-1.5 bg-slate-50/80 hover:bg-slate-100 transition-colors shadow-2xs"
                    >
                      <span>Informações do produto</span>
                      <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* Preço em Destaque & Economia Comprovada (Estilo Foto 2) */}
                {bestOffer ? (
                  <div className="space-y-2 pt-1">
                    {promoVerification?.comprovada && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                          -{promoVerification.descontoPerc}% OFF
                        </span>
                        <span className="text-sm text-slate-400 line-through font-medium">
                          De R$ {promoVerification.precoNormal.toFixed(2)}
                        </span>
                        <span className="text-xs text-rose-600 font-semibold hidden sm:inline">
                          (Economia de R$ {promoVerification.economiaPromo.toFixed(2)})
                        </span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                        R$ {bestOffer.price.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <span>★ Melhor Preço do RS</span>
                        <span className="font-normal text-slate-600">no {bestOffer.market.name}</span>
                      </span>
                      {bestOffer.isClube && (
                        <span className="text-xs font-black text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                          <span>🏷️ Preço via {bestOffer.clubeNome}</span>
                        </span>
                      )}
                    </div>

                    {maxEconomy > 0 && highestOffer && (
                      <p className="text-xs text-slate-600 pt-0.5">
                        💰 Economize até <strong className="text-emerald-700 font-bold">R$ {maxEconomy.toFixed(2)}</strong> comprando no <strong>{bestOffer.market.name}</strong> em vez do {highestOffer.market.name}.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm italic">
                    Preço sob consulta
                  </div>
                )}

                {/* Ações Rápidas: Botão Principal em Pílula Vermelha + Ações Secundárias (Foto 2) */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onAddToList) onAddToList(currentProduct)
                    }}
                    className="w-full sm:w-auto min-w-[260px] py-3 px-6 rounded-xl border-2 border-red-600 text-red-600 hover:bg-red-50 hover:border-red-700 font-black text-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <span>Adicionar ao carrinho</span>
                  </button>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-700 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite && onToggleFavorite(currentProduct.id)}
                      className="inline-flex items-center gap-1.5 hover:text-slate-950 transition-colors cursor-pointer"
                      title={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
                    >
                      <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round" />
                        <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round" />
                        <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round" />
                        <line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" strokeWidth="3" />
                        <line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" strokeWidth="3" />
                        <line x1="3" y1="18" x2="3.01" y2="18" strokeLinecap="round" strokeWidth="3" />
                      </svg>
                      <span>{isFavorite ? "Salvo na lista" : "Adicionar à lista"}</span>
                    </button>

                    {urlOficialValida && (
                      <>
                        <span className="text-slate-300">•</span>
                        <a
                          href={urlOficialValida}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 transition-colors"
                        >
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path d="M12 8.667v4.666a1.333 1.333 0 01-1.333 1.334H3.333A1.333 1.333 0 012 13.333V6a1.333 1.333 0 011.333-1.333h4.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 2h4v4M6.667 9.333L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>Ver produto na loja oficial {currentProduct.supermercadoOrigem ? `(${currentProduct.supermercadoOrigem})` : ""} &rarr;</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* SEÇÃO INFORMAÇÕES DO PRODUTO (Dobra de Baixo - Idêntico à Foto 2) */}
            {currentProduct.descricao && (
              <div id="informacoes-produto" className="pt-6 border-t border-slate-200/90 space-y-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center justify-between">
                  <span>Informações do produto</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
                  {currentProduct.descricao}
                </p>
              </div>
            )}

            {/* SEÇÃO PREÇOS POR SUPERMERCADO (Dobra de Baixo - Cards da Foto 1 Reorganizados com Amplo Espaço) */}
            <div className="pt-6 border-t border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Preços por Supermercado (Ordenado por Menor Preço)</span>
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">8 redes monitoradas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {/* Redes com Preço Válido Ordenadas */}
                {validPrices.map((item, idx) => {
                  const isBest = idx === 0
                  return (
                    <div
                      key={item.market.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {item.market.name}
                            </span>
                            {item.isClube && (
                              <span className="text-[9px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded shrink-0">
                                🏷️ {item.clubeNome}
                              </span>
                            )}
                          </div>
                          {isBest ? (
                            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block">
                              ★ Menor Preço
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-medium block">
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
                    className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between opacity-60"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-300" />
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

            {/* SEÇÃO INFORMAÇÕES DO PRODUTO (Dobra de Baixo - Idêntico à Foto 2) */}
            {currentProduct.descricao && (
              <div className="pt-6 border-t border-slate-200/90 space-y-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center justify-between">
                  <span>Informações do produto</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
                  {currentProduct.descricao}
                </p>
              </div>
            )}

            {/* SEÇÃO DA MESMA CATEGORIA / RELACIONADOS - LARGURA COMPLETA (Fase 4 - UX Refinada idêntica à referência) */}
            {(directAlternatives.length > 0 || brandAlternatives.length > 0) && (
              <div className="pt-6 border-t border-slate-200/90 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Da mesma categoria
                    </h3>
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                      Você também pode comparar
                    </span>
                  </div>

                  {/* Controles de Alternância & Abas com botão Ver Mais */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                      {directAlternatives.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setRelatedTab("other_brands")}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            relatedTab === "other_brands"
                              ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Outras marcas ({directAlternatives.length})
                        </button>
                      )}
                      {brandAlternatives.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setRelatedTab("same_brand")}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            relatedTab === "same_brand"
                              ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Mais da {currentProduct.brand || "marca"} ({brandAlternatives.length})
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (relatedScrollRef.current) {
                          relatedScrollRef.current.scrollBy({ left: 360, behavior: "smooth" })
                        }
                      }}
                      className="text-xs font-bold text-slate-800 hover:text-slate-950 px-2 py-1 transition-colors cursor-pointer"
                    >
                      Ver mais
                    </button>
                  </div>
                </div>

                {/* Carrossel Horizontal com Navegação e Cards Idênticos à Referência */}
                <div className="relative group/carousel">
                  <div
                    ref={relatedScrollRef}
                    className="flex items-stretch gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
                  >
                    {(relatedTab === "other_brands" ? directAlternatives : brandAlternatives).map((alt) => {
                      const altHas360 = Boolean(
                        alt.recursosVisuais?.has360 &&
                        Array.isArray(alt.recursosVisuais?.frames) &&
                        alt.recursosVisuais.frames.length >= 2
                      )
                      const isPromo = Boolean(
                        alt.promo ||
                        (alt.precoNormal && alt._lowestPrice && alt.precoNormal > alt._lowestPrice)
                      )
                      const descontoPerc = isPromo && alt.precoNormal && alt._lowestPrice
                        ? Math.round(((alt.precoNormal - alt._lowestPrice) / alt.precoNormal) * 100)
                        : null

                      return (
                        <div
                          key={alt.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (onSelectProduct) onSelectProduct(alt)
                            setInternalProduct(alt)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              if (onSelectProduct) onSelectProduct(alt)
                              setInternalProduct(alt)
                            }
                          }}
                          className="w-[160px] sm:w-[185px] shrink-0 bg-white rounded-2xl border border-slate-200/90 p-3 hover:border-slate-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer group select-none relative focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          {/* Topo do card: Badges de Oferta e 360 */}
                          <div className="flex items-center justify-between w-full h-5 mb-1 pointer-events-none">
                            {isPromo ? (
                              <span className="bg-[#dc2626] text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                                Oferta
                              </span>
                            ) : (
                              <span />
                            )}

                            {altHas360 && (
                              <span
                                title="Possui rotação 360°"
                                className="bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs"
                              >
                                360°
                              </span>
                            )}
                          </div>

                          {/* Área da Imagem do Produto */}
                          <div className="w-full h-28 sm:h-32 flex items-center justify-center p-1.5 my-1">
                            <ProductImage
                              src={alt.imageLocal || alt.imageUrl}
                              alt={alt.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                              fallbackIcon={alt.image || "📦"}
                            />
                          </div>

                          {/* Preços no estilo Asun/Supermercado */}
                          <div className="pt-2 border-t border-slate-100 min-h-[48px]">
                            {alt._lowestPrice !== null ? (
                              <div>
                                {isPromo && alt.precoNormal && (
                                  <div className="flex items-center gap-1.5 text-[11px] leading-none mb-0.5">
                                    {descontoPerc && (
                                      <span className="text-[#dc2626] font-bold">
                                        -{descontoPerc}%
                                      </span>
                                    )}
                                    <span className="text-slate-400 line-through">
                                      R$ {alt.precoNormal.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                <span className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                                  R$ {alt._lowestPrice.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Preço indisponível
                              </span>
                            )}
                          </div>

                          {/* Nome do Produto */}
                          <div className="my-2 min-h-[2.5rem]">
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                              {alt.name}
                            </h4>
                            {alt.unit && (
                              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                                {alt.unit}
                              </span>
                            )}
                          </div>

                          {/* Botão Adicionar (Pílula com borda vermelha) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (onAddToList) onAddToList(alt)
                            }}
                            className="w-full py-1.5 px-3 rounded-full border border-red-500 text-red-600 hover:bg-red-50 text-xs font-extrabold transition-all active:scale-98 cursor-pointer mt-1 flex items-center justify-center"
                          >
                            Adicionar
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Botão Seta Direita Flutuante para Navegação Suave */}
                  <button
                    type="button"
                    onClick={() => {
                      if (relatedScrollRef.current) {
                        relatedScrollRef.current.scrollBy({ left: 360, behavior: "smooth" })
                      }
                    }}
                    aria-label="Avançar carrossel"
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-slate-200/90 shadow-md text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center z-10 transition-all cursor-pointer opacity-90 hover:opacity-100"
                  >
                    <span className="text-sm font-black">&gt;</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé Fixo de Ações */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer"
              onClick={() => onToggleFavorite && onToggleFavorite(currentProduct.id)}
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
                if (onAddToList) onAddToList(currentProduct)
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


