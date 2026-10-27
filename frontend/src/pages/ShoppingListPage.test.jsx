import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShoppingListPage from './ShoppingListPage'
import { produtoService, mercadoService } from '../services'
import { PRODUCTS } from '../data'

jest.mock('../services', () => ({
  produtoService: { buscarCatalogoComPrecos: jest.fn() },
  mercadoService: { listar: jest.fn() },
}))

const MERCADO_A = { id: 1, name: 'Mercado A', color: '#111' }
const MERCADO_B = { id: 2, name: 'Mercado B', color: '#222' }

const ARROZ = { id: 10, name: 'Arroz', brand: 'Tio João', category: 'graos', unit: '5 kg', image: '🌾', prices: { 1: 10, 2: 12 } }
const FEIJAO = { id: 11, name: 'Feijão', brand: 'Camil', category: 'graos', unit: '1 kg', image: '🫘', prices: { 1: 5 } }

function guardarLista(lista) {
  sessionStorage.setItem('sm_list', JSON.stringify(lista))
}

async function renderizar({ produtos = [ARROZ, FEIJAO], mercados = [MERCADO_A, MERCADO_B], lista } = {}) {
  if (lista) guardarLista(lista)
  produtoService.buscarCatalogoComPrecos.mockResolvedValue(produtos)
  mercadoService.listar.mockResolvedValue(mercados)
  await act(async () => {
    render(
      <MemoryRouter>
        <ShoppingListPage />
      </MemoryRouter>
    )
  })
}

const comparar = () => fireEvent.click(screen.getByRole('button', { name: /Comparar Cestas/ }))
const linhaDoItem = (nome) => screen.getByText(nome).closest('div[style*="display: flex"]')
const botaoMais = (nome) => within(linhaDoItem(nome)).getByRole('button', { name: '+' })
const botaoMenos = (nome) => within(linhaDoItem(nome)).getByRole('button', { name: '−' })
const resumo = () => screen.getByText(/produtos ·/)

describe('ShoppingListPage', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    sessionStorage.clear()
  })

  describe('cabecalho e lista vazia', () => {
    it('abre sem erro e mostra o titulo', async () => {
      await renderizar()

      expect(screen.getByRole('heading', { level: 1, name: 'Minha Lista de Compras' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '+ Adicionar produtos' })).toHaveAttribute('href', '/catalog')
    })

    it('mostra o estado vazio quando nao ha itens', async () => {
      await renderizar()

      expect(screen.getByRole('heading', { name: 'Sua lista está vazia' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ir ao Catálogo' })).toHaveAttribute('href', '/catalog')
      expect(screen.getByText('0 produtos · 0 unidades')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Limpar lista' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Comparar Cestas/ })).not.toBeInTheDocument()
    })

    it('trata lista corrompida na sessao como vazia', async () => {
      sessionStorage.setItem('sm_list', '{nao-e-json')
      await renderizar()

      expect(screen.getByRole('heading', { name: 'Sua lista está vazia' })).toBeInTheDocument()
    })
  })

  describe('itens da lista', () => {
    it('mostra os itens com marca, unidade e quantidade, e o resumo', async () => {
      await renderizar({ lista: { 10: 2, 11: 1 } })

      expect(screen.getByText('Itens da Lista (2)')).toBeInTheDocument()
      expect(screen.getByText('Tio João · 5 kg')).toBeInTheDocument()
      expect(screen.getByText('Camil · 1 kg')).toBeInTheDocument()
      expect(resumo()).toHaveTextContent('2 produtos · 3 unidades')
    })

    it('usa icone padrao quando a imagem do produto e longa demais', async () => {
      await renderizar({ produtos: [{ ...ARROZ, image: 'https://exemplo.com/arroz.png' }], lista: { 10: 1 } })

      expect(screen.getByText('📦')).toBeInTheDocument()
    })

    it('ignora itens da lista que nao existem mais no catalogo', async () => {
      await renderizar({ lista: { 10: 1, 999: 4 } })

      expect(screen.getByText('Itens da Lista (1)')).toBeInTheDocument()
      // Comportamento atual: o total de unidades ainda conta o item removido do catalogo.
      expect(resumo()).toHaveTextContent('1 produtos · 5 unidades')
    })

    it('compara ids numericos e textuais do catalogo e da sessao', async () => {
      await renderizar({ produtos: [{ ...ARROZ, id: 'p10' }], lista: { p10: 3 } })

      expect(screen.getByText('Itens da Lista (1)')).toBeInTheDocument()
    })

    it('aumenta e diminui a quantidade e grava a lista na sessao', async () => {
      await renderizar({ lista: { 10: 2 } })

      fireEvent.click(botaoMais('Arroz'))
      expect(resumo()).toHaveTextContent('1 produtos · 3 unidades')
      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({ 10: 3 })

      fireEvent.click(botaoMenos('Arroz'))
      expect(resumo()).toHaveTextContent('1 produtos · 2 unidades')
      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({ 10: 2 })
    })

    it('remove o item quando a quantidade chega a zero', async () => {
      await renderizar({ lista: { 10: 1, 11: 2 } })

      fireEvent.click(botaoMenos('Arroz'))

      expect(screen.queryByText('Tio João · 5 kg')).not.toBeInTheDocument()
      expect(screen.getByText('Itens da Lista (1)')).toBeInTheDocument()
      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({ 11: 2 })
    })

    it('volta ao estado vazio ao remover o ultimo item', async () => {
      await renderizar({ lista: { 10: 1 } })

      fireEvent.click(botaoMenos('Arroz'))

      expect(screen.getByRole('heading', { name: 'Sua lista está vazia' })).toBeInTheDocument()
    })

    it('limpa a lista inteira', async () => {
      await renderizar({ lista: { 10: 1, 11: 2 } })

      fireEvent.click(screen.getByRole('button', { name: 'Limpar lista' }))

      expect(screen.getByRole('heading', { name: 'Sua lista está vazia' })).toBeInTheDocument()
      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({})
    })
  })

  describe('carregamento de dados', () => {
    it('usa os produtos e mercados de exemplo quando a API devolve listas vazias', async () => {
      await renderizar({ produtos: [], mercados: [], lista: { p1: 2 } })

      expect(screen.getByText('Itens da Lista (1)')).toBeInTheDocument()
      expect(screen.getByText(PRODUCTS[0].name)).toBeInTheDocument()
    })

    it('usa os dados de exemplo quando a API falha', async () => {
      produtoService.buscarCatalogoComPrecos.mockRejectedValue(new Error('offline'))
      mercadoService.listar.mockRejectedValue(new Error('offline'))
      guardarLista({ p1: 1 })
      await act(async () => {
        render(<MemoryRouter><ShoppingListPage /></MemoryRouter>)
      })

      expect(screen.getByText(PRODUCTS[0].name)).toBeInTheDocument()
    })

    it('usa os produtos da API quando disponiveis', async () => {
      await renderizar({ lista: { 10: 1 } })

      expect(screen.getByText('Arroz')).toBeInTheDocument()
    })
  })

  describe('comparacao de cestas', () => {
    it('destaca o mercado mais barato e a economia em relacao ao mais caro', async () => {
      // A: Arroz 2x10 + Feijão 1x5 = 25 (completo). B: Arroz 2x12 = 24, sem Feijão.
      await renderizar({
        produtos: [ARROZ, { ...FEIJAO, prices: { 1: 5, 2: 6 } }],
        lista: { 10: 2, 11: 1 },
      })

      comparar()

      expect(screen.getByText(/Menor Preço Total/)).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Mercado A' })).toBeInTheDocument()
      expect(screen.getByText('R$ 25.00', { selector: 'p' })).toBeInTheDocument()
      expect(screen.getByText(/Economia de até/)).toHaveTextContent('Economia de até R$ 5.00 em relação ao mercado mais caro!')
      expect(screen.getByText('Comparação por Mercado')).toBeInTheDocument()
    })

    it('lista o total de cada mercado e quantos itens estao indisponiveis', async () => {
      await renderizar({ lista: { 10: 2, 11: 1 } })

      comparar()

      const painel = screen.getByText('Comparação por Mercado').parentElement
      expect(within(painel).getByText('Mercado A')).toBeInTheDocument()
      expect(within(painel).getByText('Mercado B')).toBeInTheDocument()
      expect(within(painel).getByText('R$ 25.00')).toBeInTheDocument()
      expect(within(painel).getByText('R$ 24.00')).toBeInTheDocument()
      expect(within(painel).getByText('1 indisponível')).toBeInTheDocument()
    })

    it('ordena os mercados apenas pelo menor total, mesmo quando falta algum item (comportamento atual)', async () => {
      // O Mercado B nao tem Feijão e mesmo assim aparece como o mais barato.
      // Divergente de CENARIOS-DE-TESTE.md 4.2 e do backend, que nao deixam um mercado incompleto vencer.
      await renderizar({ lista: { 10: 2, 11: 1 } })

      comparar()

      expect(screen.getByRole('heading', { name: 'Mercado B' })).toBeInTheDocument()
      expect(screen.getByText(/Economia de até/)).toHaveTextContent('R$ 1.00')
    })

    it('nao mostra economia quando ha um unico mercado', async () => {
      await renderizar({ mercados: [MERCADO_A], lista: { 10: 1 } })

      comparar()

      expect(screen.getByRole('heading', { name: 'Mercado A' })).toBeInTheDocument()
      expect(screen.queryByText(/Economia de até/)).not.toBeInTheDocument()
    })

    it('nao mostra economia quando os totais sao iguais', async () => {
      await renderizar({
        produtos: [{ ...ARROZ, prices: { 1: 10, 2: 10 } }],
        lista: { 10: 1 },
      })

      comparar()

      expect(screen.queryByText(/Economia de até/)).not.toBeInTheDocument()
    })

    it('encontra o preco pelo nome do mercado quando o id nao esta nos precos', async () => {
      await renderizar({
        produtos: [{ ...ARROZ, prices: { fort: 3, carrefour: 4, big: 5 } }],
        mercados: [
          { id: 7, name: 'Fort Atacadista' },
          { id: 8, name: 'Carrefour Bairro' },
          { id: 9, name: 'Big Bompreço' },
        ],
        lista: { 10: 2 },
      })

      comparar()

      const painel = screen.getByText('Comparação por Mercado').parentElement
      expect(within(painel).getByText('R$ 6.00')).toBeInTheDocument()
      expect(within(painel).getByText('R$ 8.00')).toBeInTheDocument()
      expect(within(painel).getByText('R$ 10.00')).toBeInTheDocument()
    })

    it('esconde o resultado quando a lista muda depois de comparar', async () => {
      await renderizar({ lista: { 10: 1 } })
      comparar()
      expect(screen.getByText(/Menor Preço Total/)).toBeInTheDocument()

      fireEvent.click(botaoMais('Arroz'))

      expect(screen.queryByText(/Menor Preço Total/)).not.toBeInTheDocument()
    })

    it('esconde o resultado ao limpar a lista', async () => {
      await renderizar({ lista: { 10: 1 } })
      comparar()

      fireEvent.click(screen.getByRole('button', { name: 'Limpar lista' }))

      expect(screen.queryByText(/Menor Preço Total/)).not.toBeInTheDocument()
    })

    it('ignora mercados sem preco para nenhum item da lista sem quebrar', async () => {
      await renderizar({ produtos: [{ ...ARROZ, prices: { 1: 10 } }], lista: { 10: 1 } })

      comparar()

      const painel = screen.getByText('Comparação por Mercado').parentElement
      expect(within(painel).getByText('1 indisponível')).toBeInTheDocument()
    })
  })
})
