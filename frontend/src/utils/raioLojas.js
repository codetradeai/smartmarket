/** Raios (em km) que o usuário pode escolher para ver lojas; "todos" não limita a distância. */
export const OPCOES_RAIO = [3, 5, 10, 20, "todos"]
export const RAIO_PADRAO = "todos"

/** Devolve uma das OPCOES_RAIO. Texto numérico vira número ("5" -> 5); o resto vira RAIO_PADRAO. */
export function normalizarRaio(valor) {
  let candidato = valor
  if (typeof valor === "string") {
    const texto = valor.trim()
    candidato = texto === "" || texto === "todos" ? texto : Number(texto)
  }
  return OPCOES_RAIO.includes(candidato) ? candidato : RAIO_PADRAO
}

/**
 * Lojas dentro do raio. Loja sem distância calculada nunca é escondida; "todos" devolve tudo.
 * Raio que não é uma das OPCOES_RAIO conta como "todos": valor inválido não esconde loja.
 */
export function filtrarLojasPorRaio(lojas, raioKm) {
  if (!Array.isArray(lojas)) return []
  const raio = normalizarRaio(raioKm)
  if (raio === "todos") return lojas
  return lojas.filter((loja) => loja?.distanciaKm == null || loja.distanciaKm <= raio)
}
