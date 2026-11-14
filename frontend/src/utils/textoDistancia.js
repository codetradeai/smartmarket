/**
 * Dica da distância mostrada ao usuário (tooltip). Centralizada aqui para o cartão da loja e o seletor
 * de CEP dizerem exatamente o mesmo.
 */
export const DICA_DISTANCIA = "Distância em linha reta, calculada a partir do seu CEP"

/**
 * Distância em km no formato brasileiro, com uma casa decimal e o "≈" ("≈ 3,5 km"): a coordenada vem
 * de um geocodificador, então a distância nunca é exata. `null` quando não há um número (loja sem
 * distância calculada), para o chamador simplesmente não mostrar nada.
 */
export function textoDistancia(km) {
  if (typeof km !== "number" || !Number.isFinite(km)) return null
  return `≈ ${km.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
}

/**
 * Mesma distância, escrita para leitor de tela: o "≈" é lido de forma inconsistente, então o texto visual
 * fica `aria-hidden` e este vai num `sr-only` ao lado. `null` quando não há número.
 */
export function textoDistanciaFalado(km) {
  const visual = textoDistancia(km)
  if (!visual) return null
  return `aproximadamente ${visual.replace("≈ ", "")}, em linha reta, a partir do seu CEP`
}
