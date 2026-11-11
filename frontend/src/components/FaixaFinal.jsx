import { useState } from "react"
import { Link } from "react-router-dom"

// Perfis de compra. Só mensagens: o projeto não tem cestas predefinidas, então nenhuma quantidade,
// preço, economia ou rede vencedora é mostrada por perfil.
const PERFIS = [
  { id: "cesta", rotulo: "Cesta Básica", mensagem: "Explore os produtos essenciais." },
  { id: "semana", rotulo: "Compra da Semana", mensagem: "Compare os itens do seu dia a dia." },
  { id: "mes", rotulo: "Rancho do Mês", mensagem: "Organize uma compra maior." },
]

/** Borda serrilhada do cupom, na cor do papel. */
function BordaSerrilhada() {
  return (
    <svg aria-hidden="true" className="block h-2.5 w-full text-white" preserveAspectRatio="none" viewBox="0 0 200 10">
      <defs>
        <pattern id="sm-serrilha" width="10" height="10" patternUnits="userSpaceOnUse">
          <polygon points="0,0 10,0 5,10" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="200" height="10" fill="url(#sm-serrilha)" />
    </svg>
  )
}

/**
 * Faixa final da landing: chamada e seletor de perfil de compra à esquerda; à direita, um cupom que
 * troca a mensagem conforme o perfil e leva às rotas originais (/list e /catalog).
 * `redesAtivas` é um dado real (redes com coleta ativa); nada é estimado.
 */
export function FaixaFinal({ redesAtivas }) {
  const [perfilId, setPerfilId] = useState("semana")
  const perfil = PERFIS.find((p) => p.id === perfilId) ?? PERFIS[1]

  // Navegação por teclado de radiogroup: setas movem e selecionam, Home/End vão às pontas.
  function aoTeclar(evento, indice) {
    const teclas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    let alvo = null
    if (evento.key in teclas) alvo = (indice + teclas[evento.key] + PERFIS.length) % PERFIS.length
    else if (evento.key === "Home") alvo = 0
    else if (evento.key === "End") alvo = PERFIS.length - 1
    if (alvo === null) return
    evento.preventDefault()
    setPerfilId(PERFIS[alvo].id)
    evento.currentTarget.parentElement.querySelectorAll('[role="radio"]')[alvo]?.focus()
  }

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="faixa-final-titulo">
      <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] lg:grid-cols-12">
        <div className="flex flex-col justify-center bg-[#0b192c] px-6 py-12 text-white sm:px-12 lg:col-span-7">
          <h2
            id="faixa-final-titulo"
            className="font-display text-3xl font-extrabold tracking-tight text-balance sm:text-5xl"
          >
            A próxima compra
            <span className="block text-[#34d399]">pode custar menos.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            Abra a lista ou entre no catálogo. Os preços continuam os do SmartMarket, sem estimativa inventada.
          </p>

          <div role="radiogroup" aria-label="Perfil de compra" className="mt-8 flex flex-wrap gap-2">
            {PERFIS.map((p, indice) => {
              const ativo = p.id === perfilId
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  tabIndex={ativo ? 0 : -1}
                  onClick={() => setPerfilId(p.id)}
                  onKeyDown={(e) => aoTeclar(e, indice)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34d399] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                    ativo
                      ? "scale-105 bg-[#34d399] text-[#0b192c] motion-reduce:scale-100"
                      : "bg-white/10 text-white ring-1 ring-inset ring-white/25 hover:bg-white/20"
                  }`}
                >
                  {p.rotulo}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-center bg-gradient-to-br from-[#16324F] to-brand-green-dark px-4 py-12 sm:px-10 lg:col-span-5">
          <div className="w-full max-w-sm drop-shadow-xl">
            <div className="rounded-t-2xl bg-white px-6 pt-6 pb-5 text-brand-navy">
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-brand-muted">
                SmartMarket · Seu cupom
              </p>

              <div className="mt-5 border-y border-dashed border-brand-border py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Perfil</p>
                {/* Altura fixa: trocar o perfil não move os botões. A key refaz só o fade do texto. */}
                <div className="mt-1 min-h-[4.5rem]" aria-live="polite">
                  <div key={perfil.id} className="sm-ticket-troca">
                    <p className="font-display text-xl font-extrabold">{perfil.rotulo}</p>
                    <p className="mt-1 text-sm text-brand-muted">{perfil.mensagem}</p>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-center text-[11px] leading-snug text-brand-muted">
                Preços coletados em {redesAtivas} redes com coleta ativa. Sem estimativa de economia.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  to="/list"
                  className="sm-cta justify-center py-4 text-base shadow-md active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  Abrir minha lista
                  <span className="sm-cta-arrow" aria-hidden="true">&rarr;</span>
                </Link>
                <Link
                  to="/catalog"
                  className="sm-cta justify-center bg-transparent! text-brand-navy! ring-1 ring-inset ring-brand-navy/30 hover:bg-brand-green-light! active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  Ver o catálogo
                </Link>
              </div>
            </div>
            <BordaSerrilhada />
          </div>
        </div>
      </div>
    </section>
  )
}
