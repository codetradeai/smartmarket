import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Product360HoverPreview } from './Product360HoverPreview'

describe('Product360HoverPreview (Fase 3D)', () => {
  const mockProduct360 = {
    id: 'p2',
    name: 'Café em pó Melitta Tradicional 250g',
    imageLocal: '/images/produtos/7710331_3431817a8639.webp',
    recursosVisuais: {
      has360: true,
      frames: [
        '/images/produtos/360/7710331/frame_00.webp',
        '/images/produtos/360/7710331/frame_01.webp',
        '/images/produtos/360/7710331/frame_02.webp',
        '/images/produtos/360/7710331/frame_03.webp',
      ],
    },
  }

  const mockProductComum = {
    id: 'p1',
    name: 'Café em pó Melitta Tradicional 500g',
    imageLocal: '/images/produtos/7710359_10fb88449dd6.webp',
  }

  beforeEach(() => {
    vi.useFakeTimers()
    // Mock padrão do matchMedia (sem prefers-reduced-motion)
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza estático sem selo 360° para produtos comuns', () => {
    render(<Product360HoverPreview product={mockProductComum} alt="Café Comum" />)

    expect(screen.queryByTestId('product-360-hover-preview')).toBeNull()
    expect(screen.queryByText(/360°/)).toBeNull()
    const img = screen.getByRole('img', { name: 'Café Comum' })
    expect(img).toHaveAttribute('src', mockProductComum.imageLocal)
  })

  it('exibe o selo 360° no produto p2 que possui sequência autêntica', () => {
    render(<Product360HoverPreview product={mockProduct360} alt={mockProduct360.name} />)

    const container = screen.getByTestId('product-360-hover-preview')
    expect(container).toBeInTheDocument()
    expect(screen.getByText('360°')).toBeInTheDocument()
    expect(container).toHaveAttribute('data-active-frame', '0')
  })

  it('inicia rotação suave ao passar o mouse e altera os quadros', () => {
    render(<Product360HoverPreview product={mockProduct360} alt={mockProduct360.name} fps={10} />)

    const container = screen.getByTestId('product-360-hover-preview')
    expect(container).toHaveAttribute('data-active-frame', '0')

    // Dispara mouseEnter
    fireEvent.mouseEnter(container)

    // Aguarda debounce de intenção (80ms) + 1 frame (100ms)
    act(() => {
      vi.advanceTimersByTime(190)
    })

    // O quadro mudou para frame 1
    expect(container).toHaveAttribute('data-active-frame', '1')

    // Avança mais um intervalo
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(container).toHaveAttribute('data-active-frame', '2')
  })

  it('ao retirar o mouse, para imediatamente a animação e retorna ao quadro frontal 0', () => {
    render(<Product360HoverPreview product={mockProduct360} alt={mockProduct360.name} fps={10} />)

    const container = screen.getByTestId('product-360-hover-preview')

    // Entra e roda alguns quadros
    fireEvent.mouseEnter(container)
    act(() => {
      vi.advanceTimersByTime(290)
    })
    expect(container).toHaveAttribute('data-active-frame', '2')

    // Sai do card
    fireEvent.mouseLeave(container)

    // Quadro retorna imediatamente a 0
    expect(container).toHaveAttribute('data-active-frame', '0')

    // Mesmo que o tempo passe, o frame permanece 0
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(container).toHaveAttribute('data-active-frame', '0')
  })

  it('obedece a preferência prefers-reduced-motion e não inicia o giro automático', () => {
    // Simula usuário que ativou "reduzir movimento" no sistema
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(<Product360HoverPreview product={mockProduct360} alt={mockProduct360.name} />)
    const container = screen.getByTestId('product-360-hover-preview')

    fireEvent.mouseEnter(container)
    act(() => {
      vi.advanceTimersByTime(400)
    })

    // Permanece no frame 0 por respeito à acessibilidade
    expect(container).toHaveAttribute('data-active-frame', '0')
  })

  it('limpa os timers com segurança ao desmontar o componente', () => {
    const { unmount } = render(
      <Product360HoverPreview product={mockProduct360} alt={mockProduct360.name} />
    )
    const container = screen.getByTestId('product-360-hover-preview')

    fireEvent.mouseEnter(container)
    expect(() => unmount()).not.toThrow()
  })

  it('permite que cliques no card se propaguem normalmente sem bloqueio', () => {
    const handleCardClick = vi.fn()
    render(
      <div onClick={handleCardClick} data-testid="card-parent">
        <Product360HoverPreview product={mockProduct360} alt={mockProduct360.name} />
      </div>
    )

    const container = screen.getByTestId('product-360-hover-preview')
    fireEvent.click(container)

    // O clique foi propagado para o card pai abrir o modal
    expect(handleCardClick).toHaveBeenCalledTimes(1)
  })
})
