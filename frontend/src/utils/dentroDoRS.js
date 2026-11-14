// Caixa aproximada do Rio Grande do Sul (lat -33,75 a -27,08; lon -57,65 a -49,69) com ~25 km de margem.
// É só para avisar quem está longe demais para "a loja mais perto" fazer sentido, não uma fronteira exata.
const LAT_MIN = -34.0
const LAT_MAX = -26.8
const LON_MIN = -57.9
const LON_MAX = -49.4

const ehNumero = (valor) => typeof valor === "number" && Number.isFinite(valor)

/** `true` quando o ponto cai na caixa do RS (com a margem). Coordenada inválida nunca é "dentro". */
export function dentroDoRS(latitude, longitude) {
  if (!ehNumero(latitude) || !ehNumero(longitude)) return false
  return latitude >= LAT_MIN && latitude <= LAT_MAX && longitude >= LON_MIN && longitude <= LON_MAX
}
