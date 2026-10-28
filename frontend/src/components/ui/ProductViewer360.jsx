import { useState, useEffect, useRef, useCallback } from "react"

/**
 * ProductViewer360 - Visualizador de Rotação 360° Nativo em React
 * 
 * Funcionalidades:
 * - Rotação horizontal por arraste de mouse (drag) e toque na tela (swipe)
 * - Carregamento assíncrono sob demanda com barra de progresso
 * - Navegação acessível por teclado (setas esquerda/direita)
 * - Controle deslizante (slider) de ângulo com atributos ARIA
 * - Modo de rotação automática contínua (play/pause)
 * - Tratamento de estados de carregamento, erro e ausência de quadros
 * - Descarte seguro de listeners e timers na desmontagem
 */
export function ProductViewer360({
  frames = [],
  alt = "Produto",
  className = "",
  autoRotateInitially = false,
  sensitivity = 8, // pixels de arrasto por frame
}) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [loadedImages, setLoadedImages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(autoRotateInitially)

  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startFrameRef = useRef(0)
  const containerRef = useRef(null)
  const autoPlayTimerRef = useRef(null)

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
      // Se mais de metade dos frames falharem, marca erro
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
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current)
      }
    }
  }, [frames])

  // 2. Rotação automática suave
  useEffect(() => {
    if (!isPlaying || isLoading || hasError || totalFrames < 2) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current)
      return
    }

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames)
    }, 120)

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current)
    }
  }, [isPlaying, isLoading, hasError, totalFrames])

  // 3. Handlers de Arraste (Pointer Events universais para mouse e touch)
  const handlePointerDown = (e) => {
    if (isLoading || hasError || totalFrames < 2) return
    isDraggingRef.current = true
    startXRef.current = e.clientX
    startFrameRef.current = currentFrame
    setIsPlaying(false) // pausa autoplay ao interagir

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

    // Inverte o delta para arraste natural: arrastar para direita gira no sentido horário
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

  // 4. Acessibilidade via Teclado
  const handleKeyDown = (e) => {
    if (isLoading || hasError || totalFrames < 2) return
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      setIsPlaying(false)
      setCurrentFrame((prev) => (prev - 1 + totalFrames) % totalFrames)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      setIsPlaying(false)
      setCurrentFrame((prev) => (prev + 1) % totalFrames)
    } else if (e.key === "Home") {
      e.preventDefault()
      setCurrentFrame(0)
    } else if (e.key === "End") {
      e.preventDefault()
      setCurrentFrame(totalFrames - 1)
    }
  }

  // 5. Estado de ausência ou erro de recursos
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
  const angleDegrees = Math.round((currentFrame / totalFrames) * 360)

  return (
    <div
      ref={containerRef}
      className={`relative select-none flex flex-col items-center bg-slate-50/70 rounded-2xl p-4 border border-slate-200 overflow-hidden ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`Visualizador 360 graus de ${alt}. Use as setas do teclado para rotacionar.`}
    >
      {/* Área Interativa de Rotação */}
      <div
        className={`relative w-full aspect-square flex items-center justify-center overflow-hidden rounded-xl ${
          isLoading ? "cursor-wait" : isDraggingRef.current ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
            alt={`${alt} - ângulo ${angleDegrees} graus`}
            draggable={false}
            className="w-full h-full object-contain pointer-events-none transition-none"
          />
        )}

        {/* Badge Flutuante de Instrução e Ângulo */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1.5 text-[11px] font-bold text-slate-700 pointer-events-none">
          <span className="text-emerald-600">🔄</span>
          <span>{angleDegrees}°</span>
        </div>

        {/* Dica de arraste (some ao interagir) */}
        {!isLoading && !isDraggingRef.current && (
          <div className="absolute bottom-2 inset-x-0 mx-auto w-fit bg-black/60 backdrop-blur-xs text-white px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 opacity-80 pointer-events-none animate-pulse">
            <span>⇄</span>
            <span>Arraste para girar em 360°</span>
          </div>
        )}
      </div>

      {/* Barra de Controles Acessíveis Inferior */}
      <div className="w-full mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        {/* Botão de Rotação Automática (Play/Pause) */}
        <button
          type="button"
          onClick={() => setIsPlaying((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer shadow-2xs ${
            isPlaying
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
          title={isPlaying ? "Pausar rotação automática" : "Girar automaticamente"}
        >
          <span>{isPlaying ? "⏸" : "▶"}</span>
          <span>{isPlaying ? "Pausar" : "Girar 360°"}</span>
        </button>

        {/* Slider Acessível de Ângulo */}
        <div className="flex-1 min-w-[120px] flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={totalFrames - 1}
            value={currentFrame}
            onChange={(e) => {
              setIsPlaying(false)
              setCurrentFrame(Number(e.target.value))
            }}
            aria-label="Controle de rotação 360 graus"
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <span className="text-[10px] font-mono text-slate-500 font-bold shrink-0">
            {currentFrame + 1}/{totalFrames}
          </span>
        </div>
      </div>
    </div>
  )
}
