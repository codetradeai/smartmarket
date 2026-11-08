import { nomeCurtoRede, redesComProdutos, listarNomes } from './redesDoCatalogo'

const MARKETS = [
  { id: 'zaffari', name: 'Zaffari / Bourbon' },
  { id: 'rissul', name: 'Supermercados Rissul' },
  { id: 'asun', name: 'Asun Supermercados' },
  { id: 'stok', name: 'Stok Center' },
  { id: 'atacadao', name: 'Atacadão' },
  { id: 'master', name: 'Master Supermercados' },
  { id: 'fort', name: 'Fort Atacadista' },
  { id: 'carrefour', name: 'Carrefour Mercado' },
]

describe('nomeCurtoRede', () => {
  it('tira os sufixos e prefixos genéricos do nome da rede', () => {
    expect(MARKETS.map(nomeCurtoRede)).toEqual([
      'Zaffari', 'Rissul', 'Asun', 'Stok', 'Atacadão', 'Master', 'Fort', 'Carrefour',
    ])
  })

  it('mantém o nome inteiro quando só sobraria vazio e tolera mercado sem nome', () => {
    expect(nomeCurtoRede({ id: 'x', name: 'Supermercados' })).toBe('Supermercados')
    expect(nomeCurtoRede({ id: 'x' })).toBe('x')
    expect(nomeCurtoRede(null)).toBe('')
  })
})

describe('redesComProdutos', () => {
  const resumo = [
    { id: 'zaffari', anuncios: 73 },
    { id: 'fort', anuncios: 5514 },
    { id: 'carrefour', anuncios: 0 },
  ]

  it('mantém só as redes com pelo menos um anúncio com preço, na ordem de MARKETS', () => {
    const r = redesComProdutos(MARKETS, resumo)
    expect(r.map((m) => m.id)).toEqual(['zaffari', 'fort'])
  })

  it('rede que não consta do resumo conta como sem produtos', () => {
    expect(redesComProdutos(MARKETS, [{ id: 'asun', anuncios: 1 }]).map((m) => m.id)).toEqual(['asun'])
  })

  it('sem resumo (undefined) não esconde rede nenhuma', () => {
    expect(redesComProdutos(MARKETS, undefined)).toHaveLength(8)
  })
})

describe('listarNomes', () => {
  it('junta em português: "A", "A e B", "A, B e C"', () => {
    expect(listarNomes([])).toBe('')
    expect(listarNomes(['Fort'])).toBe('Fort')
    expect(listarNomes(['Fort', 'Asun'])).toBe('Fort e Asun')
    expect(listarNomes(['Fort', 'Asun', 'Stok'])).toBe('Fort, Asun e Stok')
  })
})
