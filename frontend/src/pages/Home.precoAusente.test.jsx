import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

// Catálogo sem preço simulado: cada produto tem preço só na rede onde foi coletado.
jest.mock('../data', () => ({
  CATEGORIES: [{ id: 'todos', label: 'Todos', icon: '🏪' }, { id: 'graos', label: 'Grãos', icon: '🌾' }],
  MARKETS: [
    { id: 'fort', name: 'Fort Atacadista', color: '#F5651B' },
    { id: 'asun', name: 'Asun Supermercados', color: '#00863F' },
  ],
  PRODUCTS: [
    { id: 'p1', name: 'Arroz Só Fort 5kg', brand: 'A', category: 'graos', unit: '5kg', image: '🌾', prices: { fort: 20 } },
    { id: 'p2', name: 'Feijão Duas Redes 1kg', brand: 'B', category: 'graos', unit: '1kg', image: '🫘', prices: { fort: 8, asun: 9 } },
  ],
}))

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, isAdmin: false, isLoading: false, user: null }),
}))

function renderizar() {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByRole('button', { name: /Grãos e Arroz/ }))
}

const cartaoDe = (nome) => screen.getByText(nome).closest('.group')

describe('Home com preço em uma rede só', () => {
  it('não diz "Comparado em 1 mercados" nem "Melhor Preço" quando só uma rede tem preço', () => {
    renderizar()
    const cartao = cartaoDe('Arroz Só Fort 5kg')

    expect(cartao).not.toHaveTextContent(/Comparado em 1 mercados/)
    expect(cartao).not.toHaveTextContent(/Melhor Preço/)
    expect(cartao).toHaveTextContent('Preço no Fort Atacadista')
    expect(cartao).toHaveTextContent('Preço só nesta rede')
  })

  it('mantém a comparação quando há preço em duas redes', () => {
    renderizar()
    const cartao = cartaoDe('Feijão Duas Redes 1kg')

    expect(cartao).toHaveTextContent('Melhor Preço (Fort Atacadista)')
    expect(cartao).toHaveTextContent('Comparado em 2 mercados')
    expect(cartao).toHaveTextContent('-R$ 1.00')
  })
})
