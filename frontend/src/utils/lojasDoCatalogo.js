import { indexarLojasPorRede } from "./casarLojaComRede"
import { filtrarLojasPorRaio } from "./raioLojas"

// Loja da API (LojaProximaResponse) -> o formato que os cartões do catálogo já leem.
const paraCartao = (loja) => ({
  nomeFilial: loja.lojaNome,
  endereco: loja.endereco,
  cidade: loja.cidade,
  uf: loja.uf,
  distanciaKm: loja.distanciaKm ?? null,
  lojaId: loja.lojaId,
  padrao: loja.padrao === true,
  preferida: loja.preferida === true,
})

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
