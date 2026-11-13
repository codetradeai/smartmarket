import api from './api'
import lojaService from './lojaService'

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))

describe('lojaService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('lojasProximas', () => {
    it('faz GET em /lojas/proximas e devolve a lista', async () => {
      const lojas = [{ lojaId: 21, mercadoId: 8, mercadoNome: 'Fort Atacadista', distanciaKm: 2.4 }]
      api.get.mockResolvedValue({ data: lojas })

      await expect(lojaService.lojasProximas()).resolves.toEqual(lojas)
      expect(api.get).toHaveBeenCalledWith('/lojas/proximas')
    })

    it.each([
      ['objeto', { erro: 'x' }],
      ['texto', 'nada'],
      ['nulo', null],
      ['indefinido', undefined],
    ])('devolve lista vazia quando o corpo é %s (não é array)', async (_rotulo, corpo) => {
      api.get.mockResolvedValue({ data: corpo })

      await expect(lojaService.lojasProximas()).resolves.toEqual([])
    })
  })

  describe('obterLocalizacao', () => {
    it('faz GET em /usuarios/me/localizacao e devolve o corpo', async () => {
      const localizacao = { cep: '90010000', cidade: 'Porto Alegre', uf: 'RS' }
      api.get.mockResolvedValue({ data: localizacao })

      await expect(lojaService.obterLocalizacao()).resolves.toEqual(localizacao)
      expect(api.get).toHaveBeenCalledWith('/usuarios/me/localizacao')
    })
  })

  describe('trocarCep', () => {
    it('faz PUT em /usuarios/me/localizacao enviando somente { cep }', async () => {
      const resposta = { cep: '90010000', cidade: 'Porto Alegre', uf: 'RS' }
      api.put.mockResolvedValue({ data: resposta })

      await expect(lojaService.trocarCep('90010000')).resolves.toEqual(resposta)
      expect(api.put).toHaveBeenCalledTimes(1)
      expect(api.put).toHaveBeenCalledWith('/usuarios/me/localizacao', { cep: '90010000' })
    })

    it('com 400 e campos.cep, rejeita com userMessage igual ao texto do backend', async () => {
      const erro = Object.assign(new Error('Request failed with status code 400'), {
        response: { status: 400, data: { campos: { cep: 'CEP não encontrado' } } },
      })
      api.put.mockRejectedValue(erro)

      const rejeitado = await lojaService.trocarCep('00000000').catch((e) => e)

      expect(rejeitado).toBe(erro)
      expect(rejeitado.userMessage).toBe('CEP não encontrado')
    })

    it('com 400 sem campos.cep, rejeita com o erro original e sem userMessage', async () => {
      const erro = Object.assign(new Error('Request failed with status code 400'), {
        response: { status: 400, data: { erro: 'Requisição inválida' } },
      })
      api.put.mockRejectedValue(erro)

      const rejeitado = await lojaService.trocarCep('90010000').catch((e) => e)

      expect(rejeitado).toBe(erro)
      expect(rejeitado.userMessage).toBeUndefined()
    })

    it('com erro de rede (sem response), rejeita com o erro original, sem userMessage', async () => {
      const erro = new Error('Network Error')
      api.put.mockRejectedValue(erro)

      const rejeitado = await lojaService.trocarCep('90010000').catch((e) => e)

      expect(rejeitado).toBe(erro)
      expect(rejeitado.userMessage).toBeUndefined()
    })
  })

  describe('excluirLocalizacao', () => {
    it('faz DELETE em /usuarios/me/localizacao e não devolve nada', async () => {
      api.delete.mockResolvedValue({ data: { ignorado: true } })

      await expect(lojaService.excluirLocalizacao()).resolves.toBeUndefined()
      expect(api.delete).toHaveBeenCalledWith('/usuarios/me/localizacao')
    })
  })

  describe('definirLojaPreferida', () => {
    it('faz PUT em /usuarios/me/loja-preferida com { lojaId } numérico', async () => {
      api.put.mockResolvedValue({ data: {} })

      await lojaService.definirLojaPreferida(12)

      expect(api.put).toHaveBeenCalledWith('/usuarios/me/loja-preferida', { lojaId: 12 })
    })

    it('devolve o corpo da resposta, a localização atualizada', async () => {
      const localizacao = {
        cep: '90010000',
        cidade: 'Porto Alegre',
        uf: 'RS',
        latitude: -30.0277,
        longitude: -51.2287,
        resolvida: true,
        lojaPreferidaId: 12,
      }
      api.put.mockResolvedValue({ data: localizacao })

      await expect(lojaService.definirLojaPreferida(12)).resolves.toEqual(localizacao)
    })

    it('com null envia { lojaId: null } para remover a preferência', async () => {
      api.put.mockResolvedValue({ data: {} })

      await lojaService.definirLojaPreferida(null)

      expect(api.put).toHaveBeenCalledWith('/usuarios/me/loja-preferida', { lojaId: null })
    })
  })

  describe('armazenamento local', () => {
    it('nenhuma função lê ou grava localStorage', async () => {
      const lerItem = jest.spyOn(Storage.prototype, 'getItem')
      const gravarItem = jest.spyOn(Storage.prototype, 'setItem')
      api.get.mockResolvedValue({ data: [] })
      api.put.mockResolvedValue({ data: {} })
      api.delete.mockResolvedValue({})

      try {
        await lojaService.lojasProximas()
        await lojaService.obterLocalizacao()
        await lojaService.trocarCep('90010000')
        await lojaService.excluirLocalizacao()
        await lojaService.definirLojaPreferida(3)

        expect(lerItem).not.toHaveBeenCalled()
        expect(gravarItem).not.toHaveBeenCalled()
      } finally {
        lerItem.mockRestore()
        gravarItem.mockRestore()
      }
    })
  })
})
