import { fireEvent, render, screen } from '@testing-library/react'
import ComCatalogo from './ComCatalogo'
import { carregarProdutos } from '../utils/carregarProdutos'

jest.mock('../utils/carregarProdutos', () => ({ carregarProdutos: jest.fn() }))

describe('ComCatalogo', () => {
  beforeEach(() => carregarProdutos.mockReset())

  it('mostra o carregamento enquanto o catálogo não chega e depois entrega os produtos', async () => {
    carregarProdutos.mockResolvedValue([{ id: 'p1', name: 'Arroz' }])
    render(<ComCatalogo>{(produtos) => <p>{produtos.length} produto(s): {produtos[0].name}</p>}</ComCatalogo>)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando o catálogo')
    expect(await screen.findByText('1 produto(s): Arroz')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('mostra o erro e permite tentar novamente', async () => {
    carregarProdutos.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce([{ id: 'p1', name: 'Feijão' }])
    render(<ComCatalogo>{(produtos) => <p>ok {produtos[0].name}</p>}</ComCatalogo>)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o catálogo')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('ok Feijão')).toBeInTheDocument()
    expect(carregarProdutos).toHaveBeenCalledTimes(2)
  })
})
