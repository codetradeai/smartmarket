const URL_ROTA = "https://www.google.com/maps/dir/?api=1&destination="

// Seis casas decimais são ~0,1 m: de sobra para uma loja. `Number(...)` tira os zeros à direita e
// garante que nunca saia notação científica (1e-7) no link.
const coordenada = (valor) => Number(valor.toFixed(6)).toString()

/**
 * Link "Como chegar" do Google Maps até a loja, ou `null` se não houver um par de coordenadas válido.
 *
 * Só leva o ponto da loja (dado público do endereço da filial): sem origem, para o próprio app de
 * mapas pedir a localização ao aparelho, e nada que identifique o usuário. Só aceita números finitos
 * (nada de texto, `null` ou `undefined`) dentro da faixa real (latitude de -90 a 90, longitude de
 * -180 a 180), sempre os dois juntos: meia coordenada nunca vira link.
 */
export function linkComoChegar(latitude, longitude) {
  const ehNumero = (valor) => typeof valor === "number" && Number.isFinite(valor)
  if (!ehNumero(latitude) || !ehNumero(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return `${URL_ROTA}${coordenada(latitude)},${coordenada(longitude)}`
}
