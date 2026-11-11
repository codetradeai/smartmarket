import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Check, TrendingDown } from "lucide-react"
import { urlPublica } from "../../utils/urlPublica"
import { PRODUTOS_DEMO, brl, indiceMenor } from "./comoFuncionaDados"

// Preços ILUSTRATIVOS (não vêm do catálogo): os 3 mercados de PRODUTOS_DEMO + um quarto, para as 4 redes.
const MERCADOS = ["Mercado A", "Mercado B", "Mercado C", "Mercado D"]
const PRECO_D = [26.2, 20.6, 5.35]
const LINHAS = PRODUTOS_DEMO.map((p, i) => ({ ...p, precos: [...p.precos, PRECO_D[i]] }))
const TOTAIS = MERCADOS.map((_, m) => Math.round(LINHAS.reduce((soma, p) => soma + p.precos[m] * 100, 0)) / 100)
const VENCEDOR = indiceMenor(TOTAIS)
const ECONOMIA = Math.round((Math.max(...TOTAIS) - Math.min(...TOTAIS)) * 100) / 100

const PASSOS = [
  { numero: "01", titulo: "Monte a lista", texto: "Escolha os produtos do dia a dia e guarde a lista para a próxima compra." },
  { numero: "02", titulo: "Cruze os preços", texto: "O comparador olha o preço de cada item nas redes presentes no catálogo." },
  { numero: "03", titulo: "Escolha o mercado", texto: "Veja onde a cesta fecha mais barata antes de sair de casa." },
]
const TEMAS = ["sm-cupom__passo--claro", "sm-cupom__passo--escuro", "sm-cupom__passo--verde"]

const limitar = (v) => Math.min(1, Math.max(0, v))
const passoDoProgresso = (p) => (p >= 0.68 ? 2 : p >= 0.34 ? 1 : 0)

/**
 * "Cupom fiscal vivo": três passos clicáveis à esquerda e um cupom à direita que muda conforme o passo ativo
 * (lista, preços das 4 redes, vencedor). O passo muda pelo scroll (seção alta com painel sticky, só no desktop)
 * e pode ser forçado por clique ou hover; o scroll seguinte volta a mandar. Dados ilustrativos, avisados na tela.
 */
export function CupomViva() {
  const secaoRef = useRef(null)
  const [modoScroll, setModoScroll] = useState(false)
  const [auto, setAuto] = useState(0)
  const [manual, setManual] = useState(null)

  useEffect(() => {
    const desktop = window.matchMedia?.("(min-width: 1024px)")
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    const ler = () => setModoScroll(Boolean(desktop?.matches) && !reduz?.matches)
    ler()
    desktop?.addEventListener?.("change", ler)
    reduz?.addEventListener?.("change", ler)
    return () => {
      desktop?.removeEventListener?.("change", ler)
      reduz?.removeEventListener?.("change", ler)
    }
  }, [])

  useEffect(() => {
    const secao = secaoRef.current
    if (!modoScroll || !secao) return undefined
    let quadro = 0
    const ler = () => {
      quadro = 0
      const caixa = secao.getBoundingClientRect()
      const percurso = caixa.height - window.innerHeight
      setAuto(passoDoProgresso(percurso > 0 ? limitar(-caixa.top / percurso) : 0))
    }
    const agendar = () => {
      if (!quadro) quadro = window.requestAnimationFrame(ler)
    }
    ler()
    window.addEventListener("scroll", agendar, { passive: true })
    window.addEventListener("resize", agendar)
    return () => {
      window.removeEventListener("scroll", agendar)
      window.removeEventListener("resize", agendar)
      if (quadro) window.cancelAnimationFrame(quadro)
    }
  }, [modoScroll])

  // A escolha manual guarda o passo do scroll de quando foi feita: se o scroll mudar de passo, ela deixa de valer.
  const passo = manual && manual.base === auto ? manual.valor : auto
  const escolher = (valor) => setManual({ valor, base: auto })

  return (
    <section
      id="como-funciona"
      ref={secaoRef}
      aria-labelledby="como-funciona-titulo"
      className={`sm-cupom${modoScroll ? " sm-cupom--scroll" : ""}`}
    >
      <div className="sm-cupom__pin">
        <div className="sm-cupom__inner">
          <div className="sm-cupom__copy">
            <div className="sm-cupom__head">
              <h2 id="como-funciona-titulo" className="sm-cupom__title">
                Três passos.
                <span>Uma lista mais barata.</span>
              </h2>
              <p className="sm-cupom__apoio">Sem abrir um aplicativo por rede. A comparação usa os preços que já estão no catálogo.</p>
            </div>

            <ol className="sm-cupom__passos">
              {PASSOS.map((p, i) => (
                <li key={p.numero}>
                  <button
                    type="button"
                    className={`sm-cupom__passo ${TEMAS[i]}${i === passo ? " is-ativo" : ""}`}
                    aria-current={i === passo ? "step" : undefined}
                    onClick={() => escolher(i)}
                    onPointerEnter={(e) => e.pointerType === "mouse" && escolher(i)}
                  >
                    <span className="sm-cupom__num">{p.numero}</span>
                    <span>
                      <strong>{p.titulo}</strong>
                      <small>{p.texto}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <Link to="/list" className={`sm-cupom__cta${passo === 2 ? " is-brilho" : ""}`}>
              Começar pela lista
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <Cupom passo={passo} />
        </div>
      </div>
    </section>
  )
}

function Cupom({ passo }) {
  const vencedor = MERCADOS[VENCEDOR]
  return (
    <div
      className="sm-cupom__paper"
      data-passo={passo}
      role="img"
      aria-label={`Demonstração ilustrativa: a cesta de 3 itens fecha mais barata no ${vencedor}, ${brl(ECONOMIA)} a menos que no mais caro.`}
    >
      <div className="sm-cupom__topo" aria-hidden="true">
        <strong>Cupom SmartMarket</strong>
        <span>Exemplo ilustrativo</span>
      </div>

      <div className="sm-cupom__grade" aria-hidden="true">
        {/* Scanner: o laser varre a grade enquanto o passo 02 (cruzar os preços) está ativo. */}
        <span className="sm-cupom__scan">
          <i />
        </span>
        <div className="sm-cupom__linha sm-cupom__linha--cab">
          <span>Item</span>
          {MERCADOS.map((nome, m) => (
            <span key={nome} className={`sm-cupom__col${m === VENCEDOR ? " is-vencedor" : ""}`} style={{ "--d": `${m * 60}ms` }}>
              {nome}
            </span>
          ))}
        </div>

        {LINHAS.map((p, i) => {
          const menor = indiceMenor(p.precos)
          return (
            <div key={p.id} className="sm-cupom__linha sm-cupom__item" style={{ "--d": `${i * 110}ms` }}>
              <span className="sm-cupom__produto">
                <img src={urlPublica(p.foto)} alt="" width="36" height="36" loading="lazy" decoding="async" />
                <span>
                  <strong>{p.nome}</strong>
                  <small>1 un</small>
                </span>
                <Check size={14} aria-hidden="true" className="sm-cupom__ok" />
              </span>
              {p.precos.map((preco, m) => (
                <span key={m} className={`sm-cupom__col sm-cupom__preco${m === menor ? " is-menor" : ""}`} style={{ "--d": `${120 + i * 90 + m * 50}ms` }}>
                  {brl(preco)}
                </span>
              ))}
            </div>
          )
        })}

        <div className="sm-cupom__linha sm-cupom__linha--total">
          <span>Total da cesta</span>
          {TOTAIS.map((t, m) => (
            <span key={m} className={`sm-cupom__col sm-cupom__soma${m === VENCEDOR ? " is-vencedor" : ""}`} style={{ "--d": `${m * 70}ms` }}>
              {brl(t)}
            </span>
          ))}
        </div>
      </div>

      <p className="sm-cupom__economia" aria-hidden="true">
        <TrendingDown size={16} />
        <span>
          <strong>{vencedor}</strong> fecha a cesta {brl(ECONOMIA)} mais barata que o mais caro
          <small>Valores de demonstração, não do catálogo.</small>
        </span>
      </p>
    </div>
  )
}
