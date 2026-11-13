import { indexarLojasPorRede } from "./casarLojaComRede"
import { filtrarLojasPorRaio } from "./raioLojas"

const ehNumero = (valor) => typeof valor === "number" && Number.isFinite(valor)

// Loja da API (LojaProximaResponse) -> o formato que os cartões do catálogo já leem. As coordenadas
// são as da LOJA (para o "Como chegar") e só passam como par: meia coordenada vira as duas nulas.
const paraCartao = (loja) => {
  const comCoordenadas = ehNumero(loja.latitude) && ehNumero(loja.longitude)
  return {
    nomeFilial: loja.lojaNome,
    endereco: loja.endereco,
    cidade: loja.cidade,
    uf: loja.uf,
    latitude: comCoordenadas ? loja.latitude : null,
    longitude: comCoordenadas ? loja.longitude : null,
    distanciaKm: loja.distanciaKm ?? null,
    lojaId: loja.lojaId,
    padrao: loja.padrao === true,
    preferida: loja.preferida === true,
  }
}

/**
 * Lojas da API prontas para os cartões: { [String(market.id)]: filial }, uma por rede.
 */
export function filiaisParaCartoes(lojas, markets, raioKm) {
  // Loja padrão sem distância não diz nada de útil no cartão: fica fora (a não padrão continua).
  const comLocal = filtrarLojasPorRaio(lojas, raioKm).filter(
    (loja) => !(loja?.padrao === true && loja.distanciaKm == null),
  )
  const porRede = indexarLojasPorRede(comLocal, markets)
  return Object.fromEntries(Object.entries(porRede).map(([idDaRede, loja]) => [idDaRede, paraCartao(loja)]))
}

/**
 * A rede com a loja mais perto do usuário, entre as que têm distância calculada: { id, nome,
 * distanciaKm }, ou `null` quando nenhuma loja tem distância ou quando há empate na menor (sem
 * critério justo para destacar uma só). `filiais` é o resultado de filiaisParaCartoes.
 */
export function redeMaisPerto(filiais, markets) {
  const comDistancia = Object.entries(filiais ?? {}).filter(([, filial]) => ehNumero(filial?.distanciaKm))
  if (comDistancia.length === 0) return null

  const menor = Math.min(...comDistancia.map(([, filial]) => filial.distanciaKm))
  const empatadas = comDistancia.filter(([, filial]) => filial.distanciaKm === menor)
  if (empatadas.length !== 1) return null

  const [id, filial] = empatadas[0]
  const rede = (Array.isArray(markets) ? markets : []).find((market) => String(market.id) === id)
  return { id, nome: rede?.name ?? filial.nomeFilial, distanciaKm: filial.distanciaKm }
}
