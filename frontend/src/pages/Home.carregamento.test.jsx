import { fireEvent, render, screen } from '@testing-library/react'
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

  it('ao escolher um setor mostra o carregamento e depois a prévia', async () => {
    carregarProdutos.mockResolvedValue(PRODUCTS)
    renderizar()
    fireEvent.click(screen.getByRole('button', { name: /Grãos e Arroz/ }))

    expect(screen.getByRole('status')).toHaveTextContent('Carregando o catálogo')
    expect(await screen.findByText(/Prévia do setor/)).toBeInTheDocument()
    expect(carregarProdutos).toHaveBeenCalledTimes(1)
  })

  it('se o catálogo falhar, mostra o erro e deixa tentar novamente', async () => {
    carregarProdutos.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(PRODUCTS)
    renderizar()
    fireEvent.click(screen.getByRole('button', { name: /Grãos e Arroz/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o catálogo')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText(/Prévia do setor/)).toBeInTheDocument()
  })
})
