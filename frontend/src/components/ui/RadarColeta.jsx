import { SmartMarketLogo } from "./SmartMarketLogo"
import { LOGOS_REDES } from "./logosRedes"

const LARGURA_SVG = 1000
const ALTURA_SVG = 84

/** Um fio curvo do hub (topo, centro) até o topo do card `i` de `n`. */
function caminho(i, n) {
  const x = ((i + 0.5) / n) * LARGURA_SVG
  const meio = ALTURA_SVG * 0.5
  return `M${LARGURA_SVG / 2} 0 C${LARGURA_SVG / 2} ${meio}, ${x} ${meio * 0.55}, ${x} ${ALTURA_SVG}`
}

const numero = (valor) => Number(valor || 0).toLocaleString("pt-BR")

/**
 * "Radar de coleta": um hub (motor de coleta) ligado por fios com um feixe de luz a um card por rede.
 * Os números vêm do resumo do catálogo (anúncios por rede), nada é inventado. Cada card é um botão que
 * filtra o catálogo pela rede (`onSelect`). Os feixes só animam com movimento permitido (ver index.css).
 */
export function RadarColeta({ markets, redesResumo, selectedMarket, onSelect }) {
  const redes = (Array.isArray(markets) ? markets : []).filter((m) => LOGOS_REDES[m.id])
  const anuncios = new Map((Array.isArray(redesResumo) ? redesResumo : []).map((r) => [String(r.id), Number(r.anuncios) || 0]))
  const total = redes.reduce((soma, m) => soma + (anuncios.get(String(m.id)) ?? 0), 0)
  if (redes.length === 0) return null

  return (
    <div className="sm-radar mx-auto w-full max-w-5xl">
      <div className="sm-radar__hub">
        <span className="sm-radar__hub-logo">
          <SmartMarketLogo size="sm" className="h-7" />
        </span>
        <span className="sm-radar__hub-title">Motor de Coleta</span>
        {total > 0 && <span className="sm-radar__hub-badge">{numero(total)} preços sincronizados</span>}
      </div>

      <svg className="sm-radar__wires" viewBox={`0 0 ${LARGURA_SVG} ${ALTURA_SVG}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {redes.map((m, i) => (
          <g key={m.id}>
            <path d={caminho(i, redes.length)} className="sm-radar__wire" pathLength="100" vectorEffect="non-scaling-stroke" />
            <path d={caminho(i, redes.length)} className="sm-radar__beam" pathLength="100" vectorEffect="non-scaling-stroke" style={{ animationDelay: `${i * 0.55}s` }} />
          </g>
        ))}
      </svg>
      <span className="sm-radar__stem" aria-hidden="true" />

      <ul role="group" aria-label="Redes com coleta de preços" className="sm-radar__cards" style={{ "--n": redes.length }}>
        {redes.map((mercado) => {
          const logo = LOGOS_REDES[mercado.id]
          const selecionado = selectedMarket === mercado.id
          const qtd = anuncios.get(String(mercado.id))
          return (
            <li key={mercado.id}>
              <button
                type="button"
                className={`sm-radar__card${selecionado ? " is-selected" : ""}`}
                aria-pressed={selecionado}
                onClick={() => onSelect?.(mercado.id)}
              >
                <span className="sm-radar__node" aria-hidden="true" />
                <span className="sm-radar__logo">
                  <img src={logo.src} alt={mercado.name} width={logo.largura} height={logo.altura} draggable={false} decoding="async" />
                </span>
                <span className="sm-radar__status">
                  <span className="sm-radar__dot" aria-hidden="true" />
                  Coleta ativa
                </span>
                {qtd > 0 && <span className="sm-radar__count">{numero(qtd)} anúncios</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
