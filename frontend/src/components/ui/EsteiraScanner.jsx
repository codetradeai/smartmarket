import { useEffect, useState } from "react"
import { ArrowRight, Barcode, ScanLine, TrendingDown } from "lucide-react"
import { LOGOS_REDES, MARCAS_REDES } from "./logosRedes"
import OFERTAS from "./ofertasPorRede.json"
import { nomeCurtoRede } from "../../utils/redesDoCatalogo"

const INTERVALO_MS = 3500

const numero = (v) => Number(v || 0).toLocaleString("pt-BR")
const preco = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/**
 * "Esteira de scanner": as redes ficam numa pista e a rede ativa para sob um feixe de laser central; o visor
 * escuro logo abaixo mostra os itens reais daquela rede e o botão que filtra o catálogo. O foco troca sozinho
 * a cada 3,5 s, pausa com mouse/foco na região e pode ser puxado pelos pontos ou clicando numa rede.
 * O deslocamento da pista é um transform CSS (variável --i): sem re-render por quadro.
 */
export function EsteiraScanner({ markets, redesResumo, selectedMarket, onSelect }) {
  const redes = (Array.isArray(markets) ? markets : []).filter((m) => LOGOS_REDES[m.id])
  const anuncios = new Map((Array.isArray(redesResumo) ? redesResumo : []).map((r) => [String(r.id), Number(r.anuncios) || 0]))

  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [semMovimento, setSemMovimento] = useState(false)

  useEffect(() => {
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    const ler = () => setSemMovimento(reduz?.matches ?? false)
    ler()
    reduz?.addEventListener?.("change", ler)
    return () => reduz?.removeEventListener?.("change", ler)
  }, [])

  const total = redes.length
  useEffect(() => {
    if (pausado || semMovimento || total < 2) return undefined
    // Depende de `indice`: escolher uma rede à mão reinicia a contagem dos 3,5 s.
    const id = window.setTimeout(() => setIndice((i) => (i + 1) % total), INTERVALO_MS)
    return () => window.clearTimeout(id)
  }, [pausado, semMovimento, total, indice])

  if (total === 0) return null
  const ativo = redes[Math.min(indice, total - 1)]
  const dados = OFERTAS[ativo.id]
  const marca = MARCAS_REDES[ativo.id] ?? "#1A8047"
  const itens = anuncios.get(String(ativo.id)) ?? dados?.itens ?? 0
  const nomeCurto = nomeCurtoRede(ativo)

  return (
    <div
      className="sm-scan mx-auto w-full max-w-5xl"
      style={{ "--marca": marca, "--i": indice, "--n": total }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setPausado(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <p className="sm-scan__status">
        <span className="sm-scan__led" aria-hidden="true" />
        <ScanLine size={14} aria-hidden="true" />
        Scanner de coleta ativo
      </p>

      <div className="sm-scan__lane">
        <div className="sm-scan__track">
          {redes.map((mercado, i) => {
            const logo = LOGOS_REDES[mercado.id]
            const noScanner = i === indice
            return (
              <button
                key={mercado.id}
                type="button"
                className={`sm-scan__card${noScanner ? " is-scanning" : ""}`}
                style={{ "--marca": MARCAS_REDES[mercado.id] ?? "#1A8047" }}
                aria-pressed={noScanner}
                onPointerEnter={(e) => e.pointerType === "mouse" && setIndice(i)}
                onClick={() => setIndice(i)}
              >
                <img src={logo.src} alt={mercado.name} width={logo.largura} height={logo.altura} draggable={false} decoding="async" />
              </button>
            )
          })}
        </div>
        <div className="sm-scan__target" aria-hidden="true">
          <i /><i /><i /><i />
          <span key={indice} className="sm-scan__sweep" />
        </div>
        <span className="sm-scan__beam" aria-hidden="true" />
      </div>

      <div className="sm-scan__panel" aria-live="polite">
        <div key={ativo.id} className="sm-scan__grid">
          <div className="sm-scan__col">
            <p className="sm-scan__name">
              <span className="sm-scan__chip" aria-hidden="true" />
              {ativo.name}
            </p>
            <p className="sm-scan__code">
              SYNC_OK // {numero(itens)} SKUs lidos
            </p>
          </div>

          <ul className="sm-scan__items">
            {(dados?.ofertas ?? []).map((o) => (
              <li key={o.nome} className="sm-scan__ticket">
                <Barcode size={16} aria-hidden="true" className="sm-scan__ticket-icon" />
                <span className="sm-scan__ticket-name">{o.nome}</span>
                <span className="sm-scan__ticket-price">
                  {preco(o.preco)}
                  {o.desconto ? (
                    <em>
                      <TrendingDown size={11} aria-hidden="true" />-{o.desconto}%
                    </em>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          <div className="sm-scan__col sm-scan__col--acao">
            <button type="button" className="sm-scan__cta" aria-pressed={selectedMarket === ativo.id} onClick={() => onSelect?.(ativo.id)}>
              Filtrar catálogo: {nomeCurto}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div role="group" aria-label="Escolher rede no scanner" className="sm-scan__dots">
        {redes.map((mercado, i) => (
          <button key={mercado.id} type="button" className="sm-scan__dot" aria-pressed={i === indice} onClick={() => setIndice(i)}>
            {nomeCurtoRede(mercado)}
          </button>
        ))}
      </div>
    </div>
  )
}
