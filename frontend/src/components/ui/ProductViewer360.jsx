import { useState, useEffect, useRef } from "react"

/**
 * ProductViewer360 - Visualizador de Rotação 360° Fluído por Arraste
 * 
 * Funcionalidades:
 * - Rotação horizontal intuitiva por arraste do mouse (drag) e toque na tela (swipe)
 * - Calibração de sensibilidade fluída similar ao site do Asun
 * - Pré-carregamento assíncrono dos quadros
 * - Acessibilidade via teclado (setas esquerda/direita)
 * - Badge oficial 360° no canto superior direito
 * - Tratamento seguro de desmontagem
 */
export function ProductViewer360({
  frames = [],
  alt = "Produto",
  className = "",
  sensitivity = 8, // pixels de arrasto por frame
}) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [loadedImages, setLoadedImages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startFrameRef = useRef(0)
  const containerRef = useRef(null)

  const totalFrames = frames.length

  // 1. Pré-carregamento assíncrono sob demanda dos quadros
  useEffect(() => {
    if (!frames || frames.length === 0) {
      setIsLoading(false)
      setHasError(true)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setHasError(false)
    setCurrentFrame(0)

    let loadedCount = 0
    const imagesCache = []

    const handleSingleLoad = (img, index) => {
      if (!isMounted) return
      imagesCache[index] = img
      loadedCount += 1
      if (loadedCount === frames.length) {
        setLoadedImages(imagesCache)
        setIsLoading(false)
      }
    }

    const handleSingleError = () => {
      if (!isMounted) return
      loadedCount += 1
      if (loadedCount === frames.length) {
        const validos = imagesCache.filter(Boolean)
        if (validos.length >= 2) {
          setLoadedImages(validos)
          setIsLoading(false)
        } else {
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    frames.forEach((src, idx) => {
      const img = new Image()
      img.src = src
      img.onload = () => handleSingleLoad(img, idx)
      img.onerror = handleSingleError
    })

    return () => {
      isMounted = false
    }
  }, [frames])

  // 2. Handlers de Arraste Fluído (Pointer Events universais para mouse e touch)
  const handlePointerDown = (e) => {
    if (isLoading || hasError || totalFrames < 2) return
    isDraggingRef.current = true
    setHasInteracted(true)
    startXRef.current = e.clientX
    startFrameRef.current = currentFrame

    if (e.target.setPointerCapture) {
      try {
        e.target.setPointerCapture(e.pointerId)
      } catch {}
    }
  }

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || totalFrames < 2) return
    const deltaX = e.clientX - startXRef.current
    const frameOffset = Math.floor(deltaX / sensitivity)

    // Arraste natural: arrastar para os lados rotaciona continuamente
    let nextFrame = (startFrameRef.current - frameOffset) % totalFrames
    if (nextFrame < 0) nextFrame += totalFrames

    setCurrentFrame(nextFrame)
  }

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    if (e.target.releasePointerCapture) {
      try {
        e.target.releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  // 3. Acessibilidade via Teclado (Setas esquerda/direita)
  const handleKeyDown = (e) => {
    if (isLoading || hasError || totalFrames < 2) return
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      setHasInteracted(true)
      setCurrentFrame((prev) => (prev - 1 + totalFrames) % totalFrames)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      setHasInteracted(true)
      setCurrentFrame((prev) => (prev + 1) % totalFrames)
    } else if (e.key === "Home") {
      e.preventDefault()
      setCurrentFrame(0)
    } else if (e.key === "End") {
      e.preventDefault()
      setCurrentFrame(totalFrames - 1)
    }
  }

  // 4. Estado de ausência ou erro de recursos
  if (hasError || totalFrames < 2) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 min-h-[260px] ${className}`}>
        <span className="text-2xl mb-1">📷</span>
        <p className="text-xs font-bold text-slate-700">Visualização 360° Indisponível</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
          A rotação 360° requer uma sequência fotográfica completa verificada na rede de origem.
        </p>
      </div>
    )
  }

  const activeSrc = frames[currentFrame] || (loadedImages[currentFrame] && loadedImages[currentFrame].src)

  return (
    <div
      ref={containerRef}
      className={`relative select-none w-full aspect-square bg-[#f8f9fa] rounded-2xl p-4 border border-slate-200/90 flex items-center justify-center overflow-hidden ${
        isLoading ? "cursor-wait" : isDraggingRef.current ? "cursor-grabbing" : "cursor-grab"
      } ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`Visualizador 360 graus de ${alt}. Clique e arraste para os lados para rotacionar.`}
    >
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center z-10 gap-2">
          <span className="w-7 h-7 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-700">Carregando rotação 360°...</p>
          <p className="text-[10px] text-slate-500 font-mono">Preparando {totalFrames} quadros</p>
        </div>
      )}

      {/* Imagem do Frame Atual */}
      {activeSrc && (
        <img
          src={activeSrc}
          alt={`${alt} - visualização 360 graus`}
          draggable={false}
          className="w-full h-full object-contain pointer-events-none transition-none"
        />
      )}

      {/* Dica de arraste com o mouse (desaparece ao interagir) */}
      {!isLoading && !hasInteracted && (
        <div className="absolute bottom-3 inset-x-0 mx-auto w-fit bg-slate-900/75 backdrop-blur-xs text-white px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 opacity-90 pointer-events-none shadow-xs">
          <span>⇄</span>
          <span>Clique e arraste para girar</span>
        </div>
      )}
    </div>
  )
}
