import { act, fireEvent, render, screen, within } from '@testing-library/react'
import CatalogPage from './CatalogPage'
import { produtoService, mercadoService, favoritoService } from '../services'
import { useLocalizacao } from '../hooks/useLocalizacao'
import { carregarProdutos } from '../utils/carregarProdutos'

// Catálogo real (src/data.js) tem 32 MB; os testes usam a fixture pequena.
beforeAll(() => carregarProdutos(), 30000)
jest.mock('../data', () => require('../test/dataFixture'))
jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../data')))

// Flag ligada só neste arquivo; o hook de dados é trocado por um mock controlável.
jest.mock('../config/recursos', () => ({ LOJAS_PROXIMAS_ATIVO: true }))
jest.mock('../hooks/useLocalizacao', () => ({ useLocalizacao: jest.fn() }))
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

// Redes e produto vindos da "API" (ids numéricos). No Atum, o Carrefour (2) é o mais barato.
const MERCADOS = [
  { id: 1, name: 'Fort Atacadista', color: '#E63312' },
  { id: 2, name: 'Carrefour', color: '#1A63B9' },
]
const ATUM = {
  id: 920,
  name: 'Atum Sólido',
  brand: 'Coqueiro',
  category: 'graos',
  unit: '170 g',
  image: '🐟',
  prices: { 1: 9.9, 2: 7.9 },
}

const LOCALIZACAO = { cep: '90010000', cidade: 'Porto Alegre', uf: 'RS', resolvida: true }
const lojaDaApi = (extra = {}) => ({
  mercadoId: 1,
  mercadoNome: 'Fort Atacadista',
  lojaId: 11,
  lojaNome: 'Fort Cachoeirinha',
  endereco: 'Av. Flores da Cunha, 100',
  cidade: 'Cachoeirinha',
  uf: 'RS',
  distanciaKm: 2.5,
  padrao: false,
  preferida: false,
  ...extra,
})
const FORT_CACHOEIRINHA = lojaDaApi()
const CARREFOUR_CENTRO = lojaDaApi({
  mercadoId: 2,
  mercadoNome: 'Carrefour',
  lojaId: 21,
  lojaNome: 'Carrefour Centro',
  endereco: 'Rua dos Andradas, 200',
  cidade: 'Porto Alegre',
  distanciaKm: 3.5,
})

// O que o hook useLocalizacao devolve à página.
function usarLocalizacao(extra = {}) {
  const retorno = {
    localizacao: LOCALIZACAO,
    lojas: [],
    carregando: false,
    erro: null,
    recarregar: jest.fn(),
    trocarCep: jest.fn().mockResolvedValue(LOCALIZACAO),
    excluir: jest.fn().mockResolvedValue(undefined),
    definirLojaPreferida: jest.fn(),
    ...extra,
  }
  useLocalizacao.mockReturnValue(retorno)
  return retorno
}

const esperarCarregamento = () => screen.findByText(/produtos disponíveis/, undefined, { timeout: 4000 })
const cartaoDe = (nome) => screen.getByRole('heading', { level: 3, name: nome }).closest('.group')

// `grade: true` troca a visão padrão (prateleiras) pela grade de cartões completos.
async function renderizar({ grade = true } = {}) {
  produtoService.buscarCatalogoComPrecos.mockResolvedValue([ATUM])
  mercadoService.listar.mockResolvedValue(MERCADOS)
  favoritoService.listarMercados.mockResolvedValue([])
  favoritoService.listarProdutos.mockResolvedValue([])
  render(<CatalogPage />)
  await esperarCarregamento()
  if (grade) fireEvent.click(screen.getByRole('button', { name: 'Grade' }))
}

describe('CatalogPage com lojas próximas (flag ligada)', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('o cartão mostra a loja da rede mais barata do produto, e não a de outra rede', async () => {
    usarLocalizacao({ lojas: [FORT_CACHOEIRINHA, CARREFOUR_CENTRO] })

    await renderizar()

    const cartao = cartaoDe('Atum Sólido')
    expect(within(cartao).getByText('Carrefour Centro')).toBeInTheDocument()
    expect(within(cartao).queryByText('Fort Cachoeirinha')).not.toBeInTheDocument()
  })

  describe.each([
    ['grade', true],
    ['prateleiras', false],
  ])('indicação da loja no cartão (%s): só nome e distância, sem sugerir preço por loja', (_visao, grade) => {
    it('mostra o nome e a distância; o title não traz endereço nem cidade', async () => {
      usarLocalizacao({ lojas: [CARREFOUR_CENTRO] })
      await renderizar({ grade })

      const indicacao = within(cartaoDe('Atum Sólido')).getByTitle('Carrefour Centro • 3.5 km')

      expect(indicacao).toHaveTextContent('Carrefour Centro')
      expect(indicacao).toHaveTextContent('3.5 km')
      expect(indicacao.getAttribute('title')).not.toMatch(/Andradas|Porto Alegre|Rua/)
    })

    it('loja sem distância calculada: só o nome, sem "• km" nem undefined', async () => {
      const semDistancia = lojaDaApi({ ...CARREFOUR_CENTRO, distanciaKm: null })
      usarLocalizacao({ lojas: [semDistancia] })
      await renderizar({ grade })

      const indicacao = within(cartaoDe('Atum Sólido')).getByTitle('Carrefour Centro')

      expect(indicacao).toHaveTextContent(/^📍\s*Carrefour Centro$/)
      expect(indicacao.textContent).not.toMatch(/undefined|null|km/)
    })
  })

  it('loja padrão sem distância: o cartão não mostra loja', async () => {
    const padraoSemDistancia = lojaDaApi({
      mercadoId: 2,
      mercadoNome: 'Carrefour',
      lojaNome: 'Carrefour Padrão',
      padrao: true,
      distanciaKm: null,
    })
    usarLocalizacao({ lojas: [padraoSemDistancia] })

    await renderizar()

    const cartao = cartaoDe('Atum Sólido')
    expect(within(cartao).queryByText('Carrefour Padrão')).not.toBeInTheDocument()
    expect(within(cartao).queryByText('📍')).not.toBeInTheDocument()
  })

  it('raio 5 com a loja a 9 km: o cartão não mostra loja e os preços continuam os mesmos', async () => {
    localStorage.setItem('sm_raio_lojas_km', '5')
    const longe = lojaDaApi({ ...CARREFOUR_CENTRO, distanciaKm: 9 })
    usarLocalizacao({ lojas: [longe] })

    await renderizar()

    const cartao = cartaoDe('Atum Sólido')
    expect(within(cartao).queryByText('Carrefour Centro')).not.toBeInTheDocument()
    expect(cartao.textContent).toMatch(/7[,.]90/)
    expect(cartao.textContent).toMatch(/2[,.]00/)
  })

  it('hook com erro e listas vazias: o catálogo lista os produtos normalmente', async () => {
    usarLocalizacao({ localizacao: null, lojas: [], erro: 'Erro 500 do servidor.' })

    await renderizar()

    expect(cartaoDe('Atum Sólido')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Arroz Branco Tipo 1' })).toBeInTheDocument()
    expect(
      screen.getByText('Não foi possível carregar sua localização agora. O catálogo continua funcionando.')
    ).toBeInTheDocument()
  })

  it('mudar o raio no seletor grava a chave nova (e só ela) e esconde a loja distante do cartão', async () => {
    const longe = lojaDaApi({ ...CARREFOUR_CENTRO, distanciaKm: 9 })
    usarLocalizacao({ lojas: [longe] })
    await renderizar()
    expect(within(cartaoDe('Atum Sólido')).getByText('Carrefour Centro')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Raio'), { target: { value: '5' } })

    expect(localStorage.getItem('sm_raio_lojas_km')).toBe('5')
    expect(localStorage.getItem('sm_user_cep')).toBeNull()
    expect(localStorage.getItem('sm_user_raio_km')).toBeNull()
    expect(screen.getByLabelText('Raio')).toHaveValue('5')
    expect(within(cartaoDe('Atum Sólido')).queryByText('Carrefour Centro')).not.toBeInTheDocument()
  })

  it('trocar o CEP pelo seletor chama trocarCep do hook com "90010-000" e não guarda CEP no navegador', async () => {
    const { trocarCep } = usarLocalizacao()
    await renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Alterar CEP' }))
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '90010000' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    })

    expect(trocarCep).toHaveBeenCalledTimes(1)
    expect(trocarCep).toHaveBeenCalledWith('90010-000')
    const valoresGuardados = Object.keys(localStorage).map((chave) => `${chave}=${localStorage.getItem(chave)}`)
    expect(valoresGuardados.join('\n')).not.toMatch(/90010/)
    expect(localStorage.getItem('sm_user_cep')).toBeNull()
  })

  it('remover a localização pelo seletor chama excluir do hook', async () => {
    const { excluir } = usarLocalizacao()
    await renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Remover minha localização' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remover' }))
    })

    expect(excluir).toHaveBeenCalledTimes(1)
  })

  it('hook carregando: os produtos já aparecem, o catálogo não espera a localização', async () => {
    usarLocalizacao({ localizacao: null, lojas: [], carregando: true })

    await renderizar()

    expect(cartaoDe('Atum Sólido')).toBeInTheDocument()
    expect(screen.getByText('Carregando sua localização…')).toBeInTheDocument()
  })
})
