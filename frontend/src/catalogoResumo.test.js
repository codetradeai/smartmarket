import fs from 'fs'
import path from 'path'
import { CATEGORIES, MARKETS, TOTAIS } from './catalogoResumo'

// Lê o data.js como texto (32 MB), sem passar pelo transformador do Jest e sem alterá-lo.
const fonte = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8')
const dados = {}
new Function('exports', fonte.replace(/export const (\w+)/g, 'const $1 = exports.$1'))(dados)
const { PRODUCTS } = dados

const redes = (p) => Object.values(p.prices || {}).filter((v) => typeof v === 'number' && v > 0).length
const distintos = (filtro = () => true) =>
  new Set(PRODUCTS.filter(filtro).map((p) => `${p.supermercadoOrigem}|${p.idOrigem}`)).size

describe('catalogoResumo.js confere com o data.js', () => {
  it('MARKETS e CATEGORIES são idênticos aos do data.js', () => {
    expect(MARKETS).toEqual(dados.MARKETS)
    expect(CATEGORIES).toEqual(dados.CATEGORIES)
  })

  it('o total de produtos é por (rede, id de origem), menor que o de ids de catálogo', () => {
    expect(TOTAIS.idsDeCatalogo).toBe(PRODUCTS.length)
    expect(TOTAIS.produtosDistintos).toBe(distintos())
    expect(TOTAIS.produtosDistintos).toBe(9277)
    expect(TOTAIS.produtosDistintos).toBeLessThan(TOTAIS.idsDeCatalogo)
  })

  it('os totais de cobertura da Home conferem', () => {
    expect(TOTAIS.produtosComPreco).toBe(distintos((p) => redes(p) > 0))
    expect(TOTAIS.produtosEm2Redes).toBe(distintos((p) => redes(p) >= 2))
  })

  it('não importa o data.js (continua leve)', () => {
    const codigo = fs.readFileSync(path.join(__dirname, 'catalogoResumo.js'), 'utf8')
    expect(codigo).not.toMatch(/from\s+['"][^'"]*\/data['"]/)
    expect(codigo.length).toBeLessThan(10 * 1024)
  })
})
