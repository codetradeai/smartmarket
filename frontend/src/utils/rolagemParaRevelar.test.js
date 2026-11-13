import { deslocamentoParaRevelar } from './rolagemParaRevelar'

const faixa = { left: 12, right: 342 } // como a fita de redes a 360 px

describe('deslocamentoParaRevelar', () => {
  it('item já visível: não rola', () => {
    expect(deslocamentoParaRevelar(faixa, { left: 100, right: 218 })).toBe(0)
  })

  it('item exatamente nas bordas da faixa: não rola', () => {
    expect(deslocamentoParaRevelar(faixa, { left: 12, right: 342 })).toBe(0)
  })

  it('item totalmente à direita, fora da faixa: rola até ele aparecer, com a folga de 8 px', () => {
    // direita do item (1157) - direita da faixa (342) + 8
    expect(deslocamentoParaRevelar(faixa, { left: 1039, right: 1157 })).toBe(823)
  })

  it('item cortado pela direita: rola só o que falta, com a folga', () => {
    expect(deslocamentoParaRevelar(faixa, { left: 250, right: 368 })).toBe(34)
  })

  it('item à esquerda, fora da faixa: rola para a esquerda (valor negativo), com a folga', () => {
    expect(deslocamentoParaRevelar(faixa, { left: -300, right: -182 })).toBe(-320)
  })

  it('item cortado pela esquerda: rola para a esquerda só o que falta', () => {
    expect(deslocamentoParaRevelar(faixa, { left: -20, right: 98 })).toBe(-40)
  })

  it('a folga pode ser trocada', () => {
    expect(deslocamentoParaRevelar(faixa, { left: 1039, right: 1157 }, 0)).toBe(815)
    expect(deslocamentoParaRevelar(faixa, { left: -300, right: -182 }, 20)).toBe(-332)
  })

  it('item maior que a faixa: mostra a ponta da direita', () => {
    expect(deslocamentoParaRevelar(faixa, { left: 12, right: 500 })).toBeGreaterThan(0)
  })

  it.each([
    [null, { left: 0, right: 10 }],
    [faixa, null],
    [undefined, undefined],
  ])('sem retângulo (%p, %p): não rola', (f, i) => {
    expect(deslocamentoParaRevelar(f, i)).toBe(0)
  })

  it('sem layout (jsdom: tudo zero): não rola', () => {
    const zero = { left: 0, right: 0 }

    expect(deslocamentoParaRevelar(zero, zero)).toBe(0)
  })
})
