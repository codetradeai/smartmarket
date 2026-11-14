import { act, fireEvent, render, screen } from '@testing-library/react'
import CatalogPage from './CatalogPage'
import { produtoService, mercadoService, favoritoService } from '../services'
import { useLocalizacao } from '../hooks/useLocalizacao'
import { reiniciarFiliaisDaSessao } from '../hooks/useLocalizacaoAtual'
import lojaService from '../services/lojaService'
import { carregarProdutos } from '../utils/carregarProdutos'

// Privacidade da localização atual: a posição do navegador fica só em memória (estado do React). Estas
// coordenadas, de propósito fáceis de reconhecer, não podem aparecer em storage, URL, log, mensagem de
// erro, no HTML da página nem em nenhuma chamada de serviço, em nenhum dos fluxos (sucesso, negada, tempo
// esgotado, fora do RS, falha do endpoint de filiais).

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
const ATUM = { id: 920, name: 'Atum Sólido', brand: 'Coqueiro', category: 'graos', unit: '170 g', image: '🐟', prices: { 1: 9.9, 2: 7.9 } }
const LOCALIZACAO = { cep: '90010000', cidade: 'Porto Alegre', uf: 'RS', resolvida: true }
const FILIAIS = [
  { mercadoId: 1, mercadoNome: 'Fort Atacadista', lojaId: 11, lojaNome: 'Fort Cachoeirinha', latitude: -29.9511, longitude: -51.0944 },
  { mercadoId: 2, mercadoNome: 'Carrefour', lojaId: 21, lojaNome: 'Carrefour Centro', latitude: -30.03, longitude: -51.22 },
]

// Posições fáceis de reconhecer: uma dentro do RS e uma fora (São Paulo).
const DENTRO_DO_RS = { latitude: -30.123456, longitude: -51.654321 }
const FORA_DO_RS = { latitude: -23.987654, longitude: -46.123456 }

// Todas as formas em que uma coordenada poderia vazar: texto cru, com vírgula, arredondada e só os decimais.
function formasDe(numero) {
  const a = Math.abs(numero)
  const cru = String(a)
  const decimais = cru.split('.')[1]
  return [cru, cru.replace('.', ','), a.toFixed(4), a.toFixed(4).replace('.', ','), a.toFixed(3), a.toFixed(3).replace('.', ','), decimais]
}
const AGULHAS = [DENTRO_DO_RS, FORA_DO_RS].flatMap((p) => [...formasDe(p.latitude), ...formasDe(p.longitude)])

const comoTexto = (valor) =>
  JSON.stringify(valor, (_chave, v) => (v instanceof Error ? `${v.name}: ${v.message}` : v)) ?? String(valor)
const vazou = (texto) => AGULHAS.find((agulha) => texto.includes(agulha))

// Espiões nos canais por onde algo poderia sair do navegador.
let espioes
let erros
function armarEspioes() {
  erros = []
  const aoErrar = (evento) => erros.push(comoTexto(evento.message ?? evento.reason))
  window.addEventListener('error', aoErrar)
  window.addEventListener('unhandledrejection', aoErrar)
  espioes = {
    setItem: jest.spyOn(Storage.prototype, 'setItem'),
    pushState: jest.spyOn(window.history, 'pushState'),
    replaceState: jest.spyOn(window.history, 'replaceState'),
    xhrOpen: jest.spyOn(XMLHttpRequest.prototype, 'open'),
    xhrSend: jest.spyOn(XMLHttpRequest.prototype, 'send'),
    console: ['log', 'info', 'warn', 'error', 'debug'].map((m) => jest.spyOn(console, m).mockImplementation(() => {})),
    removerOuvintes: () => {
      window.removeEventListener('error', aoErrar)
      window.removeEventListener('unhandledrejection', aoErrar)
    },
  }
}

// Procura as coordenadas em cada canal e devolve os canais que vazaram.
function canaisComVazamento() {
  const canais = {
    localStorage: comoTexto({ ...localStorage }),
    sessionStorage: comoTexto({ ...sessionStorage }),
    gravacoesNoStorage: comoTexto(espioes.setItem.mock.calls),
    url: `${window.location.href} ${comoTexto(window.history.state)} ${document.referrer}`,
    historico: comoTexto([...espioes.pushState.mock.calls, ...espioes.replaceState.mock.calls]),
    console: comoTexto(espioes.console.flatMap((e) => e.mock.calls)),
    redeXhr: comoTexto([...espioes.xhrOpen.mock.calls, ...espioes.xhrSend.mock.calls]),
    errosDaJanela: comoTexto(erros),
    htmlDaPagina: document.documentElement.outerHTML,
    titulo: document.title,
    chamadasDeServico: comoTexto(
      [
        lojaService.filiaisPublicas,
        produtoService.buscarCatalogoComPrecos,
        mercadoService.listar,
        ...Object.values(favoritoService),
        useLocalizacao,
      ].flatMap((fn) => fn.mock?.calls ?? []),
    ),
  }
  return Object.entries(canais)
    .filter(([, texto]) => vazou(texto))
    .map(([canal, texto]) => `${canal} (contém "${vazou(texto)}")`)
}

let getCurrentPosition
const posicaoOk = (coords) => (aoDar) => aoDar({ coords: { ...coords, accuracy: 12, altitude: null, heading: null, speed: null } })
const posicaoComErro = (code) => (_aoDar, aoFalhar) => aoFalhar({ code, message: 'falha ao ler a posição' })
const erroHttp = (status) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status } })

async function renderizar() {
  produtoService.buscarCatalogoComPrecos.mockResolvedValue([ATUM])
  mercadoService.listar.mockResolvedValue(MERCADOS)
  favoritoService.listarMercados.mockResolvedValue([])
  favoritoService.listarProdutos.mockResolvedValue([])
  render(<CatalogPage />)
  await screen.findByText(/produtos disponíveis/, undefined, { timeout: 4000 })
  fireEvent.click(screen.getByRole('button', { name: 'Grade' }))
}

const clicarEmUsarLocalizacao = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Usar minha localização atual' }))
  })
}

describe('privacidade da localização atual do navegador', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    reiniciarFiliaisDaSessao()
    localStorage.clear()
    sessionStorage.clear()
    armarEspioes()
    useLocalizacao.mockReturnValue({
      localizacao: LOCALIZACAO,
      lojas: [],
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
      trocarCep: jest.fn(),
      excluir: jest.fn(),
      definirLojaPreferida: jest.fn(),
    })
    getCurrentPosition = jest.fn(posicaoOk(DENTRO_DO_RS))
    Object.defineProperty(global.navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
    lojaService.filiaisPublicas.mockResolvedValue(FILIAIS)
  })

  afterEach(() => {
    espioes.removerOuvintes()
    jest.restoreAllMocks()
    delete global.navigator.geolocation
  })

  it('controle: o detector enxerga uma coordenada plantada em cada canal (o teste não é vazio)', async () => {
    await renderizar()
    expect(canaisComVazamento()).toEqual([])

    localStorage.setItem('x', 'lat -30.123456')
    sessionStorage.setItem('y', '51,654321')
    console.log('posição', DENTRO_DO_RS)
    window.history.replaceState({ lat: -30.123456 }, '')
    window.dispatchEvent(new ErrorEvent('error', { message: 'falha em -23.987654' }))

    const achados = canaisComVazamento().join(' | ')
    expect(achados).toMatch(/^localStorage/)
    expect(achados).toMatch(/sessionStorage/)
    expect(achados).toMatch(/gravacoesNoStorage/)
    expect(achados).toMatch(/console/)
    expect(achados).toMatch(/url/)
    expect(achados).toMatch(/historico/)
    expect(achados).toMatch(/errosDaJanela/)
    window.history.replaceState(null, '')
  })

  it('antes do clique nenhuma coordenada existe em lugar nenhum', async () => {
    await renderizar()

    expect(canaisComVazamento()).toEqual([])
  })

  describe.each([
    ['sucesso (dentro do RS)', {}],
    ['permissão negada', { posicao: posicaoComErro(1) }],
    ['posição indisponível', { posicao: posicaoComErro(2) }],
    ['tempo esgotado ao ler a posição', { posicao: posicaoComErro(3) }],
    ['fora do RS', { posicao: posicaoOk(FORA_DO_RS) }],
    ['filiais: 429', { filiais: erroHttp(429) }],
    ['filiais: 500', { filiais: erroHttp(500) }],
    ['filiais: erro de rede', { filiais: new Error('Network Error') }],
    ['filiais: tempo esgotado', { filiais: Object.assign(new Error('timeout of 15000ms exceeded'), { code: 'ECONNABORTED' }) }],
  ])('%s', (_nome, { posicao, filiais }) => {
    it('nenhuma coordenada vai para storage, URL, histórico, console, rede, erros nem para o HTML', async () => {
      if (posicao) getCurrentPosition.mockImplementation(posicao)
      if (filiais) lojaService.filiaisPublicas.mockRejectedValue(filiais)
      await renderizar()

      await clicarEmUsarLocalizacao()

      expect(canaisComVazamento()).toEqual([])
    })
  })

  it('depois de usar e voltar ao CEP, nada da posição sobra em lugar nenhum', async () => {
    await renderizar()
    await clicarEmUsarLocalizacao()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao CEP' }))

    expect(canaisComVazamento()).toEqual([])
  })

  it('a chamada à lista de filiais não leva parâmetro nenhum (nem a posição nem o CEP)', async () => {
    await renderizar()

    await clicarEmUsarLocalizacao()

    expect(lojaService.filiaisPublicas).toHaveBeenCalledTimes(1)
    expect(lojaService.filiaisPublicas.mock.calls[0]).toEqual([])
  })

  it('nenhuma chave de storage fala de posição, latitude, longitude ou coordenada', async () => {
    await renderizar()
    await clicarEmUsarLocalizacao()

    const chaves = [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
    expect(chaves.filter((c) => /lat|lon|posi|geo|coord/i.test(c))).toEqual([])
  })
})
