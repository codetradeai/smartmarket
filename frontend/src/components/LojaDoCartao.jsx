import { linkComoChegar } from "../utils/linkComoChegar"
import { textoDistancia } from "../utils/textoDistancia"

const AVISO_PRECO = (rede) => `O preço vale para toda a rede ${rede}; a loja é só referência.`

// O chip QUEBRA em linhas (flex-wrap) em vez de espremer tudo numa só: com prefixo, distância, preço e
// link na mesma linha, o nome da loja era o primeiro a encolher e sumia ("Za…", ou nada) em cartões
// estreitos. Assim o nome fica na primeira linha (truncado só se for maior que o cartão) e a distância,
// o preço e o link caem para a linha de baixo quando não cabem.
const CLASSE_CHIP = {
  completo:
    "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug font-bold text-emerald-900 bg-emerald-50/90 border border-emerald-200/90 px-2.5 py-1.5 rounded-xl",
  compacto:
    "flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] leading-snug font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg",
}

/**
 * A loja de uma rede no cartão do produto: nome, distância e o link "Como chegar". É só referência: o
 * preço é da REDE, e o tooltip diz isso. Nunca mostra endereço nem sugere preço por loja.
 *
 * - `filial`: a loja no formato dos cartões (nomeFilial, distanciaKm, latitude, longitude).
 * - `nomeRede`: rede da loja, para o tooltip "O preço vale para toda a rede ...".
 * - `rotulo`: texto antes do nome ("Loja de referência:", "Mais perto:"); sem ele só aparece o nome.
 * - `preco`: preço da rede (número), quando a linha também mostra o preço ("Mais perto: ... • R$ 7.90").
 * - `compacto`: versão dos cartões das prateleiras.
 */
export default function LojaDoCartao({ filial, nomeRede = "", rotulo = null, preco = null, compacto = false }) {
  if (!filial) return null

  const distancia = textoDistancia(filial.distanciaKm)
  const link = linkComoChegar(filial.latitude, filial.longitude)
  const titulo = [[filial.nomeFilial, distancia].filter(Boolean).join(" • "), nomeRede ? AVISO_PRECO(nomeRede) : null]
    .filter(Boolean)
    .join(". ")
  const precoValido = typeof preco === "number" && Number.isFinite(preco)

  return (
    <div className={CLASSE_CHIP[compacto ? "compacto" : "completo"]} title={titulo}>
      {/* Pin e prefixo ficam juntos. O nome vai ao lado do prefixo se couber; senão desce para a linha
          de baixo e usa a largura inteira do chip, e só é truncado (com o tooltip completo) se ainda
          assim for maior que o chip. Sem prefixo, o nome fica ao lado do pin. */}
      <span className="flex min-w-0 max-w-full flex-wrap items-center gap-x-1">
        <span className={`inline-flex min-w-0 max-w-full items-center gap-1${rotulo ? " shrink-0" : ""}`}>
          <span aria-hidden="true" className="shrink-0 text-xs">
            📍
          </span>
          {rotulo && <span className="font-semibold text-emerald-800">{rotulo}</span>}
          {!rotulo && <span className="truncate min-w-0 max-w-full">{filial.nomeFilial}</span>}
        </span>
        {rotulo && <span className="truncate min-w-0 max-w-full">{filial.nomeFilial}</span>}
      </span>
      {distancia && <span className="text-emerald-700 font-extrabold shrink-0">• {distancia}</span>}
      {precoValido && <span className="font-extrabold shrink-0">• R$ {preco.toFixed(2)}</span>}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          aria-label={`Como chegar a ${filial.nomeFilial} (abre o mapa em outra aba)`}
          // O cartão inteiro abre o detalhe do produto ao clicar: o link só abre o mapa.
          onClick={(evento) => evento.stopPropagation()}
          className="shrink-0 ml-auto font-bold text-emerald-900 underline underline-offset-2 hover:text-emerald-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50"
        >
          Como chegar
        </a>
      )}
    </div>
  )
}
