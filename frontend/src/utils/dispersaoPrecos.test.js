import {
  calcularComparacoes,
  dispersaoDoSetor,
  normalizarUnidade,
  posicaoNaTrilha,
} from './dispersaoPrecos'

const item = (id, over = {}) => ({ id, name: `Produto ${id}`, brand: 'X', category: 'cafe', unit: '500g', prices: {}, ...over })
const grupo = (id, itens, confianca = 'confirmado') => ({ id, confianca, camada: 'T1', itens })

describe('normalizarUnidade', () => {
  it('converte kg e L e ignora espaços e vírgula', () => {
    expect(normalizarUnidade('1kg')).toBe('1000g')
    expect(normalizarUnidade('500 g')).toBe('500g')
    expect(normalizarUnidade('1,5L')).toBe('1500ml')
    expect(normalizarUnidade('350ml')).toBe('350ml')
    expect(normalizarUnidade('12 un')).toBe('12un')
    expect(normalizarUnidade('1')).toBe('1un')
  })

  it('devolve null para o que não dá para entender', () => {
    expect(normalizarUnidade('')).toBeNull()
    expect(normalizarUnidade(undefined)).toBeNull()
    expect(normalizarUnidade('pacote grande')).toBeNull()
  })
})

describe('calcularComparacoes', () => {
  const produtos = [
    item('p1', { prices: { asun: 16.9 }, imageLocal: '/images/produtos/a.png' }),
    item('p2', { prices: { fort: 23.5 } }),
    item('p3', { prices: { stok: 20 } }),
  ]

  it('compara o mesmo produto entre redes: menor, maior, economia e % sobre o maior', () => {
    const [c] = calcularComparacoes(produtos, [grupo('g1', ['p1', 'p2'])])
    expect(c).toMatchObject({ grupoId: 'g1', categoria: 'cafe', percentual: 28 })
    expect(c.menor).toEqual({ rede: 'asun', preco: 16.9 })
    expect(c.maior).toEqual({ rede: 'fort', preco: 23.5 })
    expect(c.economia).toBeCloseTo(6.6, 2)
    expect(c.redes.map((r) => r.rede)).toEqual(['asun', 'fort'])
    expect(c.produto.id).toBe('p1')
  })

  it('traz as redes intermediárias, em ordem de preço', () => {
    const [c] = calcularComparacoes(produtos, [grupo('g1', ['p1', 'p3', 'p2'])])
    expect(c.redes.map((r) => r.rede)).toEqual(['asun', 'stok', 'fort'])
  })

  it('grupo "provavel" nunca vira comparação', () => {
    expect(calcularComparacoes(produtos, [grupo('g1', ['p1', 'p2'], 'provavel')])).toEqual([])
  })

  it('embalagens diferentes ou ilegíveis ficam de fora', () => {
    const mistos = [
      item('a', { prices: { asun: 9 }, unit: '1L' }),
      item('b', { prices: { fort: 15 }, unit: '1 un' }),
      item('c', { prices: { asun: 9 }, unit: '1kg' }),
      item('d', { prices: { fort: 12 }, unit: '1000 g' }),
      item('e', { prices: { asun: 9 }, unit: 'grande' }),
      item('f', { prices: { fort: 12 }, unit: 'grande' }),
    ]
    const r = calcularComparacoes(mistos, [grupo('g1', ['a', 'b']), grupo('g2', ['c', 'd']), grupo('g3', ['e', 'f'])])
    expect(r.map((c) => c.grupoId)).toEqual(['g2'])
  })

  it('setores diferentes, uma rede só, preços iguais ou inválidos não comparam', () => {
    const base = [
      item('a', { prices: { asun: 5 } }),
      item('b', { prices: { fort: 8 }, category: 'bebidas' }),
      item('c', { prices: { asun: 5, fort: 5 } }),
      item('d', { prices: { fort: 0, asun: 'x' } }),
      item('e', { prices: { fort: 5 } }),
    ]
    const g = [grupo('g1', ['a', 'b']), grupo('g2', ['a', 'e']), grupo('g3', ['c', 'e']), grupo('g4', ['d', 'e'])]
    expect(calcularComparacoes(base, g)).toEqual([])
  })

  it('ids fora do catálogo e entradas vazias são ignorados', () => {
    expect(calcularComparacoes(produtos, [grupo('g1', ['p1', 'pX'])])).toEqual([])
    expect(calcularComparacoes([], [grupo('g1', ['p1', 'p2'])])).toEqual([])
    expect(calcularComparacoes(null, null)).toEqual([])
  })

  it('na mesma rede vale o menor preço entre os itens do grupo', () => {
    const dois = [
      item('a', { prices: { asun: 10 } }),
      item('b', { prices: { asun: 8 } }),
      item('c', { prices: { fort: 12 } }),
    ]
    const [c] = calcularComparacoes(dois, [grupo('g1', ['a', 'b', 'c'])])
    expect(c.menor).toEqual({ rede: 'asun', preco: 8 })
    expect(c.percentual).toBe(33)
  })

  it('a foto vem de um item que tenha foto quando o mais barato não tem', () => {
    const [c] = calcularComparacoes(
      [item('a', { prices: { asun: 5 } }), item('b', { prices: { fort: 8 }, imageUrl: 'https://x/y.png' })],
      [grupo('g1', ['a', 'b'])]
    )
    expect(c.produto.id).toBe('a')
    expect(c.imagem.id).toBe('b')
  })
})

describe('dispersaoDoSetor', () => {
  const comp = (id, pct, economia, brand, categoria = 'cafe') => ({
    grupoId: id,
    categoria,
    percentual: pct,
    economia,
    produto: { id, brand },
  })
  const todas = [
    comp('a', 50, 5, 'Uniao'),
    comp('b', 45, 4, 'Uniao'),
    comp('c', 40, 3, 'Melitta'),
    comp('d', 30, 2, 'Pilao'),
    comp('e', 90, 9, 'Outra', 'bebidas'),
  ]

  it('pega os de maior variação do setor, evitando repetir marca, e resume o setor', () => {
    const r = dispersaoDoSetor(todas, 'cafe')
    expect(r.itens.map((i) => i.grupoId)).toEqual(['a', 'c', 'd'])
    expect(r.total).toBe(4)
    expect(r.maxPercentual).toBe(50)
    expect(r.mediaPercentual).toBe(41)
  })

  it('completa com marca repetida quando não há alternativa', () => {
    const r = dispersaoDoSetor([comp('a', 50, 5, 'U'), comp('b', 45, 4, 'U')], 'cafe')
    expect(r.itens.map((i) => i.grupoId)).toEqual(['a', 'b'])
  })

  it('respeita o limite e desempata pela economia em reais', () => {
    const r = dispersaoDoSetor([comp('a', 30, 2, 'A'), comp('b', 30, 6, 'B')], 'cafe', 1)
    expect(r.itens.map((i) => i.grupoId)).toEqual(['b'])
  })

  it('setor sem comparação fica zerado', () => {
    expect(dispersaoDoSetor(todas, 'padaria')).toEqual({ itens: [], total: 0, maxPercentual: 0, mediaPercentual: 0 })
    expect(dispersaoDoSetor(null, 'cafe').itens).toEqual([])
  })
})

describe('posicaoNaTrilha', () => {
  it('é proporcional à distância entre o menor e o maior preço', () => {
    expect(posicaoNaTrilha(10, 10, 20)).toBe(0)
    expect(posicaoNaTrilha(15, 10, 20)).toBe(0.5)
    expect(posicaoNaTrilha(20, 10, 20)).toBe(1)
    expect(posicaoNaTrilha(12.5, 10, 20)).toBe(0.25)
  })

  it('limita ao intervalo e não quebra com preços iguais', () => {
    expect(posicaoNaTrilha(5, 10, 20)).toBe(0)
    expect(posicaoNaTrilha(30, 10, 20)).toBe(1)
    expect(posicaoNaTrilha(10, 10, 10)).toBe(0)
  })
})
