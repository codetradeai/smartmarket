// Monta, para os testes, o equivalente do src/catalogoResumo.js (gerado do data.js real) a partir
// dos dados mockados do '../data'. Uso:
//   jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../data')))
// Para simular produtos em 2+ redes, passe os equivalentes como 2º argumento:
//   resumoDe(require('../data'), { grupos: [{ confianca: 'confirmado', itens: ['p1', 'p2'] }] })
// Usa a mesma regra do gerador (utils/totaisCatalogo): totais por anúncio (rede + id de origem) e
// produtosEm2Redes só dos grupos confirmados (0 sem equivalentes), sem números digitados.
import { calcularTotais, anunciosPorRede } from '../utils/totaisCatalogo'

export function resumoDe({ PRODUCTS = [], MARKETS = [], CATEGORIES = [] }, equivalentes = null) {
  return {
    MARKETS,
    CATEGORIES,
    TOTAIS: calcularTotais(PRODUCTS, equivalentes),
    REDES_COM_PRODUTOS: anunciosPorRede(PRODUCTS, MARKETS),
  }
}
