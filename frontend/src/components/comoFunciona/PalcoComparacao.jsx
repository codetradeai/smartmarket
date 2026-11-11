import { MERCADOS_DEMO, PRODUTOS_DEMO, brl, economiaDemo, indiceMenor, totaisDemo } from "./comoFuncionaDados"

const TOTAIS = totaisDemo()
const VENCEDOR = indiceMenor(TOTAIS)
const ECONOMIA = economiaDemo()

// Cada elemento anima por --a/--b: trecho do progresso (0 a 1) em que ele entra. O CSS calcula --t.
const janela = (a, b) => ({ "--a": a, "--b": b })

/**
 * Interface única da demonstração: a mesma tabela evolui da lista (passo 1) para a comparação (2) e o
 * resultado (3). O progresso vem da variável CSS --p, escrita pelo pai sem re-render; `calculo` (0 a 1) e
 * `contagem` são os únicos valores em estado, para os números mudarem de forma discreta.
 */
export function PalcoComparacao({ contagem, calculo, passo }) {
  const vencedor = MERCADOS_DEMO[VENCEDOR]
  return (
    <div className="sm-stage" role="img" aria-label={`Demonstração ilustrativa: a cesta de 3 itens fecha mais barata no ${vencedor}, ${brl(ECONOMIA)} a menos que no mais caro.`}>
      <div className="sm-stage__bar">
        <span className="sm-stage__title">Minha lista</span>
        <span className="sm-stage__count" aria-hidden="true">
          {contagem} {contagem === 1 ? "item" : "itens"}
        </span>
        <span className="sm-stage__demo">Exemplo ilustrativo</span>
      </div>

      <div className="sm-stage__table" aria-hidden="true">
        <div className="sm-stage__row sm-stage__row--head">
          <span />
          {MERCADOS_DEMO.map((nome, m) => (
            <span
              key={nome}
              className={`sm-stage__cell sm-story-fade${passo === 2 && m === VENCEDOR ? " is-win" : ""}`}
              style={janela(0.36 + m * 0.02, 0.46 + m * 0.02)}
            >
              {nome}
            </span>
          ))}
        </div>

        <div className="sm-stage__body">
          <div className="sm-stage__scan" />
          {PRODUTOS_DEMO.map((produto, i) => {
            const menor = indiceMenor(produto.precos)
            return (
              <div key={produto.id} className="sm-stage__row sm-story-rise" style={janela(0.03 + i * 0.09, 0.11 + i * 0.09)}>
                <span className="sm-stage__item">
                  <span className="sm-stage__check sm-story-fade" style={janela(0.1 + i * 0.09, 0.2 + i * 0.09)} />
                  <span>
                    <strong>{produto.nome}</strong>
                    <small>{produto.detalhe}</small>
                  </span>
                </span>
                {produto.precos.map((preco, m) => (
                  <span
                    key={m}
                    className={`sm-stage__cell sm-stage__price sm-story-fade${m === menor ? " is-min" : ""}`}
                    style={janela(0.42 + i * 0.06 + m * 0.01, 0.5 + i * 0.06 + m * 0.01)}
                  >
                    <span>{brl(preco)}</span>
                    {m === menor && (
                      <i className="sm-stage__min sm-story-fade" style={janela(0.5 + i * 0.06, 0.58 + i * 0.06)}>
                        menor
                      </i>
                    )}
                  </span>
                ))}
              </div>
            )
          })}
        </div>

        <div className="sm-stage__row sm-stage__row--total sm-story-fade" style={janela(0.4, 0.5)}>
          <span className="sm-stage__item">
            <strong>Total da cesta</strong>
          </span>
          {TOTAIS.map((total, m) => (
            <span key={m} className={`sm-stage__cell sm-stage__sum${passo === 2 && m === VENCEDOR ? " is-win" : ""}`}>
              {brl(total * calculo)}
              {passo === 2 && m === VENCEDOR && <b className="sm-stage__badge">Mais barato</b>}
            </span>
          ))}
        </div>
      </div>

      <p className="sm-stage__result sm-story-rise" style={janela(0.72, 0.84)} aria-hidden="true">
        <strong>{vencedor}</strong> fecha a cesta {brl(ECONOMIA)} mais barata que o mais caro.
        <small> Valores de demonstração, não do catálogo.</small>
      </p>
    </div>
  )
}
