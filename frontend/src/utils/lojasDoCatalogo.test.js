import { MARKETS } from '../catalogoResumo'
import { filiaisParaCartoes, redeMaisPerto } from './lojasDoCatalogo'

const lojaDaApi = (extra = {}) => ({
  mercadoId: 1,
  mercadoNome: 'Fort Atacadista',
  lojaId: 11,
  lojaNome: 'Fort Atacadista Cachoeirinha',
  endereco: 'Av. Flores da Cunha, 1000',
  cidade: 'Cachoeirinha',
  uf: 'RS',
  distanciaKm: 3.2,
  padrao: false,
  preferida: false,
  ...extra,
})

describe('filiaisParaCartoes', () => {
  it('a loja com distância entra na rede certa, com os campos que os cartões leem', () => {
    const resultado = filiaisParaCartoes([lojaDaApi({ preferida: true })], MARKETS, 'todos')

    expect(resultado).toEqual({
      fort: {
        nomeFilial: 'Fort Atacadista Cachoeirinha',
        endereco: 'Av. Flores da Cunha, 1000',
        cidade: 'Cachoeirinha',
        uf: 'RS',
        latitude: null,
        longitude: null,
        distanciaKm: 3.2,
        lojaId: 11,
        padrao: false,
        preferida: true,
      },
    })
  })

  describe('loja sem distância', () => {
    it('a loja padrão sem distância fica fora do cartão', () => {
      const padraoSemDistancia = lojaDaApi({ padrao: true, distanciaKm: null })

      expect(filiaisParaCartoes([padraoSemDistancia], MARKETS, 'todos')).toEqual({})
    })

    it('a loja padrão sem o campo distanciaKm também fica fora', () => {
      const { distanciaKm, ...semCampo } = lojaDaApi({ padrao: true })

      expect(distanciaKm).toBe(3.2)
      expect(filiaisParaCartoes([semCampo], MARKETS, 'todos')).toEqual({})
    })

    it('a loja que não é padrão e não tem distância continua, com distanciaKm null', () => {
      const semDistancia = lojaDaApi({ padrao: false, distanciaKm: null })

      expect(filiaisParaCartoes([semDistancia], MARKETS, 'todos').fort).toEqual({
        nomeFilial: 'Fort Atacadista Cachoeirinha',
        endereco: 'Av. Flores da Cunha, 1000',
        cidade: 'Cachoeirinha',
        uf: 'RS',
        latitude: null,
        longitude: null,
        distanciaKm: null,
        lojaId: 11,
        padrao: false,
        preferida: false,
      })
    })

    it('a loja padrão que tem distância entra normalmente', () => {
      const padraoComDistancia = lojaDaApi({ padrao: true, distanciaKm: 7.5 })

      expect(filiaisParaCartoes([padraoComDistancia], MARKETS, 'todos').fort).toEqual(
        expect.objectContaining({ padrao: true, distanciaKm: 7.5 }),
      )
    })
  })

  describe('coordenadas da loja (Como chegar)', () => {
    it('passam para o cartão como par', () => {
      const comCoordenadas = lojaDaApi({ latitude: -29.9511, longitude: -51.0944 })

      expect(filiaisParaCartoes([comCoordenadas], MARKETS, 'todos').fort).toEqual(
        expect.objectContaining({ latitude: -29.9511, longitude: -51.0944 }),
      )
    })

    it.each([
      ['nulas', { latitude: null, longitude: null }],
      ['ausentes', {}],
      ['só a latitude', { latitude: -29.9511, longitude: null }],
      ['só a longitude', { latitude: null, longitude: -51.0944 }],
      ['texto no lugar de número', { latitude: '-29.9511', longitude: '-51.0944' }],
      ['NaN', { latitude: NaN, longitude: -51.0944 }],
    ])('coordenadas %s viram as duas nulas', (_nome, coordenadas) => {
      const resultado = filiaisParaCartoes([lojaDaApi(coordenadas)], MARKETS, 'todos').fort

      expect(resultado.latitude).toBeNull()
      expect(resultado.longitude).toBeNull()
    })
  })

  describe('entradas que não casam', () => {
    it('mercadoNome desconhecido fica fora', () => {
      const desconhecida = lojaDaApi({ mercadoId: 99, mercadoNome: 'Big Bompreço' })

      expect(filiaisParaCartoes([desconhecida], MARKETS, 'todos')).toEqual({})
    })

    it.each([[null], [undefined], ['texto'], [{ fort: 1 }], [42]])('lojas %p (não é array) vira {}', (lojas) => {
      expect(filiaisParaCartoes(lojas, MARKETS, 'todos')).toEqual({})
    })

    it.each([[null], [undefined], ['texto'], [{}]])('markets %p (não é array) vira {}', (markets) => {
      expect(filiaisParaCartoes([lojaDaApi()], markets, 'todos')).toEqual({})
    })
  })

  describe('raio', () => {
    const fortA4Km = lojaDaApi({ distanciaKm: 4 })
    const zaffariA9Km = lojaDaApi({
      mercadoId: 2,
      mercadoNome: 'Zaffari / Bourbon',
      lojaId: 21,
      lojaNome: 'Zaffari Bourbon Wallig',
      distanciaKm: 9,
    })

    it('com raio 5, a loja a 9 km fica fora e a de 4 km entra', () => {
      const resultado = filiaisParaCartoes([fortA4Km, zaffariA9Km], MARKETS, 5)

      expect(Object.keys(resultado)).toEqual(['fort'])
      expect(resultado.fort.distanciaKm).toBe(4)
    })

    it('com raio "todos", as duas entram', () => {
      expect(Object.keys(filiaisParaCartoes([fortA4Km, zaffariA9Km], MARKETS, 'todos')).sort()).toEqual([
        'fort',
        'zaffari',
      ])
    })

    it('com raio 5, a loja sem distância e não padrão continua', () => {
      const semDistancia = lojaDaApi({ distanciaKm: null, padrao: false })

      expect(Object.keys(filiaisParaCartoes([semDistancia, zaffariA9Km], MARKETS, 5))).toEqual(['fort'])
    })

    it('raio inválido não esconde nenhuma loja', () => {
      expect(Object.keys(filiaisParaCartoes([fortA4Km, zaffariA9Km], MARKETS, 'abc')).sort()).toEqual([
        'fort',
        'zaffari',
      ])
    })
  })
})

describe('redeMaisPerto', () => {
  const fortA4Km = lojaDaApi({ distanciaKm: 4 })
  const zaffariA2Km = lojaDaApi({
    mercadoId: 2,
    mercadoNome: 'Zaffari / Bourbon',
    lojaId: 21,
    lojaNome: 'Zaffari Bourbon Wallig',
    distanciaKm: 2,
  })
  const doApi = (...lojas) => filiaisParaCartoes(lojas, MARKETS, 'todos')

  it('devolve a rede da loja com a menor distância, com o nome da rede e a distância', () => {
    expect(redeMaisPerto(doApi(fortA4Km, zaffariA2Km), MARKETS)).toEqual({
      id: 'zaffari',
      nome: expect.stringMatching(/Zaffari/),
      distanciaKm: 2,
    })
  })

  it('usa o nome da rede do catálogo, e não o da loja', () => {
    const rede = MARKETS.find((m) => m.id === 'zaffari')

    expect(redeMaisPerto(doApi(fortA4Km, zaffariA2Km), MARKETS).nome).toBe(rede.name)
  })

  it('com uma só rede com distância, é ela', () => {
    expect(redeMaisPerto(doApi(fortA4Km), MARKETS)).toEqual(expect.objectContaining({ id: 'fort', distanciaKm: 4 }))
  })

  it('ignora a loja sem distância e escolhe entre as que têm', () => {
    const fortSemDistancia = lojaDaApi({ distanciaKm: null })

    expect(redeMaisPerto(doApi(fortSemDistancia, zaffariA2Km), MARKETS).id).toBe('zaffari')
  })

  it('sem nenhuma loja com distância não há destaque', () => {
    const fortSemDistancia = lojaDaApi({ distanciaKm: null })
    const zaffariSemDistancia = lojaDaApi({ ...zaffariA2Km, distanciaKm: null })

    expect(redeMaisPerto(doApi(fortSemDistancia, zaffariSemDistancia), MARKETS)).toBeNull()
  })

  it('empate na menor distância não destaca ninguém', () => {
    const zaffariA4Km = lojaDaApi({ ...zaffariA2Km, distanciaKm: 4 })

    expect(redeMaisPerto(doApi(fortA4Km, zaffariA4Km), MARKETS)).toBeNull()
  })

  it('o empate só conta na menor: duas redes mais longe com a mesma distância não atrapalham', () => {
    const zaffariA4Km = lojaDaApi({ ...zaffariA2Km, distanciaKm: 4 })
    const outraA1Km = { ...zaffariA2Km, distanciaKm: 1 }
    const filiais = { ...doApi(fortA4Km, zaffariA4Km), asun: { ...outraA1Km, nomeFilial: 'Asun Centro' } }

    expect(redeMaisPerto(filiais, MARKETS)).toEqual(expect.objectContaining({ id: 'asun', distanciaKm: 1 }))
  })

  it.each([[null], [undefined], [{}], ['texto']])('filiais %p: sem destaque', (filiais) => {
    expect(redeMaisPerto(filiais, MARKETS)).toBeNull()
  })

  it('markets que não é lista não quebra: cai no nome da loja', () => {
    expect(redeMaisPerto(doApi(zaffariA2Km), null)).toEqual({
      id: 'zaffari',
      nome: 'Zaffari Bourbon Wallig',
      distanciaKm: 2,
    })
  })
})
