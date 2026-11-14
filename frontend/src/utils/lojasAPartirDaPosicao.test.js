import { lojasAPartirDaPosicao } from './lojasAPartirDaPosicao'
import { filiaisParaCartoes, redeMaisPerto } from './lojasDoCatalogo'

// Posição do usuário no centro de Porto Alegre.
const POSICAO = { latitude: -30.0346, longitude: -51.2177 }

// Filiais públicas (GET /api/lojas/filiais): só filiais reais, com coordenadas.
const filial = (mercadoId, mercadoNome, lojaId, lojaNome, latitude, longitude) => ({
  mercadoId,
  mercadoNome,
  lojaId,
  lojaNome,
  latitude,
  longitude,
})
const FORT_CACHOEIRINHA = filial(1, 'Fort Atacadista', 11, 'Fort Cachoeirinha', -29.9511, -51.0944) // 15,07 km
const FORT_CAXIAS = filial(1, 'Fort Atacadista', 12, 'Fort Caxias', -29.1681, -51.1794) // 96,42 km
const CARREFOUR_CENTRO = filial(2, 'Carrefour', 21, 'Carrefour Centro', -30.03, -51.22)

// Loja de /api/lojas/proximas (a distância dela é a do CEP, não a da posição do navegador).
const lojaDoCep = (mercadoId, mercadoNome, lojaId, lojaNome, extra = {}) => ({
  mercadoId,
  mercadoNome,
  lojaId,
  lojaNome,
  endereco: null,
  cidade: null,
  uf: null,
  latitude: null,
  longitude: null,
  distanciaKm: null,
  padrao: false,
  preferida: false,
  ...extra,
})
const PADRAO_FORT = lojaDoCep(1, 'Fort Atacadista', 10, 'Fort padrão', { padrao: true })
const PADRAO_MASTER = lojaDoCep(3, 'Master Supermercados', 30, 'Master padrão', { padrao: true })

const daRede = (lojas, mercadoId) => lojas.find((loja) => loja.mercadoId === mercadoId)

describe('lojasAPartirDaPosicao', () => {
  describe('filial mais próxima da posição', () => {
    it('escolhe, por rede, a filial pública mais perto e calcula a distância da posição, em 2 casas', () => {
      const lojas = lojasAPartirDaPosicao(POSICAO, [], [FORT_CAXIAS, FORT_CACHOEIRINHA, CARREFOUR_CENTRO])

      expect(daRede(lojas, 1)).toMatchObject({ lojaId: 11, lojaNome: 'Fort Cachoeirinha', distanciaKm: 15.07 })
      expect(daRede(lojas, 2)).toMatchObject({ lojaId: 21, lojaNome: 'Carrefour Centro' })
      expect(daRede(lojas, 2).distanciaKm).toBeLessThan(1)
      expect(lojas).toHaveLength(2)
    })

    it('a loja devolvida tem o formato de /api/lojas/proximas, com as coordenadas da própria loja', () => {
      const [loja] = lojasAPartirDaPosicao(POSICAO, [], [FORT_CACHOEIRINHA])

      expect(loja).toEqual({
        mercadoId: 1,
        mercadoNome: 'Fort Atacadista',
        lojaId: 11,
        lojaNome: 'Fort Cachoeirinha',
        endereco: null,
        cidade: null,
        uf: null,
        latitude: -29.9511,
        longitude: -51.0944,
        distanciaKm: 15.07,
        padrao: false,
        preferida: false,
      })
    })

    it('empate de distância: fica a primeira da lista (menor lojaId, a API já vem ordenada)', () => {
      const a = filial(1, 'Fort Atacadista', 10, 'Fort A', -29.95, -51.1)
      const b = filial(1, 'Fort Atacadista', 20, 'Fort B', -29.95, -51.1)

      expect(daRede(lojasAPartirDaPosicao(POSICAO, [], [a, b]), 1).lojaId).toBe(10)
    })

    it('ordena da mais perto para a mais longe, com as sem distância no fim', () => {
      const lojas = lojasAPartirDaPosicao(POSICAO, [PADRAO_MASTER], [FORT_CACHOEIRINHA, CARREFOUR_CENTRO])

      expect(lojas.map((loja) => loja.mercadoId)).toEqual([2, 1, 3])
    })

    it('funciona sem nenhuma loja do CEP (usuário sem CEP resolvido)', () => {
      const lojas = lojasAPartirDaPosicao(POSICAO, [], [FORT_CACHOEIRINHA])

      expect(lojas).toHaveLength(1)
      expect(lojas[0].distanciaKm).toBe(15.07)
    })
  })

  describe('a loja preferida vence a mais próxima', () => {
    it('mantém a preferida como loja da rede e mede a distância da posição até ela, não a do CEP', () => {
      const preferida = lojaDoCep(1, 'Fort Atacadista', 12, 'Fort Caxias', {
        preferida: true,
        latitude: -29.1681,
        longitude: -51.1794,
        distanciaKm: 3.3, // distância do CEP: não pode sobrar
      })

      const loja = daRede(lojasAPartirDaPosicao(POSICAO, [preferida], [FORT_CACHOEIRINHA, FORT_CAXIAS]), 1)

      expect(loja).toMatchObject({ lojaId: 12, preferida: true, distanciaKm: 96.42 })
    })

    it('preferida sem coordenadas continua sendo a loja da rede, sem distância', () => {
      const preferida = lojaDoCep(1, 'Fort Atacadista', 12, 'Fort Caxias', { preferida: true })

      const loja = daRede(lojasAPartirDaPosicao(POSICAO, [preferida], [FORT_CACHOEIRINHA]), 1)

      expect(loja).toMatchObject({ lojaId: 12, preferida: true, distanciaKm: null })
    })

    it('só vale para a rede dela: as outras redes seguem pela mais próxima', () => {
      const preferida = lojaDoCep(1, 'Fort Atacadista', 12, 'Fort Caxias', {
        preferida: true,
        latitude: -29.1681,
        longitude: -51.1794,
      })

      const lojas = lojasAPartirDaPosicao(POSICAO, [preferida], [FORT_CAXIAS, CARREFOUR_CENTRO])

      expect(daRede(lojas, 1).preferida).toBe(true)
      expect(daRede(lojas, 2)).toMatchObject({ lojaId: 21, preferida: false })
    })
  })

  describe('rede sem filial com coordenadas', () => {
    it('cai na loja padrão da rede, sem distância', () => {
      const lojas = lojasAPartirDaPosicao(POSICAO, [PADRAO_MASTER], [FORT_CACHOEIRINHA])

      expect(daRede(lojas, 3)).toMatchObject({ lojaId: 30, padrao: true, distanciaKm: null })
    })

    it('a padrão não aparece quando a rede tem filial pública', () => {
      const lojas = lojasAPartirDaPosicao(POSICAO, [PADRAO_FORT], [FORT_CACHOEIRINHA])

      expect(daRede(lojas, 1)).toMatchObject({ lojaId: 11, padrao: false })
      expect(lojas).toHaveLength(1)
    })

    it('rede que não tem nem filial nem padrão simplesmente não entra', () => {
      expect(lojasAPartirDaPosicao(POSICAO, [], [])).toEqual([])
    })
  })

  describe('entradas inválidas', () => {
    it('posição inválida devolve as lojas do CEP como vieram', () => {
      const doCep = [PADRAO_FORT]

      expect(lojasAPartirDaPosicao(null, doCep, [FORT_CACHOEIRINHA])).toBe(doCep)
      expect(lojasAPartirDaPosicao({ latitude: NaN, longitude: -51 }, doCep, [FORT_CACHOEIRINHA])).toBe(doCep)
      expect(lojasAPartirDaPosicao({ latitude: '-30', longitude: '-51' }, doCep, [FORT_CACHOEIRINHA])).toBe(doCep)
    })

    it('filial pública com coordenada inválida ou sem rede é ignorada', () => {
      const lixo = [
        filial(1, 'Fort Atacadista', 13, 'Sem lat', null, -51.1),
        filial(1, 'Fort Atacadista', 14, 'Texto', '-29.9', '-51.1'),
        filial(null, 'Sem id', 15, 'Sem rede', -29.9, -51.1),
        null,
      ]

      const lojas = lojasAPartirDaPosicao(POSICAO, [], [...lixo, FORT_CACHOEIRINHA])

      expect(lojas).toHaveLength(1)
      expect(lojas[0].lojaId).toBe(11)
    })

    it('listas que não são arrays viram listas vazias', () => {
      expect(lojasAPartirDaPosicao(POSICAO, undefined, undefined)).toEqual([])
      expect(lojasAPartirDaPosicao(POSICAO, null, 'x')).toEqual([])
    })

    it('não altera os objetos que recebeu', () => {
      const preferida = lojaDoCep(1, 'Fort Atacadista', 12, 'Fort Caxias', {
        preferida: true,
        latitude: -29.1681,
        longitude: -51.1794,
        distanciaKm: 3.3,
      })
      lojasAPartirDaPosicao(POSICAO, [preferida], [FORT_CAXIAS])

      expect(preferida.distanciaKm).toBe(3.3)
    })
  })

  describe('junto com o catálogo (filiaisParaCartoes e redeMaisPerto)', () => {
    const markets = [
      { id: 1, name: 'Fort Atacadista' },
      { id: 2, name: 'Carrefour' },
      { id: 3, name: 'Master Supermercados' },
    ]

    it('os cartões ganham a loja e a distância da posição, e a rede mais perto sai das distâncias novas', () => {
      const lojas = lojasAPartirDaPosicao(POSICAO, [PADRAO_MASTER], [FORT_CACHOEIRINHA, CARREFOUR_CENTRO])
      const filiais = filiaisParaCartoes(lojas, markets, 'todos')

      expect(filiais['1']).toMatchObject({ nomeFilial: 'Fort Cachoeirinha', distanciaKm: 15.07 })
      expect(filiais['2'].nomeFilial).toBe('Carrefour Centro')
      expect(filiais['3']).toBeUndefined() // padrão sem distância fica fora dos cartões
      expect(redeMaisPerto(filiais, markets)).toMatchObject({ id: '2', nome: 'Carrefour' })
    })

    it('o raio do seletor passa a valer sobre as distâncias da posição', () => {
      const lojas = lojasAPartirDaPosicao(POSICAO, [], [FORT_CAXIAS, CARREFOUR_CENTRO])

      const filiais = filiaisParaCartoes(lojas, markets, 20)

      expect(Object.keys(filiais)).toEqual(['2']) // a Fort (96 km) fica fora do raio de 20 km
    })
  })
})
