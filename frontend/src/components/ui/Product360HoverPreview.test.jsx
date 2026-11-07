import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { Product360HoverPreview } from './Product360HoverPreview'
import { reiniciarCacheDoCatalogo } from '../../utils/carregarProdutos'

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
    jest.useFakeTimers()
    // Mock padrão do matchMedia (sem prefers-reduced-motion)
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
  })

  afterEach(() => {
    jest.useRealTimers()
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
      jest.advanceTimersByTime(190)
    })

    // O quadro mudou para frame 1
    expect(container).toHaveAttribute('data-active-frame', '1')

    // Avança mais um intervalo
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(container).toHaveAttribute('data-active-frame', '2')
  })

  it('ao retirar o mouse, para imediatamente a animação e retorna ao quadro frontal 0', () => {
    render(<Product360HoverPreview product={mockProduct360} alt={mockProduct360.name} fps={10} />)

    const container = screen.getByTestId('product-360-hover-preview')

    // Entra e roda alguns quadros
    fireEvent.mouseEnter(container)
    act(() => {
      jest.advanceTimersByTime(290)
    })
    expect(container).toHaveAttribute('data-active-frame', '2')

    // Sai do card
    fireEvent.mouseLeave(container)

    // Quadro retorna imediatamente a 0
    expect(container).toHaveAttribute('data-active-frame', '0')

    // Mesmo que o tempo passe, o frame permanece 0
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(container).toHaveAttribute('data-active-frame', '0')
  })

  it('obedece a preferência prefers-reduced-motion e não inicia o giro automático', () => {
    // Simula usuário que ativou "reduzir movimento" no sistema
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    render(<Product360HoverPreview product={mockProduct360} alt={mockProduct360.name} />)
    const container = screen.getByTestId('product-360-hover-preview')

    fireEvent.mouseEnter(container)
    act(() => {
      jest.advanceTimersByTime(400)
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
    const handleCardClick = jest.fn()
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

describe('Product360HoverPreview: frames sob demanda', () => {
  const produto = { id: 'p77', imageLocal: '/estatica.webp', recursosVisuais: { has360: true } }
  let fetchOriginal
  beforeEach(() => {
    reiniciarCacheDoCatalogo()
    fetchOriginal = global.fetch
  })
  afterEach(() => {
    global.fetch = fetchOriginal
  })

  it('sem hover não baixa frames.json; no hover baixa uma vez', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ p77: ['f0.webp', 'f1.webp', 'f2.webp'] }) }))

    render(<Product360HoverPreview product={produto} />)
    expect(screen.getByTestId('product-360-hover-preview')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()

    fireEvent.mouseEnter(screen.getByTestId('product-360-hover-preview'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/catalogo/frames.json'))
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
