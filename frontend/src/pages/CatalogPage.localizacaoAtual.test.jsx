import { act, fireEvent, render, screen, within } from '@testing-library/react'
import CatalogPage from './CatalogPage'
import { produtoService, mercadoService, favoritoService } from '../services'
import { useLocalizacao } from '../hooks/useLocalizacao'
import { reiniciarFiliaisDaSessao } from '../hooks/useLocalizacaoAtual'
import lojaService from '../services/lojaService'
import { carregarProdutos } from '../utils/carregarProdutos'

// Catálogo real (src/data.js) tem 32 MB; os testes usam a fixture pequena.
beforeAll(() => carregarProdutos(), 30000)
jest.mock('../data', () => require('../test/dataFixture'))
jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../data')))

jest.mock('../config/recursos', () => ({ LOJAS_PROXIMAS_ATIVO: true }))
jest.mock('../hooks/useLocalizacao', () => ({ useLocalizacao: jest.fn() }))
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { email: 'ana@exemplo.com' } }),
}))
jest.mock('../services/lojaService', () => ({ __esModule: true, default: { filiaisPublicas: jest.fn() } }))
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
// No Atum, o Carrefour (2) é o mais barato.
const ATUM = { id: 920, name: 'Atum Sólido', brand: 'Coqueiro', category: 'graos', unit: '170 g', image: '🐟', prices: { 1: 9.9, 2: 7.9 } }

const LOCALIZACAO = { cep: '90010000', cidade: 'Porto Alegre', uf: 'RS', resolvida: true }

// Lojas do CEP (/api/lojas/proximas): as distâncias aqui são as do CEP.
const lojaDoCep = (extra = {}) => ({
  mercadoId: 1,
  mercadoNome: 'Fort Atacadista',
  lojaId: 11,
  lojaNome: 'Fort Cachoeirinha',
  endereco: null,
  cidade: null,
  uf: null,
  latitude: null,
  longitude: null,
  distanciaKm: 2.5,
  padrao: false,
  preferida: false,
  ...extra,
})
const FORT_DO_CEP = lojaDoCep()
const CARREFOUR_DO_CEP = lojaDoCep({ mercadoId: 2, mercadoNome: 'Carrefour', lojaId: 21, lojaNome: 'Carrefour Centro', distanciaKm: 3.5 })

// Filiais públicas (/api/lojas/filiais).
const FORT_CACHOEIRINHA = { mercadoId: 1, mercadoNome: 'Fort Atacadista', lojaId: 11, lojaNome: 'Fort Cachoeirinha', latitude: -29.9511, longitude: -51.0944 }
const FORT_CAXIAS = { mercadoId: 1, mercadoNome: 'Fort Atacadista', lojaId: 12, lojaNome: 'Fort Caxias', latitude: -29.1681, longitude: -51.1794 }
const CARREFOUR_CENTRO = { mercadoId: 2, mercadoNome: 'Carrefour', lojaId: 21, lojaNome: 'Carrefour Centro', latitude: -30.03, longitude: -51.22 }

// Posição do usuário: centro de Porto Alegre. Fort Cachoeirinha fica a ~15,07 km e o Carrefour a ~0,55 km.
const POSICAO = { latitude: -30.0346, longitude: -51.2177 }
const SAO_PAULO = { latitude: -23.5505, longitude: -46.6333 }

const DICA_CEP = 'Distância em linha reta, calculada a partir do seu CEP'
const DICA_NAVEGADOR = 'Distância em linha reta, calculada a partir da sua localização'

function usarLocalizacao(extra = {}) {
  useLocalizacao.mockReturnValue({
    localizacao: LOCALIZACAO,
    lojas: [],
    carregando: false,
    erro: null,
    recarregar: jest.fn(),
    trocarCep: jest.fn().mockResolvedValue(LOCALIZACAO),
    excluir: jest.fn().mockResolvedValue(undefined),
    definirLojaPreferida: jest.fn(),
    ...extra,
  })
}

let getCurrentPosition
const posicaoOk = (coords) => (aoDar) => aoDar({ coords: { ...coords, accuracy: 15 } })
const posicaoComErro = (code) => (_aoDar, aoFalhar) => aoFalhar({ code })

const cartaoDe = (nome) => screen.getByRole('heading', { level: 3, name: nome }).closest('.group')
const BOTAO = 'Usar minha localização atual'

async function renderizar() {
  produtoService.buscarCatalogoComPrecos.mockResolvedValue([ATUM])
  mercadoService.listar.mockResolvedValue(MERCADOS)
  favoritoService.listarMercados.mockResolvedValue([])
  favoritoService.listarProdutos.mockResolvedValue([])
  render(<CatalogPage />)
  await screen.findByText(/produtos disponíveis/, undefined, { timeout: 4000 })
  fireEvent.click(screen.getByRole('button', { name: 'Grade' }))
}

const usarMinhaLocalizacao = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: BOTAO }))
  })
}

describe('CatalogPage com a localização atual do navegador', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    reiniciarFiliaisDaSessao()
    localStorage.clear()
    sessionStorage.clear()
    getCurrentPosition = jest.fn(posicaoOk(POSICAO))
    Object.defineProperty(global.navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
    lojaService.filiaisPublicas.mockResolvedValue([FORT_CACHOEIRINHA, FORT_CAXIAS, CARREFOUR_CENTRO])
  })

  afterEach(() => {
    delete global.navigator.geolocation
  })

  describe('o botão', () => {
    it('aparece para quem tem CEP', async () => {
      usarLocalizacao({ lojas: [FORT_DO_CEP, CARREFOUR_DO_CEP] })

      await renderizar()

      expect(screen.getByRole('button', { name: BOTAO })).toBeInTheDocument()
    })

    it('aparece para quem ainda não configurou CEP, ao lado de "Informar CEP"', async () => {
      usarLocalizacao({ localizacao: null, lojas: [] })

      await renderizar()

      expect(screen.getByRole('button', { name: 'Informar CEP' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: BOTAO })).toBeInTheDocument()
    })

    it('não aparece se o navegador não tem geolocalização', async () => {
      delete global.navigator.geolocation
      usarLocalizacao({ lojas: [FORT_DO_CEP, CARREFOUR_DO_CEP] })

      await renderizar()

      expect(screen.queryByRole('button', { name: BOTAO })).not.toBeInTheDocument()
    })

    it('antes do clique nada é pedido: nem a posição nem a lista de filiais', async () => {
      usarLocalizacao({ lojas: [FORT_DO_CEP, CARREFOUR_DO_CEP] })

      await renderizar()

      expect(getCurrentPosition).not.toHaveBeenCalled()
      expect(lojaService.filiaisPublicas).not.toHaveBeenCalled()
    })
  })

  describe('depois de usar a localização atual', () => {
    it('as distâncias passam a ser as da posição, com a dica "a partir da sua localização"', async () => {
      usarLocalizacao({ lojas: [FORT_DO_CEP, CARREFOUR_DO_CEP] })
      await renderizar()
      // Antes: a loja de referência (Carrefour, mais barato) está a 3,5 km do CEP.
      expect(within(cartaoDe('Atum Sólido')).getByText('≈ 3,5 km')).toHaveAttribute('title', DICA_CEP)

      await usarMinhaLocalizacao()

      const cartao = within(cartaoDe('Atum Sólido'))
      expect(cartao.getByText('≈ 0,6 km')).toHaveAttribute('title', DICA_NAVEGADOR)
      expect(cartao.queryByText('≈ 3,5 km')).not.toBeInTheDocument()
      expect(screen.queryByTitle(DICA_CEP)).not.toBeInTheDocument()
    })

    it('a rede mais perto e o seletor passam a falar da localização atual', async () => {
      usarLocalizacao({ lojas: [FORT_DO_CEP, CARREFOUR_DO_CEP] })
      await renderizar()

      await usarMinhaLocalizacao()

      expect(screen.getByText('Lojas perto da sua localização atual')).toBeInTheDocument()
      expect(screen.getByText(/A rede mais perto é Carrefour/)).toHaveTextContent(/\(≈ 0,6 km\)/)
      expect(screen.getByRole('button', { name: 'Voltar ao CEP' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: BOTAO })).not.toBeInTheDocument()
    })

    it('funciona também sem CEP: o catálogo ganha as lojas e o botão de voltar vira "Parar de usar..."', async () => {
      usarLocalizacao({ localizacao: null, lojas: [] })
      await renderizar()

      await usarMinhaLocalizacao()

      expect(within(cartaoDe('Atum Sólido')).getByText('≈ 0,6 km')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Parar de usar minha localização' })).toBeInTheDocument()
    })

    it('a loja preferida continua sendo a loja da rede, com a distância medida da posição', async () => {
      const preferida = lojaDoCep({
        lojaId: 12,
        lojaNome: 'Fort Caxias',
        preferida: true,
        latitude: -29.1681,
        longitude: -51.1794,
        distanciaKm: 90,
      })
      usarLocalizacao({ lojas: [preferida, CARREFOUR_DO_CEP] })
      await renderizar()

      await usarMinhaLocalizacao()

      // Fort Caxias (preferida) a ~96,4 km da posição; a Fort Cachoeirinha, mais perto, não a substitui.
      expect(screen.getAllByTitle(/Fort Caxias • ≈ 96,4 km/).length).toBeGreaterThan(0)
      expect(screen.queryByTitle(/Fort Cachoeirinha/)).not.toBeInTheDocument()
    })

    it('voltar ao CEP restaura as distâncias do CEP; clicar de novo não refaz a chamada a /lojas/filiais', async () => {
      usarLocalizacao({ lojas: [FORT_DO_CEP, CARREFOUR_DO_CEP] })
      await renderizar()
      await usarMinhaLocalizacao()

      fireEvent.click(screen.getByRole('button', { name: 'Voltar ao CEP' }))

      expect(within(cartaoDe('Atum Sólido')).getByText('≈ 3,5 km')).toHaveAttribute('title', DICA_CEP)
      await usarMinhaLocalizacao()
      expect(within(cartaoDe('Atum Sólido')).getByText('≈ 0,6 km')).toBeInTheDocument()
      expect(lojaService.filiaisPublicas).toHaveBeenCalledTimes(1)
    })
  })

  describe('quando não dá para usar a localização, o catálogo segue com o CEP', () => {
    const semMudanca = () => {
      expect(within(cartaoDe('Atum Sólido')).getByText('≈ 3,5 km')).toHaveAttribute('title', DICA_CEP)
      expect(screen.queryByTitle(DICA_NAVEGADOR)).not.toBeInTheDocument()
    }

    it('permissão negada: mensagem em role=status, botão continua, distâncias do CEP', async () => {
      getCurrentPosition.mockImplementation(posicaoComErro(1))
      usarLocalizacao({ lojas: [FORT_DO_CEP, CARREFOUR_DO_CEP] })
      await renderizar()

      await usarMinhaLocalizacao()

      expect(screen.getByRole('status')).toHaveTextContent('Sem permissão de localização. Usando seu CEP.')
      expect(screen.getByRole('button', { name: BOTAO })).toBeInTheDocument()
      semMudanca()
    })

    it('tempo esgotado: mensagem curta e distâncias do CEP', async () => {
      getCurrentPosition.mockImplementation(posicaoComErro(3))
      usarLocalizacao({ lojas: [FORT_DO_CEP, CARREFOUR_DO_CEP] })
      await renderizar()

      await usarMinhaLocalizacao()

      expect(screen.getByRole('status')).toHaveTextContent('Não deu para obter sua localização. Usando seu CEP.')
      semMudanca()
    })

    it('fora do RS: mostra o aviso e NÃO calcula nenhuma distância a partir da posição', async () => {
      getCurrentPosition.mockImplementation(posicaoOk(SAO_PAULO))
      usarLocalizacao({ lojas: [FORT_DO_CEP, CARREFOUR_DO_CEP] })
      await renderizar()

      await usarMinhaLocalizacao()

      expect(screen.getByRole('status')).toHaveTextContent('Você parece estar fora do RS. Usando seu CEP.')
      expect(lojaService.filiaisPublicas).not.toHaveBeenCalled()
      semMudanca()
      expect(screen.queryByText('Lojas perto da sua localização atual')).not.toBeInTheDocument()
    })

    it('429 nas filiais: a mensagem continua visível depois que o botão some, e o CEP segue valendo', async () => {
      lojaService.filiaisPublicas.mockRejectedValue(Object.assign(new Error('429'), { response: { status: 429 } }))
      usarLocalizacao({ lojas: [FORT_DO_CEP, CARREFOUR_DO_CEP] })
      await renderizar()

      await usarMinhaLocalizacao()

      expect(screen.queryByRole('button', { name: BOTAO })).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('Não foi possível usar sua localização agora. Usando seu CEP.')
      expect(lojaService.filiaisPublicas).toHaveBeenCalledTimes(1)
      semMudanca()
    })
  })
})
