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

  it('carrega quadros e exibe o visualizador com controles por arraste', async () => {
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
    expect(screen.getByText('Clique e arraste para girar')).toBeInTheDocument()
  })

  it('rotaciona os quadros via navegação por teclado (ArrowRight e ArrowLeft)', async () => {
    render(<ProductViewer360 frames={mockFrames} alt="Café Melitta 360" />)

    act(() => {
      vi.advanceTimersByTime(50)
    })

    const region = screen.getByRole('region')
    const img = screen.getByAltText(/Café Melitta 360 - visualização 360 graus/i)
    expect(img).toHaveAttribute('src', mockFrames[0])

    // Seta para direita avança frame
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(img).toHaveAttribute('src', mockFrames[1])

    // Seta para direita novamente
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(img).toHaveAttribute('src', mockFrames[2])

    // Seta para esquerda retrocede frame
    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    expect(img).toHaveAttribute('src', mockFrames[1])

    // Tecla End vai para o último
    fireEvent.keyDown(region, { key: 'End' })
    expect(img).toHaveAttribute('src', mockFrames[3])

    // Tecla Home volta ao início
    fireEvent.keyDown(region, { key: 'Home' })
    expect(img).toHaveAttribute('src', mockFrames[0])
  })

  it('permite rotação por arraste (Pointer Events: pointerdown e pointermove)', async () => {
    const { container } = render(<ProductViewer360 frames={mockFrames} alt="Café Melitta 360" sensitivity={10} />)

    act(() => {
      vi.advanceTimersByTime(50)
    })

    const dragArea = container.querySelector('.cursor-grab')
    expect(dragArea).not.toBeNull()

    const img = screen.getByAltText(/Café Melitta 360 - visualização 360 graus/i)
    expect(img).toHaveAttribute('src', mockFrames[0])

    // Inicia arraste
    fireEvent.pointerDown(dragArea, { clientX: 200, pointerId: 1 })
    // Arrasta 20px para a esquerda (gira 2 frames)
    fireEvent.pointerMove(dragArea, { clientX: 180, pointerId: 1 })
    // Solta
    fireEvent.pointerUp(dragArea, { pointerId: 1 })

    // O frame avançou
    expect(img).toHaveAttribute('src', mockFrames[2])
  })

  it('desmonta com segurança sem estourar erros de timers pendentes', async () => {
    const { unmount } = render(
      <ProductViewer360 frames={mockFrames} alt="Café Melitta 360" />
    )

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(() => unmount()).not.toThrow()
  })
})
