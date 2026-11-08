import fs from 'fs'
import path from 'path'
import { CATEGORIES, MARKETS, TOTAIS } from './catalogoResumo'
import { contarGruposConfirmados } from './utils/totaisCatalogo'

// Lê o data.js como texto (32 MB), sem passar pelo transformador do Jest e sem alterá-lo.
const fonte = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8')
const dados = {}
new Function('exports', fonte.replace(/export const (\w+)/g, 'const $1 = exports.$1'))(dados)
const { PRODUCTS } = dados

const redes = (p) => Object.values(p.prices || {}).filter((v) => typeof v === 'number' && v > 0).length
const anuncios = (filtro = () => true) =>
  new Set(PRODUCTS.filter(filtro).map((p) => `${p.supermercadoOrigem}|${p.idOrigem}`)).size

describe('catalogoResumo.js confere com o data.js', () => {
  it('MARKETS e CATEGORIES são idênticos aos do data.js', () => {
    expect(MARKETS).toEqual(dados.MARKETS)
    expect(CATEGORIES).toEqual(dados.CATEGORIES)
  })

  it('o total é de anúncios (rede + id de origem) e o catálogo limpo não tem cópias: anúncios == ids de catálogo', () => {
    expect(TOTAIS.idsDeCatalogo).toBe(PRODUCTS.length)
    expect(TOTAIS.anuncios).toBe(anuncios())
    expect(TOTAIS.anuncios).toBe(9277)
    expect(TOTAIS.anuncios).toBe(TOTAIS.idsDeCatalogo)
  })

  it('não chama de "produtos distintos" o que só mede anúncios por rede', () => {
    expect(TOTAIS).not.toHaveProperty('produtosDistintos')
    expect(TOTAIS).not.toHaveProperty('produtosComPreco')
  })

  it('os anúncios com preço conferem', () => {
    expect(TOTAIS.anunciosComPreco).toBe(anuncios((p) => redes(p) > 0))
  })

  it('"em 2+ redes" vem dos grupos confirmados de data/equivalentes.json, e é 0 sem o arquivo', () => {
    const arquivo = path.join(__dirname, 'data', 'equivalentes.json')
    const esperado = fs.existsSync(arquivo) ? contarGruposConfirmados(JSON.parse(fs.readFileSync(arquivo, 'utf8'))) : 0
    expect(TOTAIS.produtosEm2Redes).toBe(esperado) // se falhar: cd frontend && node scripts/gerar-catalogo-resumo.mjs
  })

  it('não importa o data.js (continua leve)', () => {
    const codigo = fs.readFileSync(path.join(__dirname, 'catalogoResumo.js'), 'utf8')
    expect(codigo).not.toMatch(/from\s+['"][^'"]*\/data['"]/)
    expect(codigo.length).toBeLessThan(10 * 1024)
  })
})
