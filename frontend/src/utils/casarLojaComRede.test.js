import { MARKETS } from '../catalogoResumo'
import { casarLojaComRede, chaveDaRede, indexarLojasPorRede } from './casarLojaComRede'

const idDaRede = (mercadoNome) => casarLojaComRede({ mercadoNome }, MARKETS)?.id ?? null

describe('chaveDaRede', () => {
  it.each([
    ['Carrefour Mercado', 'carrefour'],
    ['Fort Atacadista', 'fort'],
    ['  ATACADÃO  ', 'atacadao'],
    ['Zaffari / Bourbon', 'zaffari'],
    ['Loja 360', 'loja 360'],
    ['Supermercado São João', 'sao joao'],
  ])('%p vira a chave %p', (nome, chave) => {
    expect(chaveDaRede(nome)).toBe(chave)
  })

  it.each([[''], [null], [undefined], [42], [{}]])('%p vira chave vazia', (entrada) => {
    expect(chaveDaRede(entrada)).toBe('')
  })
})

describe('casarLojaComRede', () => {
  describe('pelo nome da rede, com os MARKETS do catálogo (ids de texto)', () => {
    it.each([
      ['Zaffari / Bourbon', 'zaffari'],
      ['Zaffari', 'zaffari'],
      ['Supermercados Rissul', 'rissul'],
      ['Asun Supermercados', 'asun'],
      ['Stok Center', 'stok'],
      ['Atacadão', 'atacadao'],
      ['Master Supermercados', 'master'],
      ['Fort Atacadista', 'fort'],
      ['Carrefour Mercado', 'carrefour'],
      ['Carrefour', 'carrefour'],
    ])('"%s" casa com a rede %s', (mercadoNome, idEsperado) => {
      expect(idDaRede(mercadoNome)).toBe(idEsperado)
    })

    it.each([
      ['ATACADAO', 'atacadao'],
      ['atacadão', 'atacadao'],
    ])('ignora caixa e acento: "%s" casa com a rede %s', (mercadoNome, idEsperado) => {
      expect(idDaRede(mercadoNome)).toBe(idEsperado)
    })

    it.each([
      ['Stokcenter'],
      ['Big Bompreço'],
      [''],
      [null],
      ['Mercado'],
    ])('%p não casa com nenhuma rede', (mercadoNome) => {
      expect(idDaRede(mercadoNome)).toBeNull()
    })

    it('"Atacadão" não casa com a rede Fort e "Fort Atacadista" não casa com a Atacadão', () => {
      expect(idDaRede('Atacadão')).toBe('atacadao')
      expect(idDaRede('Fort Atacadista')).toBe('fort')
    })
  })

  describe('pelo id da rede', () => {
    it('market com id de texto casa pelo id quando o nome do market é outro', () => {
      const markets = [{ id: 'stok', name: 'Rede Qualquer' }]

      expect(casarLojaComRede({ mercadoNome: 'Stok Center' }, markets)).toBe(markets[0])
    })

    it('market com id numérico casa pelo id, mesmo com nomes diferentes', () => {
      const markets = [{ id: 8, name: 'Qualquer' }]

      expect(casarLojaComRede({ mercadoId: 8, mercadoNome: 'Fort Atacadista' }, markets)).toBe(markets[0])
    })

    it('aceita id numérico em texto nos dois lados', () => {
      const markets = [{ id: '8', name: 'Qualquer' }]

      expect(casarLojaComRede({ mercadoId: 8 }, markets)).toBe(markets[0])
      const marketsNumericos = [{ id: 8, name: 'Qualquer' }]

      expect(casarLojaComRede({ mercadoId: '8' }, marketsNumericos)).toBe(marketsNumericos[0])
    })

    it('ids numéricos diferentes não casam, nem que os nomes sejam iguais', () => {
      const markets = [{ id: 9, name: 'Fort Atacadista' }]

      expect(casarLojaComRede({ mercadoId: 8, mercadoNome: 'Fort Atacadista' }, markets)).toBeNull()
    })

    it('loja com mercadoId numérico não casa por id com market de id de texto', () => {
      const markets = [{ id: 'stok', name: 'Stok Center' }]

      expect(casarLojaComRede({ mercadoId: 8 }, markets)).toBeNull()
    })

    it('loja com mercadoId numérico casa com market de id de texto apenas pelo nome', () => {
      const markets = [{ id: 'stok', name: 'Stok Center' }]

      expect(casarLojaComRede({ mercadoId: 8, mercadoNome: 'Stok Center' }, markets)).toBe(markets[0])
    })

    it('loja com mercadoId de texto não numérico não casa por id com market de id numérico', () => {
      const markets = [{ id: 8, name: 'Fort Atacadista' }]

      expect(casarLojaComRede({ mercadoId: 'fort' }, markets)).toBeNull()
    })
  })
})

describe('indexarLojasPorRede', () => {
  const fort = { lojaId: 1, mercadoNome: 'Fort Atacadista', distanciaKm: 1.2 }
  const zaffari = { lojaId: 2, mercadoNome: 'Zaffari / Bourbon', distanciaKm: 3.5 }
  const semRede = { lojaId: 3, mercadoNome: 'Big Bompreço', distanciaKm: 4.1 }

  it('indexa cada loja pelo id da rede e ignora loja sem rede no catálogo', () => {
    const indice = indexarLojasPorRede([fort, semRede, zaffari], MARKETS)

    expect(indice).toEqual({ fort, zaffari })
    expect(Object.keys(indice)).toEqual(['fort', 'zaffari'])
  })

  it('usa o id do market como chave em texto, também quando ele é numérico', () => {
    const markets = [{ id: 8, name: 'Qualquer' }]
    const loja = { lojaId: 9, mercadoId: 8 }

    expect(indexarLojasPorRede([loja], markets)).toEqual({ 8: loja })
  })

  it('com duas lojas da mesma rede, fica a primeira (a API ordena da mais próxima à mais distante)', () => {
    const maisLonge = { lojaId: 4, mercadoNome: 'Fort Atacadista', distanciaKm: 9.8 }

    expect(indexarLojasPorRede([fort, maisLonge], MARKETS)).toEqual({ fort })
  })

  it.each([[null], [undefined], ['texto'], [{ fort }]])('lojas %p (não é array) vira {}', (lojas) => {
    expect(indexarLojasPorRede(lojas, MARKETS)).toEqual({})
  })

  it('markets que não é array vira {}', () => {
    expect(indexarLojasPorRede([fort], null)).toEqual({})
  })
})
