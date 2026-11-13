import { fireEvent, render, screen } from '@testing-library/react'
import CatalogPage from './CatalogPage'
import { produtoService, mercadoService, favoritoService } from '../services'
import { carregarProdutos } from '../utils/carregarProdutos'

beforeAll(() => carregarProdutos(), 30000)

// Catálogo pequeno: cada item tem preço de uma rede só. p1+p2 são o mesmo produto (confirmado),
// p3+p4 só "provável", p5 não tem equivalente.
jest.mock('../data', () => ({
  CATEGORIES: [{ id: 'todos', label: 'Todos', icon: '🏪' }, { id: 'leites', label: 'Leites', icon: '🥛' }],
  MARKETS: [
    { id: 'fort', name: 'Fort Atacadista', color: '#F5651B' },
    { id: 'asun', name: 'Asun Supermercados', color: '#00863F' },
    { id: 'rissul', name: 'Supermercados Rissul', color: '#E31C24' },
    { id: 'zaffari', name: 'Zaffari / Bourbon', color: '#7A1526' },
  ],
  PRODUCTS: [
    { id: 'p1', name: 'Iogurte Natural Fort 160g', brand: 'Nestlé', category: 'leites', unit: '160g', image: '🥛', prices: { fort: 3.5 } },
    { id: 'p2', name: 'Iogurte Natural Asun 160g', brand: 'Nestlé', category: 'leites', unit: '160g', image: '🥛', prices: { asun: 3.9 } },
    { id: 'p3', name: 'Creme de Leite Rissul 200g', brand: 'Piracanjuba', category: 'leites', unit: '200g', image: '🥛', prices: { rissul: 3 } },
    { id: 'p4', name: 'Creme de Leite Zaffari 200g', brand: 'Piracanjuba', category: 'leites', unit: '200g', image: '🥛', prices: { zaffari: 3.2 } },
    { id: 'p5', name: 'Leite Condensado Fort 395g', brand: 'Moça', category: 'leites', unit: '395g', image: '🥛', prices: { fort: 6 } },
  ],
}))
jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../data')))
jest.mock('../data/equivalentes.json', () => ({
  versao: 'teste',
  grupos: [
    { id: 'g1', confianca: 'confirmado', camada: 'T2', itens: ['p1', 'p2'] },
    { id: 'g2', confianca: 'provavel', camada: 'T4', itens: ['p3', 'p4'] },
  ],
}))
// O catálogo usa useLocalizacao (que lê useAuth); aqui não há AuthProvider e a flag de lojas próximas está desligada.
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { email: 'ana@exemplo.com' } }),
}))
jest.mock('../services/lojaService', () => ({
  __esModule: true,
  default: {
    obterLocalizacao: jest.fn(),
    lojasProximas: jest.fn(),
    trocarCep: jest.fn(),
    excluirLocalizacao: jest.fn(),
    definirLojaPreferida: jest.fn(),
  },
}))
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

async function renderizar({ grade }) {
  produtoService.buscarCatalogoComPrecos.mockResolvedValue([])
  mercadoService.listar.mockResolvedValue([])
  favoritoService.listarMercados.mockResolvedValue([])
  favoritoService.listarProdutos.mockResolvedValue([])
  render(<CatalogPage />)
  await screen.findByText(/produtos disponíveis/, undefined, { timeout: 4000 })
  if (grade) fireEvent.click(screen.getByRole('button', { name: 'Grade' }))
}

const cartaoDe = (nome) => screen.getByRole('heading', { level: 3, name: nome }).closest('.group')

describe.each([
  ['grade', { grade: true }],
  ['prateleira', { grade: false }],
])('CatalogPage: "também em" no cartão (%s)', (_nome, opcoes) => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('mostra discretamente as outras redes quando há equivalente confirmado', async () => {
    await renderizar(opcoes)

    expect(cartaoDe('Iogurte Natural Fort 160g')).toHaveTextContent('também em Asun')
    expect(cartaoDe('Iogurte Natural Asun 160g')).toHaveTextContent('também em Fort')
  })

  it('não mostra nada para equivalente só provável nem para item sem equivalente', async () => {
    await renderizar(opcoes)

    expect(cartaoDe('Creme de Leite Rissul 200g')).not.toHaveTextContent(/também em/)
    expect(cartaoDe('Creme de Leite Zaffari 200g')).not.toHaveTextContent(/também em/)
    expect(cartaoDe('Leite Condensado Fort 395g')).not.toHaveTextContent(/também em/)
  })
})

describe('CatalogPage: subtítulo sem inflar redes', () => {
  it('conta as redes com anúncios (4 no catálogo de teste), não um "8" fixo', async () => {
    await renderizar({ grade: false })

    expect(screen.getByText(/produtos disponíveis/)).toHaveTextContent('4 redes com produtos · 5 produtos disponíveis')
  })
})
