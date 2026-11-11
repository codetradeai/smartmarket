import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MarqueeRedes } from './MarqueeRedes'

if (typeof window.PointerEvent === 'undefined') {
  // O jsdom não traz PointerEvent: sem isto clientX/pointerId se perdem nos eventos de teste.
  window.PointerEvent = class extends MouseEvent {
    constructor(tipo, init = {}) {
      super(tipo, init)
      this.pointerId = init.pointerId
      this.pointerType = init.pointerType
    }
  }
}

const MERCADOS = [
  { id: 'asun', name: 'Asun Supermercados' },
  { id: 'stok', name: 'Stok Center' },
  { id: 'master', name: 'Master Supermercados' },
]

describe('MarqueeRedes', () => {
  let fila
  let proximoId
  let agora
  let reduzido

  const quadros = (n, ms = 16) => {
    for (let i = 0; i < n; i += 1) {
      agora += ms
      const pendentes = [...fila.values()]
      fila.clear()
      act(() => pendentes.forEach((cb) => cb(agora)))
    }
  }
  const trilho = (container) => container.querySelector('.sm-marquee__track')
  const posicao = (container) => {
    const m = /translate3d\((-?[\d.]+)px/.exec(trilho(container).style.transform || '')
    return m ? Number(m[1]) : 0
  }
  const faixa = () => screen.getByRole('group', { name: 'Redes com coleta de preços' })
  const renderizar = (props = {}) =>
    render(<MarqueeRedes markets={MERCADOS} selectedMarket="todos" onSelect={() => {}} {...props} />)

  beforeEach(() => {
    fila = new Map()
    proximoId = 0
    agora = 0
    reduzido = false
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      proximoId += 1
      fila.set(proximoId, cb)
      return proximoId
    })
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => fila.delete(id))
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 1000, height: 100, top: 0, left: 0, right: 1000, bottom: 100,
    })
    window.matchMedia = jest.fn().mockImplementation((consulta) => ({
      matches: reduzido && consulta.includes('prefers-reduced-motion'),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))
  })

  afterEach(() => jest.restoreAllMocks())

  it('mostra um logo clicável por rede e esconde as cópias do loop de leitores de tela', () => {
    const { container } = renderizar()

    expect(screen.getAllByRole('button')).toHaveLength(MERCADOS.length)
    const conjuntos = container.querySelectorAll('.sm-marquee__set')
    expect(within(conjuntos[0]).getByAltText('Asun Supermercados')).toBeInTheDocument()
    expect(conjuntos.length).toBeGreaterThanOrEqual(2)
    expect(conjuntos[0]).not.toHaveAttribute('aria-hidden')
    expect(conjuntos[1]).toHaveAttribute('aria-hidden', 'true')
    expect(conjuntos[1]).toHaveAttribute('inert')
  })

  it('só mostra as redes recebidas (nenhum logo de rede suspensa aparece sozinho)', () => {
    renderizar({ markets: [MERCADOS[0]] })

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryAllByAltText('Stok Center')).toHaveLength(0)
  })

  it('clique simples chama onSelect com o id da rede', () => {
    const onSelect = jest.fn()
    renderizar({ onSelect })

    fireEvent.click(screen.getByRole('button', { name: 'Stok Center' }))

    expect(onSelect).toHaveBeenCalledWith('stok')
  })

  it('marca a rede selecionada com aria-pressed', () => {
    renderizar({ selectedMarket: 'master' })

    expect(screen.getByRole('button', { name: 'Master Supermercados' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Asun Supermercados' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('anda sozinho para a esquerda', () => {
    const { container } = renderizar()
    quadros(30)

    expect(posicao(container)).toBeLessThan(-10)
    expect(posicao(container)).toBeGreaterThan(-40)
  })

  it('volta ao início quando um conjunto inteiro sai da tela (loop sem salto)', () => {
    const { container } = renderizar()
    quadros(600, 50) // 30 s a 38 px/s = ~1140 px, mais que a largura de um conjunto (1000 px)

    const x = posicao(container)
    expect(x).toBeLessThanOrEqual(0)
    expect(x).toBeGreaterThan(-1000)
  })

  it('não anda com uma rede selecionada', () => {
    const { container } = renderizar({ selectedMarket: 'asun' })
    quadros(30)

    expect(posicao(container)).toBe(0)
  })

  it('não anda com movimento reduzido', () => {
    reduzido = true
    const { container } = renderizar()
    quadros(30)

    expect(posicao(container)).toBe(0)
  })

  it('arrastar move a faixa e o fim do arraste não conta como clique no logo', () => {
    const onSelect = jest.fn()
    const { container } = renderizar({ selectedMarket: 'asun', onSelect })

    fireEvent.pointerDown(faixa(), { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 300 })
    fireEvent.pointerMove(faixa(), { pointerId: 1, pointerType: 'mouse', clientX: 200 })
    expect(posicao(container)).toBe(-100)

    fireEvent.pointerUp(faixa(), { pointerId: 1, pointerType: 'mouse', clientX: 200 })
    fireEvent.click(screen.getByRole('button', { name: 'Stok Center' }))
    expect(onSelect).not.toHaveBeenCalled()

    // O clique seguinte, sem arraste, volta a funcionar.
    fireEvent.click(screen.getByRole('button', { name: 'Stok Center' }))
    expect(onSelect).toHaveBeenCalledWith('stok')
  })

  it('um movimento menor que o limiar ainda é clique', () => {
    const onSelect = jest.fn()
    renderizar({ onSelect })

    fireEvent.pointerDown(faixa(), { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 300 })
    fireEvent.pointerMove(faixa(), { pointerId: 1, pointerType: 'mouse', clientX: 297 })
    fireEvent.pointerUp(faixa(), { pointerId: 1, pointerType: 'mouse', clientX: 297 })
    fireEvent.click(screen.getByRole('button', { name: 'Asun Supermercados' }))

    expect(onSelect).toHaveBeenCalledWith('asun')
  })
})
