import { textoDistancia, textoDistanciaFalado, DICA_DISTANCIA } from './textoDistancia'

describe('textoDistancia', () => {
  it.each([
    [2.5, '≈ 2,5 km'],
    [12, '≈ 12,0 km'],
    [0.8, '≈ 0,8 km'],
    [3.46, '≈ 3,5 km'],
    [0, '≈ 0,0 km'],
  ])('%p vira "%s" (aproximada, formato brasileiro, uma casa)', (km, esperado) => {
    expect(textoDistancia(km)).toBe(esperado)
  })

  it.each([[null], [undefined], [NaN], [Infinity], ['3,5'], ['3.5'], [{}]])('%p não é distância: devolve null', (valor) => {
    expect(textoDistancia(valor)).toBeNull()
  })
})

describe('DICA_DISTANCIA', () => {
  it('explica que é em linha reta e a partir do CEP', () => {
    expect(DICA_DISTANCIA).toBe('Distância em linha reta, calculada a partir do seu CEP')
  })
})

describe('textoDistanciaFalado', () => {
  it.each([
    [2.3, 'aproximadamente 2,3 km, em linha reta, a partir do seu CEP'],
    [12, 'aproximadamente 12,0 km, em linha reta, a partir do seu CEP'],
  ])('%p vira "%s" (texto para leitor de tela, sem o símbolo ≈)', (km, esperado) => {
    expect(textoDistanciaFalado(km)).toBe(esperado)
  })

  it.each([[null], [undefined], [NaN], ['3,5']])('%p não é distância: devolve null', (valor) => {
    expect(textoDistanciaFalado(valor)).toBeNull()
  })
})
