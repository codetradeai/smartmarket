// Monta, para os testes, o equivalente do src/catalogoResumo.js (gerado do data.js real) a partir
// dos dados mockados do '../data'. Uso:
//   jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../data')))
// Mantém a regra do gerador: totais por produto distinto (rede + id de origem), sem números digitados.
const redesComPreco = (p) => Object.values(p.prices || {}).filter((v) => typeof v === 'number' && v > 0).length
const chave = (p) =>
  p.supermercadoOrigem && p.idOrigem != null && p.idOrigem !== '' ? `${p.supermercadoOrigem}|${p.idOrigem}` : `catalogo|${p.id}`

export function resumoDe({ PRODUCTS = [], MARKETS = [], CATEGORIES = [] }) {
  const distintos = (filtro = () => true) => new Set(PRODUCTS.filter(filtro).map(chave)).size
  return {
    MARKETS,
    CATEGORIES,
    TOTAIS: {
      idsDeCatalogo: PRODUCTS.length,
      produtosDistintos: distintos(),
      produtosComPreco: distintos((p) => redesComPreco(p) > 0),
      produtosEm2Redes: distintos((p) => redesComPreco(p) >= 2),
    },
    REDES_COM_PRODUTOS: MARKETS.map((m) => ({
      id: m.id,
      anuncios: distintos((p) => typeof p.prices?.[m.id] === 'number' && p.prices[m.id] > 0),
    })),
  }
}
