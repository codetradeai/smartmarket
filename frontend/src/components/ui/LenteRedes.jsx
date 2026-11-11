import { useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"
import { LOGOS_REDES } from "./logosRedes"
import OFERTAS from "./ofertasPorRede.json"

const MARCAS = { atacadao: "#F28C00", master: "#2E8B3E", asun: "#D6262B", stok: "#E5336D" }
const PUXAO = 14 // px de tração magnética no máximo
const LARGURA_CARD = 288
const ALTURA_CARD = 250
const SUAVIDADE = 0.2 // fração do caminho percorrida por quadro (lerp)

const numero = (v) => Number(v || 0).toLocaleString("pt-BR")
const preco = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/**
 * "Lente magnética": dock com as redes em pedestais que puxam a logo na direção do cursor, dão foco à rede sob
 * o mouse (as outras recuam) e mostram um card flutuante com itens reais daquela rede. O movimento roda por CSS
 * variables e requestAnimationFrame, sem re-render por pixel; só entrar/sair de uma rede muda o estado. Em touch
 * (sem hover) cada card mostra o resumo na base e o toque filtra o catálogo.
 */
export function LenteRedes({ markets, redesResumo, selectedMarket, onSelect }) {
  const redes = (Array.isArray(markets) ? markets : []).filter((m) => LOGOS_REDES[m.id])
  const anuncios = new Map((Array.isArray(redesResumo) ? redesResumo : []).map((r) => [String(r.id), Number(r.anuncios) || 0]))

  const [ativo, setAtivo] = useState(null)
  const [comHover, setComHover] = useState(false)
  const [semMovimento, setSemMovimento] = useState(false)
  const cardRef = useRef(null)
  const alvo = useRef({ x: 0, y: 0 })
  const atual = useRef({ x: 0, y: 0 })
  const quadro = useRef(0)

  useEffect(() => {
    const hover = window.matchMedia?.("(hover: hover) and (pointer: fine) and (min-width: 1024px)")
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    const ler = () => {
      setComHover(hover?.matches ?? false)
      setSemMovimento(reduz?.matches ?? false)
    }
    ler()
    hover?.addEventListener?.("change", ler)
    reduz?.addEventListener?.("change", ler)
    return () => {
      hover?.removeEventListener?.("change", ler)
      reduz?.removeEventListener?.("change", ler)
    }
  }, [])

  function aplicarPosicao() {
    const el = cardRef.current
    if (!el) return
    let { x, y } = atual.current
    // Se não couber à direita/abaixo do cursor, passa para o outro lado.
    if (x + LARGURA_CARD + 24 > window.innerWidth) x -= LARGURA_CARD + 36
    if (y + ALTURA_CARD + 24 > window.innerHeight) y -= ALTURA_CARD + 36
    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
  }

  // O card segue o cursor com interpolação, só enquanto uma rede está ativa.
  useEffect(() => {
    if (!ativo || !comHover) return undefined
    atual.current = { ...alvo.current }
    aplicarPosicao()
    const passo = () => {
      const k = semMovimento ? 1 : SUAVIDADE
      atual.current.x += (alvo.current.x - atual.current.x) * k
      atual.current.y += (alvo.current.y - atual.current.y) * k
      aplicarPosicao()
      quadro.current = window.requestAnimationFrame(passo)
    }
    quadro.current = window.requestAnimationFrame(passo)
    return () => window.cancelAnimationFrame(quadro.current)
  }, [ativo, comHover, semMovimento])

  function aoMover(event) {
    if (event.pointerType !== "mouse") return
    alvo.current = { x: event.clientX + 20, y: event.clientY + 20 }
    if (semMovimento) return
    const caixa = event.currentTarget.getBoundingClientRect()
    const dx = (event.clientX - (caixa.left + caixa.width / 2)) / (caixa.width / 2)
    const dy = (event.clientY - (caixa.top + caixa.height / 2)) / (caixa.height / 2)
    event.currentTarget.style.setProperty("--mx", `${(Math.max(-1, Math.min(1, dx)) * PUXAO).toFixed(1)}px`)
    event.currentTarget.style.setProperty("--my", `${(Math.max(-1, Math.min(1, dy)) * PUXAO).toFixed(1)}px`)
  }

  function aoEntrar(event, id) {
    if (event.pointerType !== "mouse") return
    alvo.current = { x: event.clientX + 20, y: event.clientY + 20 }
    setAtivo(id)
  }

  function aoSair(event) {
    if (event.pointerType !== "mouse") return
    event.currentTarget.style.setProperty("--mx", "0px")
    event.currentTarget.style.setProperty("--my", "0px")
    setAtivo(null)
  }

  function aoFocar(event, id) {
    const caixa = event.currentTarget.getBoundingClientRect()
    alvo.current = { x: caixa.left + caixa.width / 2, y: caixa.bottom - 24 }
    setAtivo(id)
  }

  if (redes.length === 0) return null
  const dadosAtivo = ativo ? OFERTAS[ativo] : null
  const redeAtiva = redes.find((m) => m.id === ativo)

  return (
    <div className="mx-auto w-full max-w-6xl">
      <ul role="group" aria-label="Redes com coleta de preços" className="sm-lente" data-ativo={ativo ?? undefined}>
        {redes.map((mercado) => {
          const logo = LOGOS_REDES[mercado.id]
          const dados = OFERTAS[mercado.id]
          const destaque = dados?.ofertas?.[0]
          const selecionado = selectedMarket === mercado.id
          return (
            <li key={mercado.id} className="sm-lente__item">
              <button
                type="button"
                className={`sm-lente__ped${ativo === mercado.id ? " is-ativo" : ""}${selecionado ? " is-selected" : ""}`}
                style={{ "--marca": MARCAS[mercado.id] ?? "#1A8047" }}
                aria-pressed={selecionado}
                onClick={() => onSelect?.(mercado.id)}
                onPointerMove={aoMover}
                onPointerEnter={(e) => aoEntrar(e, mercado.id)}
                onPointerLeave={aoSair}
                onFocus={(e) => aoFocar(e, mercado.id)}
                onBlur={() => setAtivo(null)}
              >
                <span className="sm-lente__logo">
                  <img src={logo.src} alt={mercado.name} width={logo.largura} height={logo.altura} draggable={false} decoding="async" />
                </span>
                <span className="sm-lente__resumo">
                  <span className="sm-lente__melhor">
                    {destaque ? (
                      <>
                        {destaque.nome} <b>{preco(destaque.preco)}</b>
                      </>
                    ) : (
                      "Preços coletados"
                    )}
                  </span>
                  <span className="sm-lente__toque">
                    Toque para filtrar <ArrowRight size={13} aria-hidden="true" />
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {comHover && ativo && dadosAtivo && (
        <div
          ref={cardRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-50 w-72 rounded-2xl border border-white/10 bg-[#0b192c]/90 p-4 text-white shadow-2xl backdrop-blur-md"
          style={{ willChange: "transform" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-base font-extrabold leading-tight">{redeAtiva?.name}</p>
              <p className="mt-0.5 text-[11px] text-white/60">{numero(anuncios.get(ativo) ?? dadosAtivo.itens)} itens monitorados</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#4ade80]/15 px-2 py-0.5 text-[11px] font-bold text-[#4ade80]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
              Coleta ativa
            </span>
          </div>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-white/50">
            {dadosAtivo.comDesconto > 0 ? "Ofertas em destaque" : "Itens coletados"}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {dadosAtivo.ofertas.map((o) => (
              <li key={o.nome} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-white/90">{o.nome}</span>
                <span className="flex shrink-0 items-center gap-1.5 font-semibold tabular-nums">
                  {preco(o.preco)}
                  {o.desconto ? <i className="rounded bg-[#4ade80]/20 px-1 text-[10px] font-bold not-italic text-[#4ade80]">-{o.desconto}%</i> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1 text-xs font-bold text-[#4ade80]">
            Clique para filtrar o catálogo <ArrowRight size={13} aria-hidden="true" />
          </p>
        </div>
      )}
    </div>
  )
}
