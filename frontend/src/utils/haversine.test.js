import { distanciaKm } from './haversine'

// Valores de referência calculados pelo Haversine.java do backend (com a classe de verdade, não com esta
// fórmula). O mesmo conjunto de literais está no HaversineReferenciaTest (JUnit): mudar a fórmula ou o raio
// de um lado só derruba o teste do outro.
const REFERENCIAS = [
  ['Porto Alegre → Cachoeirinha', -30.0346, -51.2177, -29.9511, -51.0944, 15.073396273429914],
  ['Porto Alegre → Caxias do Sul', -30.0346, -51.2177, -29.1681, -51.1794, 96.4215301811584],
  ['mesmo ponto', -30.0346, -51.2177, -30.0346, -51.2177, 0.0],
  ['cruzando o equador (1 grau)', -0.5, -51.0, 0.5, -51.0, 111.19492664455873],
  ['Porto Alegre → Curitiba', -30.0346, -51.2177, -25.4284, -49.2733, 546.7371315185663],
  ['Uruguaiana → Torres', -29.7547, -57.0883, -29.3354, -49.7261, 713.5925557278526],
  ['pontos opostos no equador', 0.0, 0.0, 0.0, 180.0, 20015.086796020572],
]

describe('distanciaKm (Haversine, raio 6371 km, sem arredondar)', () => {
  it.each(REFERENCIAS)('%s bate com o valor do backend', (_nome, lat1, lon1, lat2, lon2, esperado) => {
    expect(distanciaKm(lat1, lon1, lat2, lon2)).toBeCloseTo(esperado, 8)
  })

  it('é simétrica: ida e volta dão a mesma distância', () => {
    expect(distanciaKm(-29.9511, -51.0944, -30.0346, -51.2177)).toBeCloseTo(
      distanciaKm(-30.0346, -51.2177, -29.9511, -51.0944),
      10,
    )
  })

  it('não arredonda: o valor tem mais de duas casas decimais', () => {
    const km = distanciaKm(-30.0346, -51.2177, -29.9511, -51.0944)
    expect(km).not.toBe(Math.round(km * 100) / 100)
  })
})
