import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react"

const LINHA_FIXA = ["Sua", "lista."]
// A primeira variação é a frase original da hero; quem não vê animação (movimento reduzido) lê só ela.
const VARIACOES = ["O menor preço.", "Mais barata.", "Num só lugar.", "Mercado certo."]
const FRASE_COMPLETA = `${LINHA_FIXA.join(" ")} ${VARIACOES[0]}`
const INTERVALO_MS = 2800

/** Uma palavra por máscara (overflow hidden): a palavra sobe de dentro dela, com atraso crescente. */
function Palavra({ texto, indice }) {
  return (
    <span className="sm-w">
      <span className="sm-w__in" style={{ "--i": indice }}>
        {texto}
      </span>
    </span>
  )
}

/**
 * Headline da hero com animação de palavras: entrada palavra a palavra e um complemento que alterna
 * entre variações a cada 2,8 s, com sublinhado desenhado à mão que acompanha a largura da palavra ativa.
 * As variações ficam empilhadas na mesma célula de um grid (altura e largura estáveis, sem layout shift).
 * O leitor de tela lê só a frase completa do aria-label; os fragmentos são aria-hidden.
 */
export function HeroHeadline() {
  const [ativo, setAtivo] = useState(0)
  const [anterior, setAnterior] = useState(null)
  const [reduzido, setReduzido] = useState(false)
  const [larguras, setLarguras] = useState([])
  const refs = useRef([])

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    const ler = () => setReduzido(media?.matches ?? false)
    ler()
    media?.addEventListener?.("change", ler)
    return () => media?.removeEventListener?.("change", ler)
  }, [])

  useEffect(() => {
    if (reduzido) return undefined
    const id = window.setInterval(() => {
      setAtivo((atual) => {
        setAnterior(atual)
        return (atual + 1) % VARIACOES.length
      })
    }, INTERVALO_MS)
    return () => window.clearInterval(id)
  }, [reduzido])

  // Mede cada variação (e de novo quando a fonte carrega ou a janela muda) para o sublinhado se ajustar.
  useLayoutEffect(() => {
    const medir = () => setLarguras(refs.current.map((el) => (el ? el.offsetWidth : 0)))
    medir()
    window.addEventListener("resize", medir)
    document.fonts?.ready?.then(medir)
    return () => window.removeEventListener("resize", medir)
  }, [])

  const inicioDoSlot = LINHA_FIXA.length

  return (
    <h1 className="sm-hero-title mt-4" aria-label={FRASE_COMPLETA}>
      <span className="block" aria-hidden="true">
        {LINHA_FIXA.map((p, i) => (
          <Fragment key={p}>
            {i > 0 && " "}
            <Palavra texto={p} indice={i} />
          </Fragment>
        ))}
      </span>
      <span className="sm-slot block text-[#7dffe0]" aria-hidden="true">
        <span className="sm-slot__palavras" style={{ "--i": inicioDoSlot }}>
          {VARIACOES.map((texto, i) => (
            <span
              key={texto}
              ref={(el) => {
                refs.current[i] = el
              }}
              className={`sm-slot__item${i === ativo ? " is-ativo" : i === anterior ? " is-saindo" : ""}`}
            >
              {texto}
            </span>
          ))}
        </span>
        <svg
          key={ativo}
          className="sm-slot__traco"
          style={{ width: larguras[ativo] ? `${larguras[ativo]}px` : undefined }}
          viewBox="0 0 200 12"
          preserveAspectRatio="none"
          focusable="false"
        >
          <path d="M2 8 C 26 2, 52 11, 88 6 S 150 2, 198 7" pathLength="1" />
        </svg>
      </span>
    </h1>
  )
}
