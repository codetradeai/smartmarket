import { useEffect, useRef, useState } from "react"
import { LOGOS_REDES } from "./logosRedes"

const AUTO_SPEED = 38 // px/s, para a esquerda
const DRAG_THRESHOLD = 6 // px antes de um toque virar arraste (abaixo disso ainda é clique)
const INERTIA_DECAY = 3.2 // maior = a inércia some mais rápido (decaimento exponencial por segundo)
const MAX_RELEASE_SPEED = 1700 // px/s (~530 px de inércia no máximo), evita um "tiro" depois de um arraste brusco

/**
 * Faixa infinita de logos, no estilo do marquee do causal.so: o conjunto é repetido e, quando um
 * conjunto inteiro sai da tela, a posição volta a zero sem salto visível. O movimento é feito por
 * JS (translate3d num requestAnimationFrame) para permitir arrastar com inércia. Só anima quando a
 * faixa está visível, e nunca lê layout dentro do loop.
 */
export function MarqueeRedes({ markets, selectedMarket, onSelect }) {
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const setRef = useRef(null)
  const posRef = useRef(0)
  const velRef = useRef(0)
  const setWidthRef = useRef(0)
  const dragRef = useRef({ active: false, moved: false, startX: 0, startPos: 0, lastX: 0, lastT: 0, pointerId: null })
  const suppressClickRef = useRef(false)

  const [copies, setCopies] = useState(3)
  const [reduced, setReduced] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [inView, setInView] = useState(true)
  const [hover, setHover] = useState(false)
  const [focusInside, setFocusInside] = useState(false)
  const [dragging, setDragging] = useState(false)

  const lista = Array.isArray(markets) ? markets : []
  const autoPaused = reduced || hidden || hover || focusInside || dragging || selectedMarket !== "todos"
  const running = inView && !hidden && lista.length > 0

  // Preferência de movimento e visibilidade da aba.
  useEffect(() => {
    if (typeof window === "undefined") return undefined
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    const applyMedia = () => setReduced(media?.matches ?? false)
    applyMedia()
    media?.addEventListener?.("change", applyMedia)
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      media?.removeEventListener?.("change", applyMedia)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  // Só anima enquanto a faixa aparece na tela.
  useEffect(() => {
    const el = viewportRef.current
    if (!el || typeof IntersectionObserver === "undefined") return undefined
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Mede um conjunto e quantas cópias são necessárias para cobrir a tela + um conjunto de folga.
  useEffect(() => {
    const viewport = viewportRef.current
    const conjunto = setRef.current
    if (!viewport || !conjunto) return undefined
    const medir = () => {
      const largura = conjunto.getBoundingClientRect().width
      if (largura <= 0) return
      setWidthRef.current = largura
      setCopies(Math.max(2, Math.ceil(viewport.clientWidth / largura) + 1))
    }
    medir()
    if (typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(medir)
    observer.observe(viewport)
    observer.observe(conjunto)
    return () => observer.disconnect()
  }, [lista.length])

  function aplicar(pos) {
    const largura = setWidthRef.current
    let next = pos
    if (largura > 0) {
      while (next <= -largura) next += largura
      while (next > 0) next -= largura
    }
    posRef.current = next
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${next}px, 0, 0)`
  }

  // Loop de animação: movimento automático + inércia do arraste.
  useEffect(() => {
    if (!running) return undefined
    let raf = 0
    let ultimo = 0
    const quadro = (agora) => {
      const dt = ultimo ? Math.min((agora - ultimo) / 1000, 0.05) : 0
      ultimo = agora
      if (!dragRef.current.active && dt > 0) {
        let delta = 0
        if (Math.abs(velRef.current) > 4) {
          delta += velRef.current * dt
          velRef.current *= Math.exp(-INERTIA_DECAY * dt)
        } else {
          velRef.current = 0
        }
        if (!autoPaused) delta -= AUTO_SPEED * dt
        if (delta !== 0) aplicar(posRef.current + delta)
      }
      raf = window.requestAnimationFrame(quadro)
    }
    raf = window.requestAnimationFrame(quadro)
    return () => window.cancelAnimationFrame(raf)
  }, [running, autoPaused])

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    const agora = performance.now()
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startPos: posRef.current,
      lastX: event.clientX,
      lastT: agora,
      pointerId: event.pointerId,
    }
    velRef.current = 0
    suppressClickRef.current = false
  }

  function onPointerMove(event) {
    const drag = dragRef.current
    if (!drag.active || event.pointerId !== drag.pointerId) return
    const deslocamento = event.clientX - drag.startX
    if (!drag.moved) {
      if (Math.abs(deslocamento) < DRAG_THRESHOLD) return
      drag.moved = true
      setDragging(true)
      // Só captura o ponteiro depois que virou arraste, para o clique simples continuar chegando ao botão.
      viewportRef.current?.setPointerCapture?.(event.pointerId)
    }
    const agora = performance.now()
    const dtMs = agora - drag.lastT
    if (dtMs > 0) {
      const instantanea = ((event.clientX - drag.lastX) / dtMs) * 1000
      velRef.current = velRef.current * 0.6 + instantanea * 0.4
    }
    drag.lastX = event.clientX
    drag.lastT = agora
    aplicar(drag.startPos + deslocamento)
  }

  function onPointerEnd(event) {
    const drag = dragRef.current
    if (!drag.active || event.pointerId !== drag.pointerId) return
    drag.active = false
    if (drag.moved) {
      suppressClickRef.current = true
      viewportRef.current?.releasePointerCapture?.(event.pointerId)
      // Parou antes de soltar: sem inércia.
      if (performance.now() - drag.lastT > 90) velRef.current = 0
      velRef.current = Math.max(-MAX_RELEASE_SPEED, Math.min(MAX_RELEASE_SPEED, velRef.current))
      setDragging(false)
    }
  }

  function onClickCapture(event) {
    // Um arraste que termina sobre um logo não pode contar como clique nele.
    if (suppressClickRef.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClickRef.current = false
    }
  }

  return (
    <div
      ref={viewportRef}
      role="group"
      aria-label="Redes com coleta de preços"
      className={`sm-marquee${dragging ? " is-dragging" : ""}${selectedMarket !== "todos" ? " has-selection" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHover(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setHover(false)}
      onFocus={() => setFocusInside(true)}
      onBlur={() => setFocusInside(false)}
      onClickCapture={onClickCapture}
    >
      <div ref={trackRef} className="sm-marquee__track">
        {Array.from({ length: copies }, (_, copia) => (
          <ul
            key={copia}
            ref={copia === 0 ? setRef : undefined}
            className="sm-marquee__set"
            aria-hidden={copia > 0 ? "true" : undefined}
            inert={copia > 0 ? true : undefined}
          >
            {lista.map((mercado) => {
              const selecionado = selectedMarket === mercado.id
              const logo = LOGOS_REDES[mercado.id]
              if (!logo) return null
              return (
                <li key={mercado.id} className="sm-marquee__item">
                  <button
                    type="button"
                    className={`sm-marquee__logo${selecionado ? " is-selected" : ""}`}
                    aria-pressed={selecionado}
                    onClick={() => onSelect?.(mercado.id)}
                  >
                    <img
                      src={logo.src}
                      alt={mercado.name}
                      width={logo.largura}
                      height={logo.altura}
                      draggable={false}
                      decoding="async"
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        ))}
      </div>
    </div>
  )
}
