import { linkComoChegar, linkWaze } from "../utils/linkComoChegar"
import { dicaDistancia, textoDistancia, textoDistanciaFalado } from "../utils/textoDistancia"

const AVISO_PRECO = (rede) => `O preço vale para toda a rede ${rede}; a loja é só referência.`

// O chip é uma coluna de duas linhas, para o nome da loja nunca ser espremido pelo resto: com prefixo,
// distância, preço e links na mesma linha o nome encolhia até sumir ("Za…", ou nada) e o link era cortado
// em cartões estreitos. Linha 1: pin, prefixo e nome. Linha 2 (só se houver algo): distância, preço e
// os links, que quebram sozinhos se não couberem. Como a linha 2 sempre começa pela distância, nunca
// começa com um "•" solto: o "•" só aparece entre a distância e o preço.
const CLASSE_CHIP = {
  completo:
    "flex flex-col gap-0.5 text-[11px] leading-snug font-bold text-emerald-900 bg-emerald-50/90 border border-emerald-200/90 px-2.5 py-1.5 rounded-xl",
  compacto:
    "flex flex-col gap-0.5 text-[10px] leading-snug font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg",
}

// Link para o app de mapas: outra aba, sem referrer, e o clique NÃO sobe ao cartão (que abriria o
// detalhe do produto). Só é renderizado com coordenadas válidas (o `href` vem dos helpers de link).
function LinkDoMapa({ href, rotuloAcessivel, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      aria-label={rotuloAcessivel}
      onClick={(evento) => evento.stopPropagation()}
      className="shrink-0 font-bold text-emerald-900 underline underline-offset-2 hover:text-emerald-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50"
    >
      {children}
    </a>
  )
}

/**
 * A loja de uma rede no cartão do produto: nome, distância e os links "Como chegar" (Google Maps) e
 * "Waze". É só referência: o preço é da REDE, e o tooltip diz isso. Nunca mostra endereço nem sugere
 * preço por loja.
 *
 * - `filial`: a loja no formato dos cartões (nomeFilial, distanciaKm, latitude, longitude).
 * - `nomeRede`: rede da loja, para o tooltip "O preço vale para toda a rede ...".
 * - `rotulo`: texto antes do nome ("Loja de referência:", "Mais perto:"); sem ele só aparece o nome.
 * - `preco`: preço da rede (número), quando a linha também mostra o preço ("Mais perto: ... • R$ 7.90").
 * - `compacto`: versão dos cartões das prateleiras.
 * - `origem`: de onde a distância foi medida, "cep" (padrão) ou "navegador" (posição atual); só muda a dica.
 */
export default function LojaDoCartao({ filial, nomeRede = "", rotulo = null, preco = null, compacto = false, origem = "cep" }) {
  if (!filial) return null

  const distancia = textoDistancia(filial.distanciaKm)
  const linkGoogle = linkComoChegar(filial.latitude, filial.longitude)
  const linkDoWaze = linkWaze(filial.latitude, filial.longitude)
  const titulo = [[filial.nomeFilial, distancia].filter(Boolean).join(" • "), nomeRede ? AVISO_PRECO(nomeRede) : null]
    .filter(Boolean)
    .join(". ")
  const precoValido = typeof preco === "number" && Number.isFinite(preco)
  const temDetalhes = Boolean(distancia || precoValido || linkGoogle || linkDoWaze)

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
      {temDetalhes && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {distancia && (
            <>
              {/* "≈" é lido de forma inconsistente: o visual fica aria-hidden e o texto falado vai ao lado. */}
              <span aria-hidden="true" title={dicaDistancia(origem)} className="text-emerald-700 font-extrabold shrink-0">
                {distancia}
              </span>
              <span className="sr-only">{textoDistanciaFalado(filial.distanciaKm, origem)}</span>
            </>
          )}
          {precoValido && (
            <span className="font-extrabold shrink-0">
              {distancia ? "• " : ""}R$ {preco.toFixed(2)}
            </span>
          )}
          {(linkGoogle || linkDoWaze) && (
            <span className="ml-auto flex shrink-0 items-center gap-2.5">
              {linkGoogle && (
                <LinkDoMapa href={linkGoogle} rotuloAcessivel={`Como chegar a ${filial.nomeFilial} (abre o mapa em outra aba)`}>
                  Como chegar
                </LinkDoMapa>
              )}
              {linkDoWaze && (
                <LinkDoMapa href={linkDoWaze} rotuloAcessivel={`Abrir a rota até ${filial.nomeFilial} no Waze (abre em outra aba)`}>
                  Waze
                </LinkDoMapa>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
