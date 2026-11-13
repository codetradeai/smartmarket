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
// Tooltip da loja: nome e distância, mais o aviso de que o preço é da rede (no Atum, Carrefour é a mais barata).
const tituloDaReferencia = (nomeEDistancia) =>
  `${nomeEDistancia}. O preço vale para toda a rede Carrefour; a loja é só referência.`

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

  it('a loja de referência do cartão é a da rede mais barata; a outra rede só aparece na linha "Mais perto"', async () => {
    usarLocalizacao({ lojas: [FORT_CACHOEIRINHA, CARREFOUR_CENTRO] })

    await renderizar()

    const cartao = cartaoDe('Atum Sólido')
    // Referência: Carrefour (a mais barata, R$ 7,90), com o prefixo do cartão completo.
    const referencia = within(cartao).getByTitle(tituloDaReferencia('Carrefour Centro • 3,5 km'))
    expect(referencia).toHaveTextContent(/^📍\s*Loja de referência:\s*Carrefour Centro\s*•\s*3,5 km$/)
    // Fort (a mais perto, 2,5 km) só aparece na linha "Mais perto", com o preço da rede dela.
    const maisPerto = within(cartao).getByTitle(
      'Fort Cachoeirinha • 2,5 km. O preço vale para toda a rede Fort Atacadista; a loja é só referência.'
    )
    expect(maisPerto).toHaveTextContent(/^📍\s*Mais perto:\s*Fort Cachoeirinha\s*•\s*2,5 km\s*•\s*R\$ 9\.90$/)
    expect(within(cartao).getAllByText('Fort Cachoeirinha')).toHaveLength(1)
  })

  describe.each([
    ['grade', true],
    ['prateleiras', false],
  ])('indicação da loja no cartão (%s): só nome e distância, sem sugerir preço por loja', (_visao, grade) => {
    it('mostra o nome e a distância; o title não traz endereço nem cidade', async () => {
      usarLocalizacao({ lojas: [CARREFOUR_CENTRO] })
      await renderizar({ grade })

      const indicacao = within(cartaoDe('Atum Sólido')).getByTitle(tituloDaReferencia('Carrefour Centro • 3,5 km'))

      expect(indicacao).toHaveTextContent('Carrefour Centro')
      expect(indicacao).toHaveTextContent('3,5 km')
      expect(indicacao.getAttribute('title')).not.toMatch(/Andradas|Porto Alegre|Rua/)
    })

    it('o tooltip diz que o preço vale para a rede toda; só o cartão completo tem o prefixo "Loja de referência"', async () => {
      usarLocalizacao({ lojas: [CARREFOUR_CENTRO] })
      await renderizar({ grade })

      const cartao = cartaoDe('Atum Sólido')

      expect(
        within(cartao).getByTitle(/O preço vale para toda a rede Carrefour; a loja é só referência\.$/)
      ).toBeInTheDocument()
      if (grade) {
        expect(within(cartao).getByText('Loja de referência:')).toBeInTheDocument()
      } else {
        expect(within(cartao).queryByText(/Loja de referência/)).not.toBeInTheDocument()
      }
    })

    it.each([
      [2.5, '2,5 km'],
      [12, '12,0 km'],
      [0.8, '0,8 km'],
      [3.46, '3,5 km'],
    ])('a distância %p aparece em formato brasileiro: %s, sem ponto decimal', async (distanciaKm, esperado) => {
      usarLocalizacao({ lojas: [lojaDaApi({ ...CARREFOUR_CENTRO, distanciaKm })] })
      await renderizar({ grade })

      const indicacao = within(cartaoDe('Atum Sólido')).getByTitle(tituloDaReferencia(`Carrefour Centro • ${esperado}`))

      expect(indicacao).toHaveTextContent(esperado)
      expect(indicacao.textContent).not.toMatch(/\d\.\d/)
    })

    it('loja sem distância calculada: só o nome, sem "• km" nem undefined', async () => {
      const semDistancia = lojaDaApi({ ...CARREFOUR_CENTRO, distanciaKm: null })
      usarLocalizacao({ lojas: [semDistancia] })
      await renderizar({ grade })

      const indicacao = within(cartaoDe('Atum Sólido')).getByTitle(tituloDaReferencia('Carrefour Centro'))

      // O cartão completo leva o prefixo "Loja de referência:"; o compacto só o nome.
      const prefixo = grade ? 'Loja de referência:\\s*' : ''
      expect(indicacao).toHaveTextContent(new RegExp(`^📍\\s*${prefixo}Carrefour Centro$`))
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

// Fort Atacadista (id 1) tem o Atum a R$ 9,90 e Carrefour (id 2), a R$ 7,90: Carrefour é a mais barata.
const FORT_COM_COORDENADAS = { ...FORT_CACHOEIRINHA, latitude: -29.9511, longitude: -51.0944 }
const CARREFOUR_COM_COORDENADAS = { ...CARREFOUR_CENTRO, latitude: -30.0346, longitude: -51.2177 }
const LINK_FORT = 'https://www.google.com/maps/dir/?api=1&destination=-29.9511,-51.0944'
const LINK_CARREFOUR = 'https://www.google.com/maps/dir/?api=1&destination=-30.0346,-51.2177'
// A caixa da rede na fita de redes: o pai do botão "Filtrar por ...".
const redeNaFita = (nome) => screen.getByRole('button', { name: `Filtrar por ${nome}` }).parentElement

describe('CatalogPage: rede mais perto e "Como chegar"', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('destaque da rede mais perto', () => {
    it('a rede com a menor distância leva o selo "Mais perto" na fita de redes, e só ela', async () => {
      usarLocalizacao({ lojas: [FORT_CACHOEIRINHA, CARREFOUR_CENTRO] })

      await renderizar()

      expect(within(redeNaFita('Fort Atacadista')).getByText('Mais perto')).toBeInTheDocument()
      expect(within(redeNaFita('Carrefour')).queryByText('Mais perto')).not.toBeInTheDocument()
      expect(screen.getAllByText('Mais perto')).toHaveLength(1)
    })

    it('o seletor de CEP nomeia a rede mais perto, com a distância', async () => {
      usarLocalizacao({ lojas: [FORT_CACHOEIRINHA, CARREFOUR_CENTRO] })

      await renderizar()

      expect(screen.getByText('A rede mais perto é Fort Atacadista (2,5 km).')).toBeInTheDocument()
    })

    it('o destaque acompanha o raio: com a Fort fora do raio, a mais perto passa a ser a Carrefour', async () => {
      localStorage.setItem('sm_raio_lojas_km', '5')
      const fortLonge = lojaDaApi({ ...FORT_CACHOEIRINHA, distanciaKm: 9 })
      usarLocalizacao({ lojas: [fortLonge, CARREFOUR_CENTRO] })

      await renderizar()

      expect(within(redeNaFita('Carrefour')).getByText('Mais perto')).toBeInTheDocument()
      expect(screen.getAllByText('Mais perto')).toHaveLength(1)
      expect(screen.getByText('A rede mais perto é Carrefour (3,5 km).')).toBeInTheDocument()
    })

    it('nenhuma loja com distância: sem selo, sem frase e sem linha "Mais perto" nos cartões', async () => {
      const fortSemDistancia = lojaDaApi({ ...FORT_CACHOEIRINHA, distanciaKm: null })
      const carrefourSemDistancia = lojaDaApi({ ...CARREFOUR_CENTRO, distanciaKm: null })
      usarLocalizacao({ lojas: [fortSemDistancia, carrefourSemDistancia] })

      await renderizar()

      expect(screen.queryByText('Mais perto')).not.toBeInTheDocument()
      expect(screen.queryByText(/A rede mais perto é/)).not.toBeInTheDocument()
      expect(within(cartaoDe('Atum Sólido')).queryByText('Mais perto:')).not.toBeInTheDocument()
    })

    it('empate na menor distância: não destaca nenhuma rede', async () => {
      const fortA3 = lojaDaApi({ ...FORT_CACHOEIRINHA, distanciaKm: 3 })
      const carrefourA3 = lojaDaApi({ ...CARREFOUR_CENTRO, distanciaKm: 3 })
      usarLocalizacao({ lojas: [fortA3, carrefourA3] })

      await renderizar()

      expect(screen.queryByText('Mais perto')).not.toBeInTheDocument()
      expect(screen.queryByText(/A rede mais perto é/)).not.toBeInTheDocument()
    })

    it('sem lojas (sem CEP ou sem resposta) não há destaque', async () => {
      usarLocalizacao({ localizacao: null, lojas: [] })

      await renderizar()

      expect(screen.queryByText('Mais perto')).not.toBeInTheDocument()
      expect(screen.queryByText(/A rede mais perto é/)).not.toBeInTheDocument()
    })

    describe.each([
      ['grade', true],
      ['prateleiras', false],
    ])('linha "Mais perto" no cartão (%s)', (_visao, grade) => {
      it('quando a mais perto NÃO é a mais barata, mostra a loja, a distância e o preço da rede dela', async () => {
        usarLocalizacao({ lojas: [FORT_CACHOEIRINHA, CARREFOUR_CENTRO] })
        await renderizar({ grade })

        const linha = within(cartaoDe('Atum Sólido')).getByTitle(
          'Fort Cachoeirinha • 2,5 km. O preço vale para toda a rede Fort Atacadista; a loja é só referência.'
        )

        expect(linha).toHaveTextContent(/^📍\s*Mais perto:\s*Fort Cachoeirinha\s*•\s*2,5 km\s*•\s*R\$ 9\.90$/)
      })

      it('quando a mais perto É a mais barata, não repete: só a loja de referência', async () => {
        const fortLonge = lojaDaApi({ ...FORT_CACHOEIRINHA, distanciaKm: 5 })
        const carrefourPerto = lojaDaApi({ ...CARREFOUR_CENTRO, distanciaKm: 2 })
        usarLocalizacao({ lojas: [fortLonge, carrefourPerto] })
        await renderizar({ grade })

        const cartao = cartaoDe('Atum Sólido')

        expect(within(cartao).queryByText('Mais perto:')).not.toBeInTheDocument()
        expect(within(cartao).getByText('Carrefour Centro')).toBeInTheDocument()
        expect(within(cartao).queryByText('Fort Cachoeirinha')).not.toBeInTheDocument()
        // mas a rede mais perto continua destacada na fita
        expect(within(redeNaFita('Carrefour')).getByText('Mais perto')).toBeInTheDocument()
      })
    })
  })

  describe('"Como chegar"', () => {
    // O jsdom não navega: o preventDefault na captura evita o aviso "Not implemented: navigation"
    // sem impedir que o clique suba pela árvore (que é o que os testes observam).
    const impedirNavegacao = (evento) => evento.preventDefault()
    beforeEach(() => document.addEventListener('click', impedirNavegacao, true))
    afterEach(() => document.removeEventListener('click', impedirNavegacao, true))

    describe.each([
      ['grade', true],
      ['prateleiras', false],
    ])('no cartão (%s)', (_visao, grade) => {
      it('com coordenadas, cada loja do cartão tem o seu link do Google Maps', async () => {
        usarLocalizacao({ lojas: [FORT_COM_COORDENADAS, CARREFOUR_COM_COORDENADAS] })
        await renderizar({ grade })

        const cartao = cartaoDe('Atum Sólido')

        const doCarrefour = within(cartao).getByRole('link', {
          name: 'Como chegar a Carrefour Centro (abre o mapa em outra aba)',
        })
        const doFort = within(cartao).getByRole('link', {
          name: 'Como chegar a Fort Cachoeirinha (abre o mapa em outra aba)',
        })
        expect(doCarrefour).toHaveAttribute('href', LINK_CARREFOUR)
        expect(doFort).toHaveAttribute('href', LINK_FORT)
        for (const link of [doCarrefour, doFort]) {
          expect(link).toHaveAttribute('target', '_blank')
          expect(link.getAttribute('rel').split(/\s+/).sort()).toEqual(['noopener', 'noreferrer'])
          expect(link).toHaveAttribute('referrerpolicy', 'no-referrer')
        }
      })

      it('sem coordenadas (null) não há link, mas a loja e a distância continuam aparecendo', async () => {
        usarLocalizacao({ lojas: [FORT_CACHOEIRINHA, CARREFOUR_CENTRO] })
        await renderizar({ grade })

        const cartao = cartaoDe('Atum Sólido')

        expect(within(cartao).queryByRole('link')).not.toBeInTheDocument()
        expect(within(cartao).queryByText('Como chegar')).not.toBeInTheDocument()
        expect(within(cartao).getByText('Carrefour Centro')).toBeInTheDocument()
        expect(within(cartao).getByText('• 3,5 km')).toBeInTheDocument()
      })

      it('com coordenadas só numa das lojas, só ela tem link', async () => {
        usarLocalizacao({ lojas: [FORT_CACHOEIRINHA, CARREFOUR_COM_COORDENADAS] })
        await renderizar({ grade })

        const links = within(cartaoDe('Atum Sólido')).getAllByRole('link')

        expect(links).toHaveLength(1)
        expect(links[0]).toHaveAttribute('href', LINK_CARREFOUR)
      })

      it('com meia coordenada, não há link', async () => {
        usarLocalizacao({ lojas: [{ ...CARREFOUR_CENTRO, latitude: -30.0346, longitude: null }] })
        await renderizar({ grade })

        expect(within(cartaoDe('Atum Sólido')).queryByRole('link')).not.toBeInTheDocument()
      })

      it('clicar no link NÃO abre o detalhe do produto', async () => {
        usarLocalizacao({ lojas: [CARREFOUR_COM_COORDENADAS] })
        await renderizar({ grade })

        fireEvent.click(within(cartaoDe('Atum Sólido')).getByRole('link', { name: /Como chegar a Carrefour Centro/ }))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      it('clicar no resto do cartão continua abrindo o detalhe (controle do teste anterior)', async () => {
        usarLocalizacao({ lojas: [CARREFOUR_COM_COORDENADAS] })
        await renderizar({ grade })

        fireEvent.click(within(cartaoDe('Atum Sólido')).getByRole('button', { name: 'Atum Sólido' }))

        expect(screen.getByRole('dialog', { name: 'Atum Sólido' })).toBeInTheDocument()
      })
    })

    it('o link não leva nada do usuário: nem o CEP, nem a cidade dele, nem a origem', async () => {
      usarLocalizacao({ lojas: [FORT_COM_COORDENADAS, CARREFOUR_COM_COORDENADAS] })
      await renderizar()

      const hrefs = within(cartaoDe('Atum Sólido'))
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))

      expect(hrefs.join(' ')).not.toMatch(/90010|Porto|origin/i)
      expect(hrefs.every((href) => /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(href))).toBe(true)
    })
  })
})
