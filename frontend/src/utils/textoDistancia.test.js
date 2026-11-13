import { textoDistancia } from './textoDistancia'

describe('textoDistancia', () => {
  it.each([
    [2.5, '2,5 km'],
    [12, '12,0 km'],
    [0.8, '0,8 km'],
    [3.46, '3,5 km'],
    [0, '0,0 km'],
  ])('%p vira "%s" (formato brasileiro, uma casa, sem ponto decimal)', (km, esperado) => {
    expect(textoDistancia(km)).toBe(esperado)
  })

  it.each([[null], [undefined], [NaN], [Infinity], ['3,5'], ['3.5'], [{}]])('%p não é distância: devolve null', (valor) => {
    expect(textoDistancia(valor)).toBeNull()
  })
})
