import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import { carregarProdutos } from '../utils/carregarProdutos'

jest.mock('../utils/carregarProdutos', () => ({ carregarProdutos: jest.fn() }))
jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../test/dataFixture')))
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, isAdmin: false, isLoading: false, user: null }),
}))

const { PRODUCTS } = jest.requireActual('../test/dataFixture')

const renderizar = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

describe('Home: catálogo sob demanda', () => {
  beforeEach(() => carregarProdutos.mockReset())

  it('a primeira dobra aparece sem baixar o catálogo', () => {
    carregarProdutos.mockResolvedValue(PRODUCTS)
    renderizar()

    expect(screen.getByText('Anúncios com preço coletado')).toBeInTheDocument()
    expect(carregarProdutos).not.toHaveBeenCalled()
  })

  it('o Raio-X já nasce com o primeiro setor ativo, sem baixar o catálogo antes da hora', () => {
    carregarProdutos.mockResolvedValue(PRODUCTS)
    renderizar()

    expect(screen.getByRole('region', { name: 'Raio-X de preços: Biscoitos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Biscoitos/ })).toHaveAttribute('aria-pressed', 'true')
    expect(carregarProdutos).not.toHaveBeenCalled()
  })

  it('a vitrine tem só os setores de maior diferença de preço, com a transparência do critério', () => {
    carregarProdutos.mockResolvedValue(PRODUCTS)
    renderizar()

    const grupo = screen.getByRole('group', { name: /Setores com maior diferença de preço/ })
    const nomes = Array.from(grupo.querySelectorAll('button')).map((b) => b.textContent.replace(/\d+% em média/, '').trim())
    expect(nomes).toEqual(['Biscoitos', 'Frios e Laticínios', 'Mercearia', 'Padaria', 'Limpeza'])
    expect(screen.getByText(/Mostramos os 5 setores com maior diferença média de preço entre redes/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver todos os setores no catálogo/ })).toBeInTheDocument()
  })

  it('ao escolher um setor mostra o carregamento e depois o Raio-X do setor', async () => {
    carregarProdutos.mockResolvedValue(PRODUCTS)
    renderizar()
    fireEvent.click(screen.getByRole('button', { name: /Padaria/ }))

    expect(screen.getByRole('status')).toHaveTextContent('Carregando o catálogo')
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'Raio-X de preços: Padaria' })).toBeInTheDocument()
    expect(carregarProdutos).toHaveBeenCalledTimes(1)
  })

  it('se o catálogo falhar, mostra o erro e deixa tentar novamente', async () => {
    carregarProdutos.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(PRODUCTS)
    renderizar()
    fireEvent.click(screen.getByRole('button', { name: /Padaria/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o catálogo')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(screen.getByRole('region', { name: /Raio-X de preços/ })).toBeInTheDocument()
  })
})
