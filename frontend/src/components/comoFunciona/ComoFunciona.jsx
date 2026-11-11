import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { PalcoComparacao } from "./PalcoComparacao"
import { INICIO_PASSO, PASSOS, PRODUTOS_DEMO, passoDoProgresso } from "./comoFuncionaDados"

const PASSOS_DE_CALCULO = 20 // o total "sobe" em 20 degraus, para não renderizar a cada pixel

const limitar = (v) => Math.min(1, Math.max(0, v))

/**
 * Seção de scrollytelling. A altura extra da seção + um painel `sticky` fazem o scroll nativo controlar o
 * progresso (0 a 1), escrito na variável CSS --p. Sem listener de wheel: o scroll da página não é tocado.
 * Com prefers-reduced-motion a seção vira estática, já no estado final.
 */
export function ComoFunciona() {
  const secaoRef = useRef(null)
  const [reduzido, setReduzido] = useState(false)
  const [estado, setEstado] = useState({ passo: 0, contagem: 0, calculo: 0 })

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    const aplicar = () => setReduzido(media?.matches ?? false)
    aplicar()
    media?.addEventListener?.("change", aplicar)
    return () => media?.removeEventListener?.("change", aplicar)
  }, [])

  useEffect(() => {
    const secao = secaoRef.current
    if (!secao) return undefined
    const atualizar = (p) => {
      secao.style.setProperty("--p", p.toFixed(4))
      const contagem = Math.min(PRODUTOS_DEMO.length, Math.round(limitar(p / 0.3) * PRODUTOS_DEMO.length))
      const calculo = Math.round(limitar((p - 0.42) / 0.26) * PASSOS_DE_CALCULO) / PASSOS_DE_CALCULO
      const passo = passoDoProgresso(p)
      setEstado((atual) =>
        atual.passo === passo && atual.contagem === contagem && atual.calculo === calculo ? atual : { passo, contagem, calculo },
      )
    }
    if (reduzido) {
      atualizar(1)
      return undefined
    }
    let quadro = 0
    const ler = () => {
      quadro = 0
      const caixa = secao.getBoundingClientRect()
      const percurso = caixa.height - window.innerHeight
      atualizar(percurso > 0 ? limitar(-caixa.top / percurso) : 1)
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
  }, [reduzido])

  const { passo, contagem, calculo } = estado

  return (
    <section
      id="como-funciona"
      ref={secaoRef}
      className={`sm-story${reduzido ? " sm-story--static" : ""}`}
      style={{ "--p": 1 }}
      aria-labelledby="como-funciona-titulo"
    >
      <div className="sm-story__pin">
        <div className="sm-story__inner">
          <div className="sm-story__copy">
            <h2 id="como-funciona-titulo" className="sm-story__headline">
              Sua lista.
              <span>Nossa comparação.</span>
              <span className="sm-story__accent">Sua economia.</span>
            </h2>

            <ol className="sm-story__steps">
              {PASSOS.map((p, i) => (
                <li
                  key={p.numero}
                  className={`sm-story__step${i === passo ? " is-active" : ""}`}
                  aria-current={i === passo ? "step" : undefined}
                >
                  <span className="sm-story__num">{p.numero}</span>
                  <div>
                    <h3>{p.titulo}</h3>
                    <p>{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="sm-story__progress" aria-hidden="true">
              <span style={{ left: `${INICIO_PASSO[1] * 100}%` }} />
              <span style={{ left: `${INICIO_PASSO[2] * 100}%` }} />
              <i />
            </div>

            <Link to="/list" className={`sm-cta sm-story__cta${passo === 2 ? " is-primary" : ""}`}>
              Começar pela lista
              <span aria-hidden="true" className="sm-cta-arrow">→</span>
            </Link>
          </div>

          <PalcoComparacao contagem={contagem} calculo={calculo} passo={passo} />
        </div>
      </div>
    </section>
  )
}
