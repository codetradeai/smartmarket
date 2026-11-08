import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

// Catálogo sem preço simulado: cada produto tem preço só na rede onde foi coletado.
// MARKETS, CATEGORIES e totais vêm do módulo leve; aqui derivados do mesmo catálogo mockado abaixo.
jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../data')))
jest.mock('../data', () => ({
  CATEGORIES: [{ id: 'todos', label: 'Todos', icon: '🏪' }, { id: 'graos', label: 'Grãos', icon: '🌾' }],
  MARKETS: [
    { id: 'fort', name: 'Fort Atacadista', color: '#F5651B' },
    { id: 'asun', name: 'Asun Supermercados', color: '#00863F' },
  ],
  PRODUCTS: [
    { id: 'p1', name: 'Arroz Só Fort 5kg', brand: 'A', category: 'graos', unit: '5kg', image: '🌾', prices: { fort: 20 } },
    { id: 'p2', name: 'Feijão Duas Redes 1kg', brand: 'B', category: 'graos', unit: '1kg', image: '🫘', prices: { fort: 8, asun: 9 } },
    { id: 'p3', name: 'Sal Sem Preço 1kg', brand: 'C', category: 'mercearia', unit: '1kg', image: '🧂', prices: {} },
  ],
}))

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, isAdmin: false, isLoading: false, user: null }),
}))

async function renderizar() {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByRole('button', { name: /Grãos e Arroz/ }))
  // O catálogo chega por import dinâmico: espera o "Carregando o catálogo…" sumir.
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
}

const cartaoDe = (nome) => screen.getByText(nome).closest('.group')

describe('Home: contador do catálogo', () => {
  const contador = () => screen.getByText('Anúncios com preço coletado').closest('div')

  it('conta só produtos com preço e diz em quantas redes, em vez de "Produtos com preço: total do catálogo"', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    expect(screen.queryByText('Produtos com preço')).not.toBeInTheDocument()
    expect(contador().querySelector('dd')).toHaveTextContent(/^2$/)
    expect(contador()).toHaveTextContent('1 produto em 2+ redes, com preço comparável')
  })

  it('não convida a "comparar todos os produtos nas 8 redes"', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    expect(screen.queryByText(/nas 8 redes do RS\?/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Quer ver todo o catálogo, com 3 anúncios?' })).toBeInTheDocument()
  })
})

describe('Home com preço em uma rede só', () => {
  it('não diz "Comparado em 1 mercados" nem "Melhor Preço" quando só uma rede tem preço', async () => {
    await renderizar()
    const cartao = cartaoDe('Arroz Só Fort 5kg')

    expect(cartao).not.toHaveTextContent(/Comparado em 1 mercados/)
    expect(cartao).not.toHaveTextContent(/Melhor Preço/)
    expect(cartao).toHaveTextContent('Preço no Fort Atacadista')
    expect(cartao).toHaveTextContent('Preço só nesta rede')
  })

  it('mantém a comparação quando há preço em duas redes', async () => {
    await renderizar()
    const cartao = cartaoDe('Feijão Duas Redes 1kg')

    expect(cartao).toHaveTextContent('Melhor Preço (Fort Atacadista)')
    expect(cartao).toHaveTextContent('Comparado em 2 mercados')
    expect(cartao).toHaveTextContent('-R$ 1.00')
  })
})
