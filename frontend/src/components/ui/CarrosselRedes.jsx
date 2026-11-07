import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { MARKETS } from "../../catalogoResumo"
import logoFort from "../../../logo/logo-fort.png"
import logoAsun from "../../../logo/logo-asun.png"
import logoStok from "../../../logo/logo-stok.png"
import logoAtacadao from "../../../logo/logo-atacadao.png"
import logoCarrefour from "../../../logo/logo-carrefour.png"
import logoRissul from "../../../logo/logo-rissul,.png"
import logoZaffari from "../../../logo/zaffari-bourbon-logo.png"
import logoMaster from "../../../logo/mastersupermercados-logo.png"

const MARKET_LOGOS = {
  fort: logoFort,
  asun: logoAsun,
  stok: logoStok,
  atacadao: logoAtacadao,
  carrefour: logoCarrefour,
  rissul: logoRissul,
  zaffari: logoZaffari,
  master: logoMaster,
}

const LOGO_OPTICS = {
  zaffari: 1.2,
  rissul: 1.42,
  asun: 0.94,
  stok: 0.92,
  atacadao: 0.84,
  master: 0.94,
  fort: 1.12,
  carrefour: 1.08,
}

const RAIL_GAP = 16
const RAIL_SPEED = 28
const DRAG_THRESHOLD = 8
const SNAP_MS = 280

const padIndex = (value) => String(value).padStart(2, "0")

const measureCardWidth = (viewportWidth) => {
  if (viewportWidth <= 0) return 240
  if (viewportWidth < 480) return Math.min(Math.max(viewportWidth * 0.78, 196), 252)
  if (viewportWidth < 768) return Math.min(Math.max(viewportWidth * 0.52, 210), 268)
  if (viewportWidth < 1100) return Math.min(Math.max(viewportWidth * 0.38, 236), 300)
  return Math.min(Math.max(viewportWidth * 0.33, 280), 340)
}

const shortestDelta = (from, to, total) => {
  const forward = (to - from + total) % total
  const backward = forward - total
  return Math.abs(backward) < forward ? backward : forward
}

const ChevronIcon = ({ direction }) => (
  <svg
    viewBox="0 0 20 20"
    width="18"
    height="18"
    fill="none"
    aria-hidden="true"
  >
    {direction === "prev" ? (
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
)

export function CarrosselRedes({ selectedMarket, onSelect }) {
  const n = MARKETS.length
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const offsetRef = useRef(n)
  const logicalRef = useRef(0)
  const centerRef = useRef(n)
  const fromPointer = useRef(false)
  const snapTimer = useRef(0)
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startOffset: 0,
  })
  const [viewportWidth, setViewportWidth] = useState(0)
  const [logical, setLogical] = useState(0)
  const [centerIndex, setCenterIndex] = useState(n)
  const [pointerInside, setPointerInside] = useState(false)
  const [focusInside, setFocusInside] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined
    const measure = () => setViewportWidth(el.clientWidth)
    measure()
    if (typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const applyMedia = () => setReduced(media?.matches ?? false)
    applyMedia()
    media?.addEventListener?.("change", applyMedia)
    const onHide = () => setHidden(document.hidden)
    document.addEventListener("visibilitychange", onHide)
    return () => {
      media?.removeEventListener?.("change", applyMedia)
      document.removeEventListener("visibilitychange", onHide)
      window.clearTimeout(snapTimer.current)
    }
  }, [])

  const paused = pointerInside || focusInside || reduced || hidden || selectedMarket !== "todos" || dragging
  const cardWidth = measureCardWidth(viewportWidth)
  const step = cardWidth + RAIL_GAP
  const slides = [...MARKETS, ...MARKETS, ...MARKETS]
  const progress = n > 0 ? ((logical + 1) / n) * 100 : 0

  function place(offset) {
    let next = offset
    while (next >= n * 2) next -= n
    while (next < n) next += n
    offsetRef.current = next
    const width = viewportRef.current?.clientWidth || viewportWidth
    const translate = width > 0 ? width / 2 - cardWidth / 2 - next * step : 0
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${translate}px, 0, 0)`
    const center = Math.min(n * 3 - 1, Math.max(0, Math.round(next)))
    const nextLogical = ((center % n) + n) % n
    if (centerRef.current !== center) {
      centerRef.current = center
      setCenterIndex(center)
    }
    if (logicalRef.current !== nextLogical) {
      logicalRef.current = nextLogical
      setLogical(nextLogical)
    }
  }

  function snap(offset) {
    if (!reduced && trackRef.current) {
      trackRef.current.classList.add("is-snapping")
      window.clearTimeout(snapTimer.current)
      snapTimer.current = window.setTimeout(() => {
        trackRef.current?.classList.remove("is-snapping")
      }, SNAP_MS + 40)
    }
    place(Math.round(offset))
  }

  useLayoutEffect(() => {
    place(offsetRef.current)
  })

  useEffect(() => {
    if (paused || viewportWidth <= 0) return undefined
    let frame = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      place(offsetRef.current + (RAIL_SPEED / step) * dt)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [paused, viewportWidth, step, cardWidth, n])

  function stepBy(direction) {
    snap(offsetRef.current + direction)
  }

  function goTo(target) {
    const current = logicalRef.current
    if (target === current) return
    snap(offsetRef.current + shortestDelta(current, target, n))
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return
    fromPointer.current = true
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startOffset: offsetRef.current,
    }
    viewportRef.current?.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event) {
    const drag = dragRef.current
    if (!drag.active) return
    const dx = event.clientX - drag.startX
    if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD) return
    if (!drag.moved) {
      drag.moved = true
      setDragging(true)
    }
    trackRef.current?.classList.remove("is-snapping")
    place(drag.startOffset - dx / step)
  }

  function onPointerUp(event) {
    const drag = dragRef.current
    if (!drag.active) return
    drag.active = false
    viewportRef.current?.releasePointerCapture?.(event.pointerId)
    if (drag.moved) {
      snap(offsetRef.current)
      setDragging(false)
    }
  }

  return (
    <div
      className={`sm-rail ${paused ? "is-paused" : ""} ${dragging ? "is-dragging" : ""}`}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Redes do catálogo"
      onMouseEnter={() => setPointerInside(true)}
      onMouseLeave={() => setPointerInside(false)}
      onFocus={(event) => {
        if (fromPointer.current) {
          fromPointer.current = false
          return
        }
        if (event.target instanceof Element && event.target.matches(":focus-visible")) setFocusInside(true)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusInside(false)
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault()
          stepBy(1)
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          stepBy(-1)
        } else if (event.key === "Home") {
          event.preventDefault()
          goTo(0)
        } else if (event.key === "End") {
          event.preventDefault()
          goTo(n - 1)
        }
      }}
    >
      <p className="sr-only" aria-live="polite">
        {MARKETS[logical]?.name}, {logical + 1} de {n}
      </p>

      <div className="sm-rail-stage">
        <button type="button" className="sm-rail-nav is-prev" aria-label="Rede anterior" onClick={() => stepBy(-1)}>
          <ChevronIcon direction="prev" />
        </button>

        <div
          className="sm-rail-window min-w-0"
          ref={viewportRef}
          style={{ opacity: viewportWidth > 0 ? 1 : 0 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            ref={trackRef}
            className="sm-rail-track"
            style={{ gap: RAIL_GAP }}
          >
            {slides.map((market, slideIndex) => {
              const isSelected = selectedMarket === market.id
              const clone = Math.floor(slideIndex / n) !== 1
              const logoSrc = MARKET_LOGOS[market.id]
              return (
                <button
                  key={`${market.id}-${slideIndex}`}
                  type="button"
                  aria-hidden={clone}
                  tabIndex={clone ? -1 : 0}
                  aria-label={isSelected ? `${market.name}, selecionada. Clique para limpar o filtro.` : `Filtrar por ${market.name}`}
                  aria-pressed={isSelected}
                  onClick={(event) => {
                    if (dragRef.current.moved) {
                      event.preventDefault()
                      return
                    }
                    snap(slideIndex)
                    onSelect(market.id)
                  }}
                  className={`sm-rail-card ${slideIndex === centerIndex ? "is-center" : ""} ${
                    isSelected ? "is-selected" : ""
                  }`}
                  style={{
                    width: cardWidth || 240,
                    "--market": market.color || "#22A95E",
                    "--logo-scale": String(LOGO_OPTICS[market.id] ?? 1),
                  }}
                >
                  <span className="sm-rail-wash" aria-hidden="true" />
                  <span className="sm-rail-logo">
                    {logoSrc ? (
                      <img src={logoSrc} alt="" draggable="false" />
                    ) : (
                      <span className="sm-rail-sigla" style={{ backgroundColor: market.color || "#0D2137" }}>
                        {market.sigla || market.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </span>
                  {isSelected ? (
                    <span className="sm-rail-check" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="10" height="10" fill="none">
                        <path
                          d="M3.2 8.2 6.4 11.3 12.7 4.6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  ) : null}
                  <span className="sm-rail-mark" aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </div>

        <button type="button" className="sm-rail-nav is-next" aria-label="Próxima rede" onClick={() => stepBy(1)}>
          <ChevronIcon direction="next" />
        </button>
      </div>

      <div className="sm-rail-footer">
        <p className="sm-rail-counter" aria-hidden="true">
          {padIndex(logical + 1)}
          <span> / {padIndex(n)}</span>
        </p>
        <div
          className="sm-rail-meter"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={n}
          aria-valuenow={logical + 1}
          aria-label="Posição no carrossel"
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="sm-rail-pips" role="group" aria-label="Ir para uma rede">
          {MARKETS.map((market, dotIndex) => (
            <button
              key={market.id}
              type="button"
              aria-label={`Ir para ${market.name}`}
              aria-current={dotIndex === logical ? "true" : undefined}
              onClick={() => goTo(dotIndex)}
              className={`sm-rail-pip ${dotIndex === logical ? "is-on" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default CarrosselRedes
