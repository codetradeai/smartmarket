import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => {
    throw new Error('sem provider')
  },
}))

function renderizar() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

const campoBuscaDaNavbar = () => screen.getByPlaceholderText('Buscar produtos, marcas ou categorias...')
const botaoCategoria = (nome) => screen.getByRole('button', { name: nome })
const contadorDoCarrinho = () => screen.getByRole('button', { name: 'Minha Lista de Compras' })

describe('Home', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('mostra o titulo principal e o usuario de demonstracao na navbar', () => {
    renderizar()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Economize no mercado/i)
    expect(screen.getByText('Davi Cardozo')).toBeInTheDocument()
    expect(screen.getByText('davi@smartmarket.com.br')).toBeInTheDocument()
  })

  it('lista os quatro produtos de demonstracao com precos formatados', () => {
    renderizar()

    expect(screen.getByText('Arroz Branco Tipo 1 5kg')).toBeInTheDocument()
    expect(screen.getByText('Feijão Preto Tipo 1 1kg')).toBeInTheDocument()
    expect(screen.getByText('Leite UHT Integral 1L')).toBeInTheDocument()
    expect(screen.getByText('Café Torrado e Moído 500g')).toBeInTheDocument()
    expect(screen.getByText('R$ 26.90')).toBeInTheDocument()
    expect(screen.getByText('R$ 28.50')).toBeInTheDocument()
  })

  it('indica o mercado mais barato e a economia apenas quando ha diferenca', () => {
    renderizar()

    expect(screen.getAllByText('Mais barato no Fort Atacadista')).toHaveLength(2)
    expect(screen.getByText('-R$ 1.60')).toBeInTheDocument()
    expect(screen.getByText('Mais barato no Carrefour')).toBeInTheDocument()
    expect(screen.getByText('-R$ 0.80')).toBeInTheDocument()
    expect(screen.queryByText('Mais barato no Empate')).not.toBeInTheDocument()
    expect(screen.getAllByText(/^Mais barato no/)).toHaveLength(3)
  })

  it('o campo "Nome do Produto" nao esta ligado ao filtro (comportamento atual)', () => {
    renderizar()

    fireEvent.change(screen.getByPlaceholderText('Ex: Arroz Integral 1kg'), { target: { value: 'xyz' } })

    expect(screen.getByText('Arroz Branco Tipo 1 5kg')).toBeInTheDocument()
    expect(screen.getByText('Leite UHT Integral 1L')).toBeInTheDocument()
  })

  describe('filtro por categoria', () => {
    it('mostra apenas os graos', () => {
      renderizar()

      fireEvent.click(botaoCategoria('graos'))

      expect(screen.getByText('Arroz Branco Tipo 1 5kg')).toBeInTheDocument()
      expect(screen.getByText('Feijão Preto Tipo 1 1kg')).toBeInTheDocument()
      expect(screen.queryByText('Leite UHT Integral 1L')).not.toBeInTheDocument()
      expect(screen.queryByText('Café Torrado e Moído 500g')).not.toBeInTheDocument()
    })

    it('mostra apenas laticinios e volta a mostrar tudo em "todos"', () => {
      renderizar()

      fireEvent.click(botaoCategoria('laticinios'))
      expect(screen.getByText('Leite UHT Integral 1L')).toBeInTheDocument()
      expect(screen.queryByText('Arroz Branco Tipo 1 5kg')).not.toBeInTheDocument()

      fireEvent.click(botaoCategoria('todos'))
      expect(screen.getByText('Arroz Branco Tipo 1 5kg')).toBeInTheDocument()
      expect(screen.getByText('Leite UHT Integral 1L')).toBeInTheDocument()
    })

    it('mostra apenas mercearia', () => {
      renderizar()

      fireEvent.click(botaoCategoria('mercearia'))

      expect(screen.getByText('Café Torrado e Moído 500g')).toBeInTheDocument()
      expect(screen.queryByText('Feijão Preto Tipo 1 1kg')).not.toBeInTheDocument()
    })
  })

  describe('busca', () => {
    it('filtra pelo nome do produto a partir da navbar, sem diferenciar maiusculas', () => {
      renderizar()
      const campo = campoBuscaDaNavbar()

      fireEvent.change(campo, { target: { value: 'ARROZ' } })
      fireEvent.submit(campo.closest('form'))

      expect(screen.getByText('Arroz Branco Tipo 1 5kg')).toBeInTheDocument()
      expect(screen.queryByText('Feijão Preto Tipo 1 1kg')).not.toBeInTheDocument()
    })

    it('filtra pela marca no campo de busca especializada', () => {
      renderizar()

      fireEvent.change(screen.getByPlaceholderText('Pesquisar por categoria...'), { target: { value: 'pilão' } })

      expect(screen.getByText('Café Torrado e Moído 500g')).toBeInTheDocument()
      expect(screen.queryByText('Arroz Branco Tipo 1 5kg')).not.toBeInTheDocument()
    })

    it('combina busca e categoria, e nao mostra nada quando nada corresponde', () => {
      renderizar()
      fireEvent.change(screen.getByPlaceholderText('Pesquisar por categoria...'), { target: { value: 'arroz' } })
      fireEvent.click(botaoCategoria('laticinios'))

      expect(screen.queryByText('Arroz Branco Tipo 1 5kg')).not.toBeInTheDocument()
      expect(screen.queryByText('Leite UHT Integral 1L')).not.toBeInTheDocument()
    })

    it('limpa a busca pelo botao de limpar', () => {
      renderizar()
      const campo = screen.getByPlaceholderText('Pesquisar por categoria...')
      fireEvent.change(campo, { target: { value: 'arroz' } })
      expect(screen.queryByText('Leite UHT Integral 1L')).not.toBeInTheDocument()

      fireEvent.click(screen.getByTitle('Limpar campo'))

      expect(screen.getByText('Leite UHT Integral 1L')).toBeInTheDocument()
    })
  })

  it('incrementa o contador da lista ao adicionar um produto', () => {
    renderizar()
    expect(contadorDoCarrinho()).toHaveTextContent('3')

    fireEvent.click(screen.getAllByRole('button', { name: '+ Adicionar à Lista' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: '+ Adicionar à Lista' })[1])

    expect(contadorDoCarrinho()).toHaveTextContent('5')
  })

  it('mostra o estado de carregamento por 2 segundos', () => {
    jest.useFakeTimers()
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Testar Estado Loading' }))
    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled()

    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('button', { name: 'Testar Estado Loading' })).toBeEnabled()
  })

  describe('modal de comparacao', () => {
    const abrirModal = () => fireEvent.click(screen.getByRole('button', { name: 'Testar Modal de Comparação' }))

    it('abre com o conteudo da comparacao', () => {
      renderizar()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      abrirModal()

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Comparação Detalhada de Preço')).toBeInTheDocument()
      expect(screen.getByLabelText('Definir alerta de preço (R$)')).toBeInTheDocument()
    })

    it('fecha pelo botao Cancelar', () => {
      renderizar()
      abrirModal()

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('fecha pelo botao Salvar Alerta', () => {
      renderizar()
      abrirModal()

      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alerta' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('fecha pelo botao de fechar do modal', () => {
      renderizar()
      abrirModal()

      fireEvent.click(screen.getByRole('button', { name: 'Fechar modal' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
