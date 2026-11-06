import fs from 'fs'
import path from 'path'
import { chaveDeOrigem, contarDistintos } from './contagemCatalogo'

const rissul = (id, idOrigem, prices = { rissul: 5 }) => ({
  id, name: 'Açúcar Refinado Caravelas 1kg', supermercadoOrigem: 'Rissul', idOrigem, prices,
})

describe('contarDistintos', () => {
  it('conta (rede, id de origem) uma vez, mesmo com dois ids de catálogo', () => {
    const lista = [rissul('p131', '616461'), rissul('p338', '616461'), rissul('p1', '999')]
    expect(lista).toHaveLength(3)
    expect(contarDistintos(lista)).toBe(2)
  })

  it('o mesmo id de origem em redes diferentes são produtos diferentes', () => {
    const lista = [rissul('p1', '10'), { id: 'p2', supermercadoOrigem: 'Zaffari', idOrigem: '10' }]
    expect(contarDistintos(lista)).toBe(2)
  })

  it('sem rede/id de origem, o id de catálogo vale como chave', () => {
    const lista = [{ id: 'p1' }, { id: 'p2' }, { id: 'p1' }]
    expect(chaveDeOrigem(lista[0])).toBe('catalogo|p1')
    expect(contarDistintos(lista)).toBe(2)
  })

  it('aplica o filtro antes de contar', () => {
    const lista = [rissul('p1', '1', { a: 1, b: 2 }), rissul('p2', '1', { a: 1, b: 2 }), rissul('p3', '2', { a: 1 })]
    const em2Redes = (p) => Object.keys(p.prices).length >= 2
    expect(contarDistintos(lista, em2Redes)).toBe(1)
  })

  it('lista vazia ou ausente dá 0', () => {
    expect(contarDistintos([])).toBe(0)
    expect(contarDistintos(undefined)).toBe(0)
  })
})

describe('contarDistintos com o catálogo atual (src/data.js)', () => {
  // Lê o arquivo como texto (32 MB) para não passar pelo transformador do Jest nem alterá-lo.
  const fonte = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8')
  const dados = {}
  // eslint-disable-next-line no-new-func
  new Function('exports', fonte.replace(/export const (\w+)/g, 'const $1 = exports.$1'))(dados)
  const { PRODUCTS } = dados

  it('9.406 ids de catálogo correspondem a 9.277 produtos distintos', () => {
    expect(PRODUCTS).toHaveLength(9406)
    expect(contarDistintos(PRODUCTS)).toBe(9277)
  })

  it('o total distinto confere com uma recontagem independente por rede|idOrigem', () => {
    const recontagem = new Set(PRODUCTS.map((p) => `${p.supermercadoOrigem}|${p.idOrigem}`)).size
    expect(contarDistintos(PRODUCTS)).toBe(recontagem)
  })
})
