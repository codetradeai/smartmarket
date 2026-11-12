import { nomeCurtoRede } from "./redesDoCatalogo"

/**
 * Chave de comparação de uma rede: nome curto (sem "Supermercados", "Atacadista"...), em minúsculas,
 * sem acentos e sem espaços nas pontas. "" para entrada vazia ou que não é texto.
 */
export function chaveDaRede(nome) {
  if (typeof nome !== "string") return ""
  return nomeCurtoRede({ name: nome })
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}

// Número ou texto só com dígitos. Id numérico nunca é comparado com id de texto.
const ehIdNumerico = (id) =>
  (typeof id === "number" && Number.isFinite(id)) || (typeof id === "string" && /^\d+$/.test(id))

function casa(loja, market, chaveDaLoja) {
  // a) os dois ids são numéricos: decide só o id
  if (ehIdNumerico(market?.id) && ehIdNumerico(loja?.mercadoId)) {
    return Number(market.id) === Number(loja.mercadoId)
  }
  // b) senão, por igualdade da chave do nome (ou do id de texto do market)
  if (!chaveDaLoja) return false
  if (chaveDaRede(market?.name) === chaveDaLoja) return true
  return typeof market?.id === "string" && !ehIdNumerico(market.id) && market.id.toLowerCase() === chaveDaLoja
}

/** Devolve o market do catálogo que corresponde à loja da API, ou null. */
export function casarLojaComRede(loja, markets) {
  const chaveDaLoja = chaveDaRede(loja?.mercadoNome)
  return (Array.isArray(markets) ? markets : []).find((market) => casa(loja, market, chaveDaLoja)) || null
}

/**
 * Indexa as lojas da API pela rede do catálogo: { [String(market.id)]: loja }. Só entram as lojas
 * que casaram; com várias da mesma rede fica a primeira (a API já ordena da mais próxima).
 */
export function indexarLojasPorRede(lojas, markets) {
  const indice = {}
  if (!Array.isArray(lojas)) return indice
  for (const loja of lojas) {
    const market = casarLojaComRede(loja, markets)
    if (market && !(String(market.id) in indice)) indice[String(market.id)] = loja
  }
  return indice
}
