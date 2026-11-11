import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

// Catálogo em que o Carrefour existe em MARKETS mas não tem nenhum anúncio com preço (como no data.js real).
jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../data')))
jest.mock('../data', () => ({
  CATEGORIES: [{ id: 'todos', label: 'Todos', icon: '🏪' }, { id: 'graos', label: 'Grãos', icon: '🌾' }],
  MARKETS: [
    { id: 'fort', name: 'Fort Atacadista', color: '#F5651B' },
    { id: 'asun', name: 'Asun Supermercados', color: '#00863F' },
    { id: 'carrefour', name: 'Carrefour Mercado', color: '#1A63B9' },
  ],
  PRODUCTS: [
    { id: 'p1', name: 'Arroz Só Fort 5kg', brand: 'A', category: 'graos', unit: '5kg', image: '🌾', idOrigem: '1', supermercadoOrigem: 'Fort Atacadista', prices: { fort: 20 } },
    { id: 'p2', name: 'Feijão Só Asun 1kg', brand: 'B', category: 'graos', unit: '1kg', image: '🫘', idOrigem: '2', supermercadoOrigem: 'Asun Supermercados', prices: { asun: 9 } },
    { id: 'p3', name: 'Sal Sem Preço 1kg', brand: 'C', category: 'mercearia', unit: '1kg', image: '🧂', prices: {} },
  ],
}))

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, isAdmin: false, isLoading: false, user: null }),
}))

function renderizar() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home: números e redes sem inflar', () => {
  it('conta só as redes que têm anúncios (o Carrefour sem produtos não entra)', () => {
    renderizar()

    const dd = screen.getByText('Redes no catálogo').closest('div').querySelector('dd')
    expect(dd).toHaveTextContent(/^2$/)
  })

  it('a faixa de redes conta só as com coleta ativa (o Fort tem produtos, mas está suspenso no scraper)', () => {
    renderizar()

    expect(screen.getByText('redes com coleta ativa').previousSibling).toHaveTextContent('01')
    const faixa = screen.getByRole('group', { name: 'Redes com coleta de preços' })
    expect(faixa.querySelector('img[alt="Asun Supermercados"]')).toBeInTheDocument()
    expect(faixa.querySelector('img[alt="Fort Atacadista"]')).not.toBeInTheDocument()
  })

  it('o rodapé lista só as redes com produtos, sem o Carrefour', () => {
    renderizar()

    const coluna = screen.getByText('Redes no RS').parentElement
    expect(coluna).toHaveTextContent('Fort Atacadista')
    expect(coluna).toHaveTextContent('Asun Supermercados')
    expect(coluna).not.toHaveTextContent(/Carrefour/)
  })

  it('o rodapé separa as redes com coleta ativa das mapeadas (Fort suspenso fica no segundo grupo)', () => {
    renderizar()

    const coluna = screen.getByText('Redes no RS').parentElement
    const ativas = within(coluna).getByText('Coleta ativa').nextElementSibling
    const mapeadas = within(coluna).getByText(/Mapeadas no RS/).nextElementSibling
    expect(ativas).toHaveTextContent('Asun Supermercados')
    expect(ativas).not.toHaveTextContent('Fort Atacadista')
    expect(mapeadas).toHaveTextContent('Fort Atacadista')
  })

  it('chama os produtos coletados de "anúncios", cada um com o preço da rede onde foi coletado', () => {
    renderizar()

    expect(screen.getByText('Anúncios com preço coletado')).toBeInTheDocument()
    expect(screen.queryByText('Produtos com preço coletado')).not.toBeInTheDocument()
    expect(screen.getByText(/cada um com o preço da rede onde foi coletado/)).toBeInTheDocument()
    expect(screen.getByText(/anúncios monitorados/)).toBeInTheDocument()
    expect(screen.queryByText(/produtos monitorados/)).not.toBeInTheDocument()
  })

  it('o convite ao cadastro fala em anúncios, não em "produtos do catálogo", e não cita "8 supermercados"', () => {
    renderizar()

    expect(screen.getByText(/libera os 3 anúncios do catálogo/)).toBeInTheDocument()
    expect(within(document.body).queryByText(/dos 8 supermercados/)).not.toBeInTheDocument()
  })
})
