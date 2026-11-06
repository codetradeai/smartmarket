import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

// Três ids de catálogo, dois produtos reais: p1 e p2 são o mesmo item (Rissul 616461).
jest.mock('../data', () => ({
  CATEGORIES: [{ id: 'todos', label: 'Todos', icon: '🏪' }],
  MARKETS: [{ id: 'rissul', name: 'Rissul', color: '#00863F' }],
  PRODUCTS: [
    { id: 'p1', name: 'Açúcar Caravelas 1kg', brand: 'A', category: 'mercearia', unit: '1kg', image: '🍬', supermercadoOrigem: 'Rissul', idOrigem: '616461', prices: { rissul: 5 } },
    { id: 'p2', name: 'Açúcar Caravelas 1kg', brand: 'A', category: 'mercearia', unit: '1kg', image: '🍬', supermercadoOrigem: 'Rissul', idOrigem: '616461', prices: { rissul: 5 } },
    { id: 'p3', name: 'Sal 1kg', brand: 'B', category: 'mercearia', unit: '1kg', image: '🧂', supermercadoOrigem: 'Rissul', idOrigem: '777', prices: { rissul: 3 } },
  ],
}))

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, isAdmin: false, isLoading: false, user: null }),
}))

describe('Home: totais por produto distinto (rede + id de origem)', () => {
  beforeEach(() => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
  })

  it('o contador de produtos com preço mostra 2, não os 3 ids de catálogo', () => {
    const contador = screen.getByText('Produtos com preço coletado').closest('div')
    expect(contador.querySelector('dd')).toHaveTextContent(/^2$/)
  })

  it('o convite do catálogo mostra 2', () => {
    expect(screen.getByRole('heading', { name: 'Quer ver todos os 2 produtos do catálogo?' })).toBeInTheDocument()
  })
})
