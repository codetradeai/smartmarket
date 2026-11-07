import { act, render } from '@testing-library/react'
import { CarrosselRedes } from './CarrosselRedes'

jest.mock('../../catalogoResumo', () => require('../../test/resumoDe').resumoDe(require('../../test/dataFixture')))

describe('CarrosselRedes', () => {
  let leituras
  let original

  beforeEach(() => {
    jest.useFakeTimers()
    leituras = 0
    original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        leituras += 1
        return 1000
      },
    })
  })

  afterEach(() => {
    if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original)
    else delete HTMLElement.prototype.clientWidth
    jest.useRealTimers()
  })

  it('anima sem ler a largura do layout a cada frame (evita reflow forçado)', () => {
    const { container } = render(<CarrosselRedes selectedMarket="todos" onSelect={() => {}} />)
    const trilho = container.querySelector('.sm-rail-track')
    const inicio = leituras

    act(() => jest.advanceTimersByTime(100))
    const antes = trilho.style.transform
    const leiturasAposAquecer = leituras

    act(() => jest.advanceTimersByTime(1000))

    expect(trilho.style.transform).not.toBe(antes) // continua animando
    expect(leituras).toBe(leiturasAposAquecer) // mas sem novas leituras de clientWidth
    expect(inicio).toBeLessThan(5) // e a medição inicial é pequena
  })

  it('para de animar quando o usuário escolhe uma rede', () => {
    const { container } = render(<CarrosselRedes selectedMarket="fort" onSelect={() => {}} />)
    const trilho = container.querySelector('.sm-rail-track')
    act(() => jest.advanceTimersByTime(100))
    const antes = trilho.style.transform
    act(() => jest.advanceTimersByTime(1000))

    expect(trilho.style.transform).toBe(antes)
  })
})
