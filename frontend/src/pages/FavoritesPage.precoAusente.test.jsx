import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FavoritesPage from './FavoritesPage'

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

jest.mock('../services', () => ({
  favoritoService: {
    listarMercados: jest.fn().mockResolvedValue([]),
    listarProdutos: jest.fn().mockResolvedValue([]),
  },
  produtoService: {},
  mercadoService: {},
}))

async function renderizar() {
  localStorage.setItem('sm_fav_products', JSON.stringify(['p1', 'p2']))
  await act(async () => {
    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    )
  })
}

const cartaoDe = (nome) => screen.getByRole('heading', { name: nome }).closest('.group')

describe('FavoritesPage com preço em uma rede só', () => {
  beforeEach(() => localStorage.clear())

  it('não diz "Comparado em 1 mercados" nem "Melhor Preço" quando só uma rede tem preço', async () => {
    await renderizar()
    const cartao = cartaoDe('Arroz Só Fort 5kg')

    expect(cartao).not.toHaveTextContent(/Comparado em 1 mercados/)
    expect(cartao).not.toHaveTextContent(/Melhor Preço/)
    expect(cartao).toHaveTextContent('Preço no Fort Atacadista')
    expect(cartao).toHaveTextContent('Preço só nesta rede')
  })

  it('no alerta, a rede sem preço aparece como "sem preço nesta rede"', async () => {
    await renderizar()
    fireEvent.click(within(cartaoDe('Arroz Só Fort 5kg')).getByTitle('Definir alerta de preço'))

    expect(screen.getByRole('option', { name: /Somente no Fort Atacadista/ })).toHaveTextContent('Somente no Fort Atacadista (Hoje: R$ 20.00)')
    expect(screen.getByRole('option', { name: /Somente no Asun Supermercados/ })).toHaveTextContent('Somente no Asun Supermercados (sem preço nesta rede)')
  })

  it('mantém a comparação quando há preço em duas redes', async () => {
    await renderizar()
    const cartao = cartaoDe('Feijão Duas Redes 1kg')

    expect(cartao).toHaveTextContent('Comparado em 2 mercados')
    expect(cartao).toHaveTextContent('-R$ 1.00')
  })
})
