import { linkComoChegar, linkWaze } from './linkComoChegar'

const BASE = 'https://www.google.com/maps/dir/?api=1&destination='

describe('linkComoChegar', () => {
  describe('pares válidos', () => {
    it('monta o link de rotas do Google Maps com o destino lat,lon', () => {
      expect(linkComoChegar(-30.0346, -51.2177)).toBe(`${BASE}-30.0346,-51.2177`)
    })

    it('tira os zeros à direita', () => {
      expect(linkComoChegar(-30.03, -51.2)).toBe(`${BASE}-30.03,-51.2`)
    })

    it('limita a seis casas decimais (~0,1 m), arredondando', () => {
      expect(linkComoChegar(-30.12345678, -51.98765432)).toBe(`${BASE}-30.123457,-51.987654`)
    })

    it('nunca usa notação científica, mesmo com número minúsculo', () => {
      expect(linkComoChegar(1e-9, 1)).toBe(`${BASE}0,1`)
      expect(linkComoChegar(1e-9, 1)).not.toMatch(/e-/)
    })

    it('aceita zero como uma das coordenadas', () => {
      expect(linkComoChegar(0, -51.2)).toBe(`${BASE}0,-51.2`)
    })

    it.each([
      [90, 180],
      [-90, -180],
      [90, -180],
      [-90, 180],
    ])('aceita o limite da faixa (%p, %p)', (lat, lon) => {
      expect(linkComoChegar(lat, lon)).toBe(`${BASE}${lat},${lon}`)
    })
  })

  describe('pares ausentes: sem link', () => {
    it.each([
      [null, null],
      [undefined, undefined],
      [-30.03, null],
      [null, -51.2],
      [-30.03, undefined],
      [undefined, -51.2],
    ])('(%p, %p) devolve null (meia coordenada nunca vira link)', (lat, lon) => {
      expect(linkComoChegar(lat, lon)).toBeNull()
    })

    it('sem argumentos devolve null', () => {
      expect(linkComoChegar()).toBeNull()
    })
  })

  describe('pares inválidos: sem link', () => {
    it.each([
      ['texto numérico', '-30.03', '-51.2'],
      ['texto vazio', '', ''],
      ['NaN', NaN, -51.2],
      ['NaN na longitude', -30.03, NaN],
      ['Infinity', Infinity, -51.2],
      ['-Infinity', -30.03, -Infinity],
      ['objeto', {}, []],
      ['booleano', true, false],
    ])('%s', (_nome, lat, lon) => {
      expect(linkComoChegar(lat, lon)).toBeNull()
    })

    it.each([
      [90.0001, -51.2],
      [-90.0001, -51.2],
      [-30.03, 180.0001],
      [-30.03, -180.0001],
      [200, 300],
      [-51.2, -300],
    ])('fora da faixa real (%p, %p)', (lat, lon) => {
      expect(linkComoChegar(lat, lon)).toBeNull()
    })
  })

  it('o link leva só o destino: nenhuma origem nem dado do usuário', () => {
    const url = new URL(linkComoChegar(-30.0346, -51.2177))

    expect([...url.searchParams.keys()].sort()).toEqual(['api', 'destination'])
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('destination')).toBe('-30.0346,-51.2177')
    expect(url.origin).toBe('https://www.google.com')
    expect(url.pathname).toBe('/maps/dir/')
  })
})

describe('linkWaze', () => {
  const BASE_WAZE = 'https://waze.com/ul?ll='
  const FIM = '&navigate=yes'

  describe('pares válidos', () => {
    it('monta o link do Waze com o ponto da loja e a navegação ligada', () => {
      expect(linkWaze(-30.0346, -51.2177)).toBe(`${BASE_WAZE}-30.0346,-51.2177${FIM}`)
    })

    it('tira os zeros à direita', () => {
      expect(linkWaze(-30.03, -51.2)).toBe(`${BASE_WAZE}-30.03,-51.2${FIM}`)
    })

    it('limita a seis casas decimais, arredondando', () => {
      expect(linkWaze(-30.12345678, -51.98765432)).toBe(`${BASE_WAZE}-30.123457,-51.987654${FIM}`)
    })

    it('nunca usa notação científica, mesmo com número minúsculo', () => {
      expect(linkWaze(1e-9, 1)).toBe(`${BASE_WAZE}0,1${FIM}`)
      expect(linkWaze(1e-9, 1)).not.toMatch(/e-/)
    })

    it.each([
      [90, 180],
      [-90, -180],
      [90, -180],
      [-90, 180],
    ])('aceita o limite da faixa (%p, %p)', (lat, lon) => {
      expect(linkWaze(lat, lon)).toBe(`${BASE_WAZE}${lat},${lon}${FIM}`)
    })
  })

  describe('pares ausentes ou inválidos: sem link', () => {
    it.each([
      [null, null],
      [undefined, undefined],
      [-30.03, null],
      [null, -51.2],
      [-30.03, undefined],
      [undefined, -51.2],
      ['-30.03', '-51.2'],
      ['', ''],
      [NaN, -51.2],
      [-30.03, NaN],
      [Infinity, -51.2],
      [-30.03, -Infinity],
      [{}, []],
      [true, false],
      [90.0001, -51.2],
      [-90.0001, -51.2],
      [-30.03, 180.0001],
      [-30.03, -180.0001],
      [200, 300],
    ])('(%p, %p) devolve null', (lat, lon) => {
      expect(linkWaze(lat, lon)).toBeNull()
    })

    it('sem argumentos devolve null', () => {
      expect(linkWaze()).toBeNull()
    })
  })

  it('valida exatamente como o link do Google Maps: um existe se, e só se, o outro existe', () => {
    const pares = [
      [-30.0346, -51.2177],
      [0, 0],
      [90, 180],
      [91, 0],
      [0, 181],
      [null, -51.2],
      [-30.03, undefined],
      ['-30', '-51'],
      [NaN, 1],
      [1, Infinity],
    ]

    for (const [lat, lon] of pares) {
      expect(linkWaze(lat, lon) === null).toBe(linkComoChegar(lat, lon) === null)
    }
  })

  it('usa o mesmo ponto do Google Maps, com a mesma formatação', () => {
    const ponto = (url) => (url.match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/) || [])[0]

    expect(ponto(linkWaze(-30.12345678, -51.98765432))).toBe(ponto(linkComoChegar(-30.12345678, -51.98765432)))
  })

  it('o link leva só o ponto da loja: nenhuma origem nem dado do usuário', () => {
    const url = new URL(linkWaze(-30.0346, -51.2177))

    expect([...url.searchParams.keys()].sort()).toEqual(['ll', 'navigate'])
    expect(url.searchParams.get('ll')).toBe('-30.0346,-51.2177')
    expect(url.searchParams.get('navigate')).toBe('yes')
    expect(url.origin).toBe('https://waze.com')
    expect(url.pathname).toBe('/ul')
  })
})
