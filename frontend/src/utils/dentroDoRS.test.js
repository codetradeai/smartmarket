import { dentroDoRS } from './dentroDoRS'

describe('dentroDoRS (caixa aproximada do RS, com margem de ~25 km)', () => {
  it.each([
    ['Porto Alegre', -30.0346, -51.2177],
    ['Santana do Livramento', -30.8905, -55.5322],
    ['Torres', -29.3354, -49.7261],
    ['Chuí', -33.6866, -53.4584],
    ['Uruguaiana', -29.7547, -57.0883],
    ['Erechim', -27.6339, -52.2736],
  ])('%s está dentro', (_cidade, lat, lon) => {
    expect(dentroDoRS(lat, lon)).toBe(true)
  })

  it('a margem de ~25 km além da divisa ainda conta como dentro', () => {
    expect(dentroDoRS(-29.3354, -49.5)).toBe(true) // ~20 km a leste de Torres
  })

  it.each([
    ['São Paulo', -23.5505, -46.6333],
    ['Florianópolis', -27.5954, -48.548],
    ['Montevidéu', -34.9011, -56.1645],
    ['Buenos Aires', -34.6037, -58.3816],
    ['Curitiba', -25.4284, -49.2733],
  ])('%s está fora', (_cidade, lat, lon) => {
    expect(dentroDoRS(lat, lon)).toBe(false)
  })

  it('bem além da margem a leste de Torres já é fora', () => {
    expect(dentroDoRS(-29.3354, -49.3)).toBe(false)
  })

  it.each([[null, null], [undefined, -51], [NaN, -51], ['-30', '-51'], [Infinity, 0]])(
    'coordenada inválida (%p, %p) não é "dentro"',
    (lat, lon) => {
      expect(dentroDoRS(lat, lon)).toBe(false)
    },
  )
})
