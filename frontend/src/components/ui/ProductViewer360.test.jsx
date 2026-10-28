import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProductViewer360 } from './ProductViewer360'

describe('ProductViewer360 (Fase 3B)', () => {
  const mockFrames = [
    '/assets/frame-0.webp',
    '/assets/frame-1.webp',
    '/assets/frame-2.webp',
    '/assets/frame-3.webp',
  ]

  let originalImage

  beforeEach(() => {
    vi.useFakeTimers()
    originalImage = global.Image
    // Simula carregamento síncrono das imagens no teste jsdom
    global.Image = class {
      constructor() {
        this.onload = null
        this.onerror = null
        this._src = ''
      }
      set src(value) {
        this._src = value
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 10)
      }
      get src() {
        return this._src
      }
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    global.Image = originalImage
  })

  it('exibe estado de ausência de recurso se a lista de frames for vazia ou menor que 2', () => {
    render(<ProductViewer360 frames={[]} alt="Produto Sem Quadros" />)
    expect(screen.getByText('Visualização 360° Indisponível')).toBeInTheDocument()

    render(<ProductViewer360 frames={['/apenas-um.webp']} alt="Apenas um quadro" />)
    expect(screen.getAllByText('Visualização 360° Indisponível').length).toBe(2)
  })

  it('carrega quadros e exibe o visualizador com controles acessíveis', async () => {
    render(<ProductViewer360 frames={mockFrames} alt="Café Melitta 360" />)

    // Estado inicial de loading
    expect(screen.getByText('Carregando rotação 360°...')).toBeInTheDocument()

    // Avança timers para disparar o onload simulado das imagens
    act(() => {
      vi.advanceTimersByTime(50)
    })

    // Loading sumiu e visualizador está pronto
    expect(screen.queryByText('Carregando rotação 360°...')).toBeNull()
    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Visualizador 360 graus de Café Melitta 360')
    )
    expect(screen.getByRole('slider', { name: /Controle de rotação 360 graus/i })).toBeInTheDocument()
    expect(screen.getByText('Girar 360°')).toBeInTheDocument()
  })

  it('rotaciona os quadros via navegação por teclado (ArrowRight e ArrowLeft)', async () => {
    render(<ProductViewer360 frames={mockFrames} alt="Café Melitta 360" />)

    act(() => {
      vi.advanceTimersByTime(50)
    })

    const region = screen.getByRole('region')
    expect(screen.getByText('1/4')).toBeInTheDocument()

    // Seta para direita avança frame
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(screen.getByText('2/4')).toBeInTheDocument()

    // Seta para direita novamente
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(screen.getByText('3/4')).toBeInTheDocument()

    // Seta para esquerda retrocede frame
    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    expect(screen.getByText('2/4')).toBeInTheDocument()

    // Tecla End vai para o último
    fireEvent.keyDown(region, { key: 'End' })
    expect(screen.getByText('4/4')).toBeInTheDocument()

    // Tecla Home volta ao início
    fireEvent.keyDown(region, { key: 'Home' })
    expect(screen.getByText('1/4')).toBeInTheDocument()
  })

  it('permite rotação por arraste (Pointer Events: pointerdown e pointermove)', async () => {
    const { container } = render(<ProductViewer360 frames={mockFrames} alt="Café Melitta 360" sensitivity={10} />)

    act(() => {
      vi.advanceTimersByTime(50)
    })

    const dragArea = container.querySelector('.cursor-grab')
    expect(dragArea).not.toBeNull()

    // Inicia arraste
    fireEvent.pointerDown(dragArea, { clientX: 200, pointerId: 1 })
    // Arrasta 30px para a esquerda (gira sentido horário)
    fireEvent.pointerMove(dragArea, { clientX: 170, pointerId: 1 })
    // Solta
    fireEvent.pointerUp(dragArea, { pointerId: 1 })

    // O frame deve ter avançado proporcionalmente à sensibilidade
    expect(screen.queryByText('1/4')).toBeNull()
  })

  it('alterna rotação automática contínua pelo botão Play/Pause', async () => {
    render(<ProductViewer360 frames={mockFrames} alt="Café Melitta 360" />)

    act(() => {
      vi.advanceTimersByTime(50)
    })

    const playButton = screen.getByText('Girar 360°')
    expect(playButton).toBeInTheDocument()

    // Clica para dar play
    fireEvent.click(playButton)
    expect(screen.getByText('Pausar')).toBeInTheDocument()

    // Avança o timer de autoplay (120ms por frame)
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Clica para pausar
    const pauseButton = screen.getByText('Pausar')
    fireEvent.click(pauseButton)
    expect(screen.getByText('Girar 360°')).toBeInTheDocument()
  })

  it('libera timers e cancela listeners seguramente ao desmontar', async () => {
    const { unmount } = render(
      <ProductViewer360 frames={mockFrames} alt="Café Melitta 360" autoRotateInitially={true} />
    )

    act(() => {
      vi.advanceTimersByTime(50)
    })

    // Desmonta sem estourar erros
    expect(() => unmount()).not.toThrow()
  })
})
