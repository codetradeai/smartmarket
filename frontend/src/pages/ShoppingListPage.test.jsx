import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShoppingListPage from './ShoppingListPage'
import { AuthContext } from '../contexts/AuthContext'
import { produtoService, mercadoService } from '../services'
import { PRODUCTS } from '../data'

// Catálogo real (src/data.js) tem 32 MB; os testes usam a fixture pequena.
jest.mock('../data', () => require('../test/dataFixture'))

jest.mock('../services', () => ({
  produtoService: { buscarCatalogoComPrecos: jest.fn() },
  mercadoService: { listar: jest.fn() },
}))

const MERCADO_A = { id: 1, name: 'Mercado A', color: '#111' }
const MERCADO_B = { id: 2, name: 'Mercado B', color: '#222' }

// A página só aproveita da API produtos que já existem no catálogo local (data.js): o merge
// sobrescreve os campos dos ids conhecidos. Por isso os produtos de teste usam ids da fixture
// (p1, p3) com nome e preços vindos da "API".
const ARROZ = { id: 'p1', name: 'Arroz', brand: 'Tio João', category: 'graos', unit: '5 kg', image: '🌾', prices: { 1: 10, 2: 12 } }
const FEIJAO = { id: 'p3', name: 'Feijão', brand: 'Camil', category: 'graos', unit: '1 kg', image: '🫘', prices: { 1: 5 } }

// Cesta que a página usa quando não há lista guardada (INITIAL_DEMO_LIST em ShoppingListPage.jsx).
const CESTA_SUGERIDA = { p1: 2, p3: 2, p9: 6, p14: 3, p17: 2 }

function guardarLista(lista) {
  sessionStorage.setItem('sm_list', JSON.stringify(lista))
}

// Sessão de um usuário logado. Sem `auth`, a página é renderizada como visitante (fora do provider).
const USUARIO_LOGADO = { isAuthenticated: true, isAdmin: false, user: { nome: 'Ana', papel: 'USER' } }

async function montar(auth = null) {
  const pagina = (
    <MemoryRouter>
      <ShoppingListPage />
    </MemoryRouter>
  )
  let resultado
  await act(async () => {
    resultado = render(auth ? <AuthContext.Provider value={auth}>{pagina}</AuthContext.Provider> : pagina)
  })
  return resultado
}

async function renderizar({ produtos = [ARROZ, FEIJAO], mercados = [MERCADO_A, MERCADO_B], lista, auth } = {}) {
  if (lista) guardarLista(lista)
  produtoService.buscarCatalogoComPrecos.mockResolvedValue(produtos)
  mercadoService.listar.mockResolvedValue(mercados)
  return montar(auth)
}

const listaNaSessao = () => JSON.parse(sessionStorage.getItem('sm_list'))
const linhaDoItem = (nome) => screen.getByRole('heading', { level: 3, name: nome }).closest('div.group')
const botaoNaLinha = (nome, rotulo) => within(linhaDoItem(nome)).getByRole('button', { name: rotulo })
const cartaoVencedor = () => screen.getByText('🏆 Onde sua compra sai mais barata').closest('div.relative')
const linhasDoGrafico = () => screen.queryAllByTitle('Clique para ver o preço de cada produto neste supermercado')
const linhaDoMercado = (nome) => linhasDoGrafico().find((linha) => within(linha).queryAllByText(nome).length > 0)
const totalDoMercado = (nome) => within(linhaDoMercado(nome)).getByText(/^R\$ \d+\.\d{2}$/, { selector: 'span' })

describe('ShoppingListPage', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    sessionStorage.clear()
  })

  describe('lista guardada na sessao', () => {
    it.each([
      ['nao ha lista guardada', null],
      ['a lista guardada esta corrompida', '{nao-e-json'],
    ])('visitante abre com a cesta sugerida quando %s', async (_caso, conteudo) => {
      if (conteudo) sessionStorage.setItem('sm_list', conteudo)
      await renderizar()

      expect(screen.getByRole('heading', { name: 'Itens da Lista (5)' })).toBeInTheDocument()
      expect(listaNaSessao()).toEqual(CESTA_SUGERIDA)
    })

    it('a lista limpa continua vazia ao reabrir a pagina', async () => {
      const { unmount } = await renderizar({ lista: { p1: 1, p3: 2 } })
      fireEvent.click(screen.getByRole('button', { name: 'Limpar lista' }))
      expect(listaNaSessao()).toEqual({})
      unmount()

      await renderizar()

      expect(screen.getByRole('heading', { name: 'Sua lista está vazia' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /Itens da Lista/ })).not.toBeInTheDocument()
      expect(listaNaSessao()).toEqual({})
    })

    it('usuario logado nao recebe a cesta de demonstracao (sem lista nem com lista corrompida)', async () => {
      const { unmount } = await renderizar({ auth: USUARIO_LOGADO })
      expect(screen.getByRole('heading', { name: 'Sua lista está vazia' })).toBeInTheDocument()
      expect(listaNaSessao()).toEqual({})
      unmount()

      sessionStorage.setItem('sm_list', '{nao-e-json')
      await renderizar({ auth: USUARIO_LOGADO })
      expect(screen.getByRole('heading', { name: 'Sua lista está vazia' })).toBeInTheDocument()
      expect(listaNaSessao()).toEqual({})
    })

    it('ignora itens da lista que nao existem mais no catalogo', async () => {
      await renderizar({ lista: { p1: 1, p999: 4 } })

      expect(screen.getByRole('heading', { name: 'Itens da Lista (1)' })).toBeInTheDocument()
      expect(screen.getByText('1 item diferente')).toBeInTheDocument()
    })

    it('usa os dados de exemplo quando a API falha', async () => {
      produtoService.buscarCatalogoComPrecos.mockRejectedValue(new Error('offline'))
      mercadoService.listar.mockRejectedValue(new Error('offline'))
      guardarLista({ p1: 1 })
      await montar()

      expect(screen.getByRole('heading', { level: 3, name: PRODUCTS[0].name })).toBeInTheDocument()
    })
  })

  describe('itens da lista', () => {
    it('mostra marca, unidade, quantidade e subtotal pelo menor preco de cada item', async () => {
      await renderizar({ lista: { p1: 2, p3: 1 } })

      expect(screen.getByRole('heading', { name: 'Itens da Lista (2)' })).toBeInTheDocument()
      expect(screen.getByText('2 itens diferentes')).toBeInTheDocument()

      const arroz = within(linhaDoItem('Arroz'))
      expect(arroz.getByText('Tio João · 5 kg')).toBeInTheDocument()
      expect(arroz.getByText('Subtotal (2 uns)')).toBeInTheDocument()
      expect(arroz.getByText('R$ 20.00')).toBeInTheDocument()

      const feijao = within(linhaDoItem('Feijão'))
      expect(feijao.getByText('Camil · 1 kg')).toBeInTheDocument()
      expect(feijao.getByText('Subtotal (1 un)')).toBeInTheDocument()
    })

    it('aumenta e diminui a quantidade e grava a lista na sessao', async () => {
      await renderizar({ lista: { p1: 2 } })

      fireEvent.click(botaoNaLinha('Arroz', 'Aumentar quantidade'))
      expect(within(linhaDoItem('Arroz')).getByText('Subtotal (3 uns)')).toBeInTheDocument()
      expect(listaNaSessao()).toEqual({ p1: 3 })

      fireEvent.click(botaoNaLinha('Arroz', 'Diminuir quantidade'))
      expect(within(linhaDoItem('Arroz')).getByText('Subtotal (2 uns)')).toBeInTheDocument()
      expect(listaNaSessao()).toEqual({ p1: 2 })
    })

    it('remove o item quando a quantidade chega a zero ou pelo botao de remover', async () => {
      await renderizar({ lista: { p1: 1, p3: 2 } })

      fireEvent.click(botaoNaLinha('Arroz', 'Diminuir quantidade'))
      expect(screen.queryByRole('heading', { level: 3, name: 'Arroz' })).not.toBeInTheDocument()
      expect(listaNaSessao()).toEqual({ p3: 2 })

      fireEvent.click(botaoNaLinha('Feijão', 'Remover item da lista'))
      expect(screen.getByRole('heading', { name: 'Sua lista está vazia' })).toBeInTheDocument()
      expect(listaNaSessao()).toEqual({})
    })

    it('limpa a lista inteira e esconde a comparacao', async () => {
      await renderizar({ lista: { p1: 1, p3: 2 } })
      expect(cartaoVencedor()).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Limpar lista' }))

      expect(screen.getByRole('heading', { name: 'Sua lista está vazia' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ir ao Catálogo' })).toHaveAttribute('href', '/catalog')
      expect(screen.queryByText('🏆 Onde sua compra sai mais barata')).not.toBeInTheDocument()
      expect(listaNaSessao()).toEqual({})
    })
  })

  describe('comparacao de cestas', () => {
    it('destaca o mercado mais barato, o total e a economia em relacao ao mais caro', async () => {
      // A: Arroz 2x10 + Feijão 1x5 = 25. B: Arroz 2x12 + Feijão 1x6 = 30.
      await renderizar({
        produtos: [ARROZ, { ...FEIJAO, prices: { 1: 5, 2: 6 } }],
        lista: { p1: 2, p3: 1 },
      })

      const vencedor = within(cartaoVencedor())
      expect(vencedor.getByRole('heading', { name: 'Mercado A' })).toBeInTheDocument()
      expect(vencedor.getByText('2 de 2 produtos disponíveis')).toBeInTheDocument()
      expect(vencedor.getByText('R$ 25.00')).toBeInTheDocument()
      expect(vencedor.getByText('Você economiza no bolso')).toBeInTheDocument()
      expect(vencedor.getByText('até R$ 5.00')).toBeInTheDocument()
    })

    it('lista o total de cada mercado e quantos itens estao sem cotacao', async () => {
      // A: Arroz 2x10 + Feijão 1x5 = 25. B: Arroz 2x12 = 24, sem Feijão.
      await renderizar({ lista: { p1: 2, p3: 1 } })

      expect(linhasDoGrafico()).toHaveLength(2)
      expect(totalDoMercado('Mercado A')).toHaveTextContent('R$ 25.00')
      expect(totalDoMercado('Mercado B')).toHaveTextContent('R$ 24.00')
      expect(within(linhaDoMercado('Mercado B')).getByText('⚠️ 1 produto(s) sem cotação nesta rede')).toBeInTheDocument()
      expect(within(linhaDoMercado('Mercado A')).queryByText(/sem cotação/)).not.toBeInTheDocument()
    })

    it.each([
      ['ha um unico mercado', { mercados: [MERCADO_A] }],
      ['os totais sao iguais', { produtos: [{ ...ARROZ, prices: { 1: 10, 2: 10 } }] }],
    ])('nao mostra economia quando %s', async (_caso, opcoes) => {
      await renderizar({ lista: { p1: 1 }, ...opcoes })

      expect(within(cartaoVencedor()).getByRole('heading', { name: 'Mercado A' })).toBeInTheDocument()
      expect(screen.queryByText('Você economiza no bolso')).not.toBeInTheDocument()
    })

    it('encontra o preco pelo nome do mercado quando o id nao esta nos precos', async () => {
      await renderizar({
        produtos: [{ ...ARROZ, prices: { fort: 3, carrefour: 4, big: 5 } }],
        mercados: [
          { id: 7, name: 'Fort Atacadista' },
          { id: 8, name: 'Carrefour Bairro' },
          { id: 9, name: 'Big Bompreço' },
        ],
        lista: { p1: 2 },
      })

      expect(totalDoMercado('Fort Atacadista')).toHaveTextContent('R$ 6.00')
      expect(totalDoMercado('Carrefour Bairro')).toHaveTextContent('R$ 8.00')
      expect(totalDoMercado('Big Bompreço')).toHaveTextContent('R$ 10.00')
    })

    it('deixa de fora o mercado sem preco para nenhum item da lista', async () => {
      await renderizar({ produtos: [{ ...ARROZ, prices: { 1: 10 } }], lista: { p1: 1 } })

      expect(linhasDoGrafico()).toHaveLength(1)
      expect(linhaDoMercado('Mercado B')).toBeUndefined()
      expect(screen.queryByText('Você economiza no bolso')).not.toBeInTheDocument()
    })

    it('recalcula o resultado quando a quantidade muda', async () => {
      await renderizar({ lista: { p1: 1 } })
      expect(within(cartaoVencedor()).getByText('R$ 10.00')).toBeInTheDocument()
      expect(within(cartaoVencedor()).getByText('até R$ 2.00')).toBeInTheDocument()

      fireEvent.click(botaoNaLinha('Arroz', 'Aumentar quantidade'))

      expect(within(cartaoVencedor()).getByText('R$ 20.00')).toBeInTheDocument()
      expect(within(cartaoVencedor()).getByText('até R$ 4.00')).toBeInTheDocument()
    })
  })
})
