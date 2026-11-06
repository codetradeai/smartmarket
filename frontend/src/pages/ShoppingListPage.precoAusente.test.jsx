import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShoppingListPage from './ShoppingListPage'

// Catálogo sem preço simulado: cada produto tem preço só na rede onde foi coletado.
jest.mock('../data', () => ({
  CATEGORIES: [{ id: 'todos', label: 'Todos', icon: '🏪' }],
  MARKETS: [
    { id: 'fort', name: 'Fort Atacadista', color: '#F5651B' },
    { id: 'asun', name: 'Asun Supermercados', color: '#00863F' },
    { id: 'stok', name: 'Stok Center', color: '#009640' },
  ],
  PRODUCTS: [
    { id: 'p1', name: 'Arroz 5kg', brand: 'A', category: 'graos', unit: '5kg', image: '🌾', prices: { fort: 20 } },
    { id: 'p2', name: 'Feijão 1kg', brand: 'B', category: 'graos', unit: '1kg', image: '🫘', prices: { fort: 8 } },
    { id: 'p3', name: 'Sal 1kg', brand: 'C', category: 'mercearia', unit: '1kg', image: '🧂', prices: { asun: 2 } },
    { id: 'p4', name: 'Óleo 900ml', brand: 'D', category: 'oleos', unit: '900ml', image: '🫙', prices: { fort: 7, stok: 6 } },
  ],
}))

jest.mock('../services', () => ({
  produtoService: { buscarCatalogoComPrecos: jest.fn().mockResolvedValue([]) },
  mercadoService: { listar: jest.fn().mockResolvedValue([]) },
}))

async function renderizar(lista) {
  sessionStorage.setItem('sm_list', JSON.stringify(lista))
  await act(async () => {
    render(
      <MemoryRouter>
        <ShoppingListPage />
      </MemoryRouter>
    )
  })
}

const cardVencedor = () => screen.getByText(/Onde sua compra sai mais barata|Rede com mais itens da sua lista/).closest('div.relative')

describe('ShoppingListPage com preço em uma rede só', () => {
  beforeEach(() => sessionStorage.clear())

  it('não elege como mais barata a rede que só tem parte da lista', async () => {
    // Fort tem 2 dos 3 itens (R$ 28); Asun tem 1 (R$ 2). Pelo total puro, a Asun "ganharia".
    await renderizar({ p1: 1, p2: 1, p3: 1 })

    const card = cardVencedor()
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('Fort Atacadista')
    expect(within(card).getByText('2 de 3 produtos disponíveis')).toBeInTheDocument()
  })

  it('não promete economia comparando cestas diferentes', async () => {
    await renderizar({ p1: 1, p2: 1, p3: 1 })

    expect(screen.queryByText(/Você economiza no bolso/)).not.toBeInTheDocument()
    expect(screen.queryByText(/mais caro/)).not.toBeInTheDocument()
    expect(screen.getByText('1 de 3 itens com preço nesta rede')).toBeInTheDocument()
  })

  it('avisa que nenhuma rede tem todos os itens', async () => {
    await renderizar({ p1: 1, p2: 1, p3: 1 })

    expect(within(cardVencedor()).getByText(/^🏆 Rede com mais itens da sua lista$/)).toBeInTheDocument()
    expect(within(cardVencedor()).getByText('1 produto(s) sem preço nesta rede')).toBeInTheDocument()
  })

  it('continua comparando quando duas redes têm a lista completa', async () => {
    // Óleo: Fort R$ 7 e Stok R$ 6. As duas têm a lista inteira.
    await renderizar({ p4: 2 })

    const card = cardVencedor()
    expect(within(card).getByText(/^🏆 Onde sua compra sai mais barata$/)).toBeInTheDocument()
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('Stok Center')
    expect(within(card).getByText('até R$ 2.00')).toBeInTheDocument()
    expect(screen.getByText(/\+R\$ 2\.00 mais caro/)).toBeInTheDocument()
  })
})
