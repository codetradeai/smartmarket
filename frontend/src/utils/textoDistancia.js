/**
 * Distância em km no formato brasileiro, com uma casa decimal ("3,5 km"). `null` quando não há um
 * número (loja sem distância calculada), para o chamador simplesmente não mostrar nada.
 */
export function textoDistancia(km) {
  if (typeof km !== "number" || !Number.isFinite(km)) return null
  return `${km.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
}
