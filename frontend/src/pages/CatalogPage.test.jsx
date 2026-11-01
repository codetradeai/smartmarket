import { act, fireEvent, render, screen, within } from '@testing-library/react'
import CatalogPage from './CatalogPage'
import { produtoService, mercadoService, favoritoService } from '../services'
import { PRODUCTS } from '../data'

jest.mock('../services', () => ({
  produtoService: { buscarCatalogoComPrecos: jest.fn() },
  mercadoService: { listar: jest.fn() },
  favoritoService: {
    listarMercados: jest.fn(),
    listarProdutos: jest.fn(),
    favoritarMercado: jest.fn(),
    desfavoritarMercado: jest.fn(),
    favoritarProduto: jest.fn(),
    desfavoritarProduto: jest.fn(),
  },
}))

const MERCADOS = [
  { id: 1, name: 'Fort Atacadista', color: '#E63312' },
  { id: 2, name: 'Carrefour', color: '#1A63B9' },
]

const PRODUTOS = [
  { id: 10, name: 'Arroz Branco', brand: 'Tio João', category: 'graos', unit: '5 kg', image: '🌾', prices: { 1: 22.9, 2: 24.5 } },
  { id: 11, name: 'Leite Integral', brand: 'Italac', category: 'leites', unit: '1 L', image: '🥛', prices: { 1: 4.29 } },
  { id: 12, name: 'Papel Higiênico', brand: '', category: 'higiene', unit: '12 rolos', image: 'imagem-muito-longa', prices: {} },
]

function configurarServicos({ produtos = PRODUTOS, mercados = MERCADOS, favMercados = [], favProdutos = [] } = {}) {
  produtoService.buscarCatalogoComPrecos.mockResolvedValue(produtos)
  mercadoService.listar.mockResolvedValue(mercados)
  favoritoService.listarMercados.mockResolvedValue(favMercados)
  favoritoService.listarProdutos.mockResolvedValue(favProdutos)
  favoritoService.favoritarMercado.mockResolvedValue({})
  favoritoService.desfavoritarMercado.mockResolvedValue()
  favoritoService.favoritarProduto.mockResolvedValue()
  favoritoService.desfavoritarProduto.mockResolvedValue()
}

async function renderizar(opcoes) {
  configurarServicos(opcoes)
  render(<CatalogPage />)
  await screen.findByText(/itens encontrados/)
}

const cartaoDe = (nome) => screen.getByRole('heading', { name: nome }).closest('[style*="border-radius: 16px"]')
const campoBusca = () => screen.getByPlaceholderText('Buscar produto, marca ou categoria…')

describe('CatalogPage', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('carregamento', () => {
    it('mostra "Carregando catalogo..." e depois a quantidade de itens da API', async () => {
      configurarServicos()
      render(<CatalogPage />)

      expect(screen.getByText('Carregando catálogo...')).toBeInTheDocument()
      expect(await screen.findByText('SmartMarket API Conectada · 3 itens encontrados')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Catálogo de Produtos' })).toBeInTheDocument()
      expect(screen.getByText('Exibindo', { exact: false })).toHaveTextContent('Exibindo 3 de 3 produtos')
    })

    it('mantem os dados de exemplo quando a API devolve listas vazias', async () => {
      await renderizar({ produtos: [], mercados: [] })

      expect(screen.getByText(`SmartMarket API Conectada · ${PRODUCTS.length} itens encontrados`)).toBeInTheDocument()
    })

    it('mantem os dados de exemplo quando uma chamada falha', async () => {
      produtoService.buscarCatalogoComPrecos.mockRejectedValue(new Error('offline'))
      mercadoService.listar.mockResolvedValue(MERCADOS)
      favoritoService.listarMercados.mockResolvedValue([])
      favoritoService.listarProdutos.mockResolvedValue([])
      render(<CatalogPage />)

      expect(await screen.findByText(`SmartMarket API Conectada · ${PRODUCTS.length} itens encontrados`)).toBeInTheDocument()
    })

    it('ignora favoritos que nao vieram como lista', async () => {
      configurarServicos()
      favoritoService.listarMercados.mockResolvedValue(null)
      favoritoService.listarProdutos.mockResolvedValue(null)
      render(<CatalogPage />)

      expect(await screen.findByText(/itens encontrados/)).toBeInTheDocument()
      expect(screen.getByText('Clique em uma rede para destacar seus preços prioritários.')).toBeInTheDocument()
    })
  })

  describe('cartao do produto', () => {
    it('mostra marca, nome, unidade e o melhor preco com o mercado', async () => {
      await renderizar()

      const cartao = within(cartaoDe('Arroz Branco'))
      expect(cartao.getByText('Tio João')).toBeInTheDocument()
      expect(cartao.getByText('5 kg')).toBeInTheDocument()
      expect(cartao.getByText('Melhor Preço')).toBeInTheDocument()
      expect(cartao.getAllByText('R$ 22.90')).toHaveLength(2)
      expect(cartao.getByText('R$ 24.50')).toBeInTheDocument()
    })

    it('mostra "—" nos mercados sem preco e omite o melhor preco quando nao ha nenhum', async () => {
      await renderizar()

      const semPreco = within(cartaoDe('Papel Higiênico'))
      expect(semPreco.queryByText('Melhor Preço')).not.toBeInTheDocument()
      expect(semPreco.getAllByText('—')).toHaveLength(2)

      const soFort = within(cartaoDe('Leite Integral'))
      expect(soFort.getAllByText('R$ 4.29')).toHaveLength(2)
      expect(soFort.getAllByText('—')).toHaveLength(1)
    })

    it('usa marca "Geral" e icone padrao quando faltam dados', async () => {
      await renderizar()

      const cartao = within(cartaoDe('Papel Higiênico'))
      expect(cartao.getByText('Geral')).toBeInTheDocument()
      expect(cartao.getByText('📦')).toBeInTheDocument()
    })

    it('encontra o preco pelo nome do mercado quando o id nao esta nos precos', async () => {
      await renderizar({
        mercados: [
          { id: 7, name: 'Fort Atacadista', color: '#000' },
          { id: 8, name: 'Carrefour Bairro', color: '#111' },
          { id: 9, name: 'Big Bompreço', color: '#222' },
        ],
        produtos: [{ id: 20, name: 'Cafe', brand: 'Pilão', category: 'cafe', unit: '500 g', image: '☕', prices: { fort: 15, carrefour: 16, big: 17 } }],
      })

      const cartao = within(cartaoDe('Cafe'))
      expect(cartao.getAllByText('R$ 15.00')).toHaveLength(2)
      expect(cartao.getByText('R$ 16.00')).toBeInTheDocument()
      expect(cartao.getByText('R$ 17.00')).toBeInTheDocument()
    })

    it('acentua o cartao ao passar o mouse e restaura ao sair', async () => {
      await renderizar()
      const cartao = cartaoDe('Arroz Branco')

      fireEvent.mouseEnter(cartao)
      expect(cartao.style.transform).toBe('translateY(-3px)')

      fireEvent.mouseLeave(cartao)
      expect(cartao.style.transform).toBe('none')
    })
  })

  describe('busca e filtros', () => {
    it('filtra por nome, sem diferenciar maiusculas', async () => {
      await renderizar()

      fireEvent.change(campoBusca(), { target: { value: 'ARROZ' } })

      expect(screen.getByText('Arroz Branco')).toBeInTheDocument()
      expect(screen.queryByText('Leite Integral')).not.toBeInTheDocument()
      expect(screen.getByText('Exibindo', { exact: false })).toHaveTextContent('Exibindo 1 de 3 produtos')
    })

    it('filtra por marca', async () => {
      await renderizar()

      fireEvent.change(campoBusca(), { target: { value: 'italac' } })

      expect(screen.getByText('Leite Integral')).toBeInTheDocument()
      expect(screen.queryByText('Arroz Branco')).not.toBeInTheDocument()
    })

    it('limpa a busca pelo botao ✕', async () => {
      await renderizar()
      fireEvent.change(campoBusca(), { target: { value: 'xyz' } })
      expect(screen.getByText('Exibindo', { exact: false })).toHaveTextContent('Exibindo 0 de 3 produtos')

      fireEvent.click(screen.getByRole('button', { name: '✕' }))

      expect(campoBusca()).toHaveValue('')
      expect(screen.getByText('Exibindo', { exact: false })).toHaveTextContent('Exibindo 3 de 3 produtos')
    })

    it('filtra por categoria e volta a mostrar tudo em "Todos"', async () => {
      await renderizar()

      fireEvent.click(screen.getByRole('button', { name: /Leites e Derivados/ }))
      expect(screen.getByText('Leite Integral')).toBeInTheDocument()
      expect(screen.queryByText('Arroz Branco')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Todos/ }))
      expect(screen.getByText('Arroz Branco')).toBeInTheDocument()
    })

    it('filtra por mercado, mostrando so produtos com preco naquele mercado', async () => {
      await renderizar()
      const seletor = screen.getByRole('combobox')

      fireEvent.change(seletor, { target: { value: '2' } })
      expect(screen.getByText('Arroz Branco')).toBeInTheDocument()
      expect(screen.queryByText('Leite Integral')).not.toBeInTheDocument()
      expect(screen.queryByText('Papel Higiênico')).not.toBeInTheDocument()

      fireEvent.change(seletor, { target: { value: '1' } })
      expect(screen.getByText('Leite Integral')).toBeInTheDocument()

      fireEvent.change(seletor, { target: { value: 'todos' } })
      expect(screen.getByText('Papel Higiênico')).toBeInTheDocument()
    })

    it('oferece uma opcao "Apenas ..." para cada mercado', async () => {
      await renderizar()

      expect(screen.getByRole('option', { name: 'Todos os mercados' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Apenas Fort Atacadista' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Apenas Carrefour' })).toBeInTheDocument()
    })
  })

  describe('mercados favoritos', () => {
    it('mostra a dica quando nao ha mercado favorito', async () => {
      await renderizar()

      expect(screen.getByText('Clique em uma rede para destacar seus preços prioritários.')).toBeInTheDocument()
    })

    it('favorita e desfavorita um mercado, informando o backend', async () => {
      await renderizar()

      fireEvent.click(screen.getByRole('button', { name: /Fort Atacadista/ }))
      expect(await screen.findByText('Mercados favoritos:')).toBeInTheDocument()
      expect(favoritoService.favoritarMercado).toHaveBeenCalledWith(1)
      expect(screen.queryByText('Clique em uma rede para destacar seus preços prioritários.')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Fort Atacadista/ }))
      expect(await screen.findByText('Clique em uma rede para destacar seus preços prioritários.')).toBeInTheDocument()
      expect(favoritoService.desfavoritarMercado).toHaveBeenCalledWith(1)
    })

    it('mantem o estado local mesmo se o backend falhar', async () => {
      await renderizar()
      favoritoService.favoritarMercado.mockRejectedValue(new Error('offline'))

      fireEvent.click(screen.getByRole('button', { name: /Carrefour/ }))

      expect(await screen.findByText('Mercados favoritos:')).toBeInTheDocument()
      expect(screen.queryByText('Clique em uma rede para destacar seus preços prioritários.')).not.toBeInTheDocument()
    })

    it('carrega favoritos do servidor em formatos diferentes', async () => {
      await renderizar({ favMercados: [{ mercadoId: 1 }, { id: 2 }] })

      expect(screen.queryByText('Clique em uma rede para destacar seus preços prioritários.')).not.toBeInTheDocument()
    })

    it('destaca o melhor preco do mercado favorito quando difere do melhor geral', async () => {
      await renderizar({ favMercados: [2] })

      const cartao = within(cartaoDe('Arroz Branco'))
      expect(cartao.getByText('⭐ Carrefour')).toBeInTheDocument()
      expect(cartao.getAllByText('R$ 24.50').length).toBeGreaterThanOrEqual(2)
    })

    it('nao repete o destaque quando o favorito ja e o melhor mercado', async () => {
      await renderizar({ favMercados: [1] })

      expect(within(cartaoDe('Arroz Branco')).queryByText(/⭐/)).not.toBeInTheDocument()
    })

    it('nao destaca favorito sem preco naquele produto', async () => {
      await renderizar({ favMercados: [2] })

      expect(within(cartaoDe('Leite Integral')).queryByText(/⭐/)).not.toBeInTheDocument()
    })
  })

  describe('produtos favoritos', () => {
    it('favorita e desfavorita um produto, informando o backend', async () => {
      await renderizar()
      const cartao = within(cartaoDe('Arroz Branco'))

      fireEvent.click(cartao.getByTitle('Favoritar produto'))
      expect(await cartao.findByTitle('Remover dos favoritos')).toBeInTheDocument()
      expect(favoritoService.favoritarProduto).toHaveBeenCalledWith(10)

      fireEvent.click(cartao.getByTitle('Remover dos favoritos'))
      expect(await cartao.findByTitle('Favoritar produto')).toBeInTheDocument()
      expect(favoritoService.desfavoritarProduto).toHaveBeenCalledWith(10)
    })

    it('mostra como favorito o produto que ja veio favoritado do servidor', async () => {
      await renderizar({ favProdutos: [{ produtoId: 11 }] })

      expect(within(cartaoDe('Leite Integral')).getByTitle('Remover dos favoritos')).toBeInTheDocument()
      expect(within(cartaoDe('Arroz Branco')).getByTitle('Favoritar produto')).toBeInTheDocument()
    })

    it('mantem o estado local mesmo se o backend falhar', async () => {
      await renderizar()
      favoritoService.favoritarProduto.mockRejectedValue(new Error('offline'))
      const cartao = within(cartaoDe('Arroz Branco'))

      fireEvent.click(cartao.getByTitle('Favoritar produto'))

      expect(await cartao.findByTitle('Remover dos favoritos')).toBeInTheDocument()
    })
  })

  describe('lista de compras', () => {
    it('adiciona o produto a lista, guarda na sessao e atualiza o contador', async () => {
      await renderizar()

      fireEvent.click(within(cartaoDe('Arroz Branco')).getByRole('button', { name: /Adicionar à lista/ }))

      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({ 10: 1 })
      expect(within(cartaoDe('Arroz Branco')).getByText('✓ Adicionado!')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Minha lista/ })).toHaveTextContent('1')
    })

    it('soma a quantidade quando o mesmo produto e adicionado de novo', async () => {
      await renderizar()
      const botao = () => within(cartaoDe('Arroz Branco')).getByRole('button', { name: /Adicionar|Adicionado/ })

      fireEvent.click(botao())
      fireEvent.click(botao())

      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({ 10: 2 })
      expect(screen.getByRole('link', { name: /Minha lista/ })).toHaveTextContent('2')
    })

    it('volta ao texto original do botao depois de 1,4 segundo', async () => {
      await renderizar()
      jest.useFakeTimers()

      fireEvent.click(within(cartaoDe('Arroz Branco')).getByRole('button', { name: /Adicionar à lista/ }))
      expect(screen.getByText('✓ Adicionado!')).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(1400)
      })
      expect(within(cartaoDe('Arroz Branco')).getByRole('button', { name: /Adicionar à lista/ })).toBeInTheDocument()
    })

    it('mostra o contador inicial a partir da lista guardada na sessao', async () => {
      sessionStorage.setItem('sm_list', JSON.stringify({ 10: 2, 11: 3 }))
      await renderizar()

      expect(screen.getByRole('link', { name: /Minha lista/ })).toHaveTextContent('5')
      expect(screen.getByRole('link', { name: /Minha lista/ })).toHaveAttribute('href', '/list')
    })

    it('trata lista corrompida na sessao como vazia e esconde o contador', async () => {
      sessionStorage.setItem('sm_list', '{nao-e-json')
      await renderizar()

      expect(screen.getByRole('link', { name: /Minha lista/ })).toHaveTextContent(/^Minha lista$/)
    })
  })
})
