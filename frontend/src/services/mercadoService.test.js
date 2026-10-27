import api from './api'
import mercadoService from './mercadoService'
import { MARKETS } from '../data'

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))

describe('mercadoService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('listar', () => {
    it('converte os mercados do backend para o formato da interface', async () => {
      api.get.mockResolvedValue({
        data: [
          { id: 1, nome: 'Fort Atacadista', endereco: 'Rua A', logoUrl: 'fort.png', ativo: true },
          { id: 2, nome: 'Carrefour', ativo: false },
          { id: 3, nome: 'Stock Center', ativo: true },
        ],
      })

      const mercados = await mercadoService.listar()

      expect(api.get).toHaveBeenCalledWith('/mercados')
      expect(mercados).toEqual([
        { id: 1, name: 'Fort Atacadista', address: 'Rua A', logoUrl: 'fort.png', color: '#E63312', active: true },
        { id: 2, name: 'Carrefour', address: '', logoUrl: '', color: '#1A63B9', active: false },
        { id: 3, name: 'Stock Center', address: '', logoUrl: '', color: '#F5A623', active: true },
      ])
    })

    it('usa os mercados de exemplo quando o backend devolve lista vazia', async () => {
      api.get.mockResolvedValue({ data: [] })

      await expect(mercadoService.listar()).resolves.toBe(MARKETS)
    })

    it('usa os mercados de exemplo quando a resposta nao e uma lista', async () => {
      api.get.mockResolvedValue({ data: { erro: true } })

      await expect(mercadoService.listar()).resolves.toBe(MARKETS)
    })

    it('usa os mercados de exemplo quando a requisicao falha', async () => {
      api.get.mockRejectedValue(new Error('offline'))

      await expect(mercadoService.listar()).resolves.toBe(MARKETS)
    })
  })

  it('criar envia o mercado e devolve o criado', async () => {
    api.post.mockResolvedValue({ data: { id: 9 } })

    await expect(mercadoService.criar({ nome: 'Novo' })).resolves.toEqual({ id: 9 })
    expect(api.post).toHaveBeenCalledWith('/mercados', { nome: 'Novo' })
  })

  it('atualizar envia os dados para o mercado informado', async () => {
    api.put.mockResolvedValue({ data: { id: 9, nome: 'Editado' } })

    await expect(mercadoService.atualizar(9, { nome: 'Editado' })).resolves.toEqual({ id: 9, nome: 'Editado' })
    expect(api.put).toHaveBeenCalledWith('/mercados/9', { nome: 'Editado' })
  })

  it('remover exclui o mercado informado', async () => {
    api.delete.mockResolvedValue({})

    await expect(mercadoService.remover(9)).resolves.toBeUndefined()
    expect(api.delete).toHaveBeenCalledWith('/mercados/9')
  })
})
