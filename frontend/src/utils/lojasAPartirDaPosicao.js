import { distanciaKm } from "./haversine"

const ehNumero = (valor) => typeof valor === "number" && Number.isFinite(valor)
const arredondar2 = (km) => Math.round(km * 100) / 100

const posicaoValida = (posicao) => ehNumero(posicao?.latitude) && ehNumero(posicao?.longitude)
const filialValida = (filial) =>
  filial != null && filial.mercadoId != null && ehNumero(filial.latitude) && ehNumero(filial.longitude)

const distanciaAte = (posicao, loja) =>
  ehNumero(loja?.latitude) && ehNumero(loja?.longitude)
    ? arredondar2(distanciaKm(posicao.latitude, posicao.longitude, loja.latitude, loja.longitude))
    : null

// Filial pública (GET /api/lojas/filiais) no formato de /api/lojas/proximas, que é o que os cartões leem.
const paraLoja = (filial, distancia) => ({
  mercadoId: filial.mercadoId,
  mercadoNome: filial.mercadoNome,
  lojaId: filial.lojaId,
  lojaNome: filial.lojaNome,
  endereco: null,
  cidade: null,
  uf: null,
  latitude: filial.latitude,
  longitude: filial.longitude,
  distanciaKm: distancia,
  padrao: false,
  preferida: false,
})

// Da mais perto à mais longe; sem distância no fim (a ordem de entrada decide o resto).
const porDistancia = (a, b) => {
  if (a.distanciaKm == null && b.distanciaKm == null) return 0
  if (a.distanciaKm == null) return 1
  if (b.distanciaKm == null) return -1
  return a.distanciaKm - b.distanciaKm
}

/**
 * Lojas por rede a partir da posição do navegador, no formato de /api/lojas/proximas (os cartões, o selo
 * "Mais perto" e o seletor leem esse formato). Uma loja por rede, com esta precedência:
 *   1. a loja preferida do usuário (vem de `lojasDoCep`), com a distância medida da posição;
 *   2. a filial pública mais perto da posição (empate: a primeira da lista, a API ordena por id);
 *   3. a loja padrão da rede (de `lojasDoCep`), sem distância.
 * As distâncias vêm sempre da posição, nunca do CEP. Posição inválida devolve `lojasDoCep` como veio.
 * Nada é gravado nem enviado: é só conta em memória.
 */
export function lojasAPartirDaPosicao(posicao, lojasDoCep, filiaisPublicas) {
  const doCep = Array.isArray(lojasDoCep) ? lojasDoCep : []
  if (!posicaoValida(posicao)) return lojasDoCep
  const publicas = (Array.isArray(filiaisPublicas) ? filiaisPublicas : []).filter(filialValida)

  const escolhidas = new Map() // mercadoId -> loja

  // 1. preferida
  for (const loja of doCep) {
    if (loja?.preferida === true && loja.mercadoId != null && !escolhidas.has(loja.mercadoId)) {
      escolhidas.set(loja.mercadoId, { ...loja, distanciaKm: distanciaAte(posicao, loja) })
    }
  }

  // 2. filial pública mais perto
  const melhorPorRede = new Map() // mercadoId -> { filial, distancia }
  for (const filial of publicas) {
    if (escolhidas.has(filial.mercadoId)) continue
    const distancia = distanciaAte(posicao, filial)
    const atual = melhorPorRede.get(filial.mercadoId)
    if (!atual || distancia < atual.distancia) melhorPorRede.set(filial.mercadoId, { filial, distancia })
  }
  for (const [mercadoId, { filial, distancia }] of melhorPorRede) {
    escolhidas.set(mercadoId, paraLoja(filial, distancia))
  }

  // 3. padrão
  for (const loja of doCep) {
    if (loja?.padrao === true && loja.mercadoId != null && !escolhidas.has(loja.mercadoId)) {
      escolhidas.set(loja.mercadoId, { ...loja, distanciaKm: null })
    }
  }

  return [...escolhidas.values()].sort(porDistancia)
}
