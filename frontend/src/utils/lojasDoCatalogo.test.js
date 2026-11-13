import { MARKETS } from '../catalogoResumo'
import { filiaisParaCartoes } from './lojasDoCatalogo'

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
