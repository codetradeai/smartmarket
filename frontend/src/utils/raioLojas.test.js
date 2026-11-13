import { OPCOES_RAIO, RAIO_PADRAO, filtrarLojasPorRaio, normalizarRaio } from './raioLojas'

describe('opções de raio', () => {
  it('são 3, 5, 10 e 20 km e "todos", e o padrão é "todos"', () => {
    expect(OPCOES_RAIO).toEqual([3, 5, 10, 20, 'todos'])
    expect(RAIO_PADRAO).toBe('todos')
  })
})

describe('normalizarRaio', () => {
  it.each([
    [3, 3],
    [5, 5],
    [10, 10],
    [20, 20],
    ['todos', 'todos'],
    ['3', 3],
    ['5', 5],
    ['10', 10],
    ['20', 20],
    [' 5 ', 5],
  ])('%p vira %p', (entrada, esperado) => {
    expect(normalizarRaio(entrada)).toBe(esperado)
  })

  it.each([
    [7],
    ['7'],
    [0],
    [-5],
    [5.5],
    [NaN],
    [Infinity],
    ['abc'],
    ['5km'],
    [''],
    ['TODOS'],
    [null],
    [undefined],
    [true],
    [[5]],
    [{ raio: 5 }],
  ])('%p não é uma opção e vira o padrão "todos"', (entrada) => {
    expect(normalizarRaio(entrada)).toBe('todos')
  })
})

describe('filtrarLojasPorRaio', () => {
  const perto = { lojaId: 1, distanciaKm: 1.2 }
  const longe = { lojaId: 2, distanciaKm: 48 }
  const semDistancia = { lojaId: 3, distanciaKm: null }

  it('"todos" devolve todas as lojas, na mesma ordem, inclusive as sem distância', () => {
    expect(filtrarLojasPorRaio([longe, semDistancia, perto], 'todos')).toEqual([longe, semDistancia, perto])
  })

  it.each([[null], [undefined], ['texto'], [{ perto }], [42]])('lojas %p (não é array) vira []', (lojas) => {
    expect(filtrarLojasPorRaio(lojas, 'todos')).toEqual([])
    expect(filtrarLojasPorRaio(lojas, 5)).toEqual([])
  })

  describe('com um raio em km', () => {
    const aBeiraDoRaio = { lojaId: 4, distanciaKm: 4.9 }
    const noLimite = { lojaId: 5, distanciaKm: 5 }
    const logoDepois = { lojaId: 6, distanciaKm: 5.01 }

    it('mantém a loja a 4,9 km e a de 5 km com raio 5, e tira a de 5,01 km', () => {
      expect(filtrarLojasPorRaio([aBeiraDoRaio, noLimite, logoDepois], 5)).toEqual([aBeiraDoRaio, noLimite])
    })

    it.each([[3], [5], [10], [20], ['5'], ['10']])('loja sem distância (null ou ausente) fica com raio %p', (raio) => {
      const semCampo = { lojaId: 7 }

      expect(filtrarLojasPorRaio([longe, semDistancia, semCampo], raio)).toEqual([semDistancia, semCampo])
    })

    it('aceita o raio em texto, como vem de um select', () => {
      expect(filtrarLojasPorRaio([perto, longe], '10')).toEqual([perto])
    })
  })

  it.each([['abc'], [null], [undefined], [7], [NaN], ['']])('raio inválido %p não esconde nenhuma loja', (raio) => {
    expect(filtrarLojasPorRaio([perto, longe, semDistancia], raio)).toEqual([perto, longe, semDistancia])
  })
})
