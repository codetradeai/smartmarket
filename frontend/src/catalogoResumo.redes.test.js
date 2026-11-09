import fs from 'fs'
import path from 'path'
import { MARKETS, REDES_COM_PRODUTOS } from './catalogoResumo'
import { resumoDe } from './test/resumoDe'
import { redesComProdutos } from './utils/redesDoCatalogo'

// Lê o data.js como texto (32 MB), como o catalogoResumo.test.js, sem alterá-lo.
const fonte = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8')
const dados = {}
new Function('exports', fonte.replace(/export const (\w+)/g, 'const $1 = exports.$1'))(dados)
const { PRODUCTS } = dados

describe('REDES_COM_PRODUTOS confere com o data.js', () => {
  it('tem uma linha por rede de MARKETS, com os anúncios (rede + id de origem) que têm preço nela', () => {
    expect(REDES_COM_PRODUTOS.map((r) => r.id)).toEqual(MARKETS.map((m) => m.id))
    for (const rede of REDES_COM_PRODUTOS) {
      const anuncios = new Set(
        PRODUCTS.filter((p) => typeof p.prices?.[rede.id] === 'number' && p.prices[rede.id] > 0).map(
          (p) => `${p.supermercadoOrigem}|${p.idOrigem}`,
        ),
      ).size
      expect(rede.anuncios).toBe(anuncios)
    }
  })

  it('o Carrefour não tem produtos no catálogo e some da lista de redes com produtos', () => {
    expect(REDES_COM_PRODUTOS.find((r) => r.id === 'carrefour').anuncios).toBe(0)
    const ativas = redesComProdutos(MARKETS, REDES_COM_PRODUTOS).map((m) => m.id)
    expect(ativas).not.toContain('carrefour')
    expect(ativas).toHaveLength(MARKETS.length - 1)
  })

  it('o resumoDe dos testes calcula a mesma coisa a partir de PRODUCTS', () => {
    const r = resumoDe({ PRODUCTS, MARKETS, CATEGORIES: [] })
    expect(r.REDES_COM_PRODUTOS).toEqual(REDES_COM_PRODUTOS)
  })
})
