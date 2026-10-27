import api from './api'
import favoritoService from './favoritoService'

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}))

const semConexao = () => new Error('Network Error')
const erroDoServidor = () => Object.assign(new Error('falha'), { response: { status: 500 } })

describe('favoritoService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    localStorage.clear()
  })

  describe('mercados', () => {
    it('listarMercados devolve os favoritos do backend', async () => {
      api.get.mockResolvedValue({ data: [1, 2] })

      await expect(favoritoService.listarMercados()).resolves.toEqual([1, 2])
      expect(api.get).toHaveBeenCalledWith('/favoritos')
    })

    it('listarMercados usa o localStorage quando o backend falha', async () => {
      api.get.mockRejectedValue(semConexao())
      localStorage.setItem('sm_fav_markets', '[3,4]')

      await expect(favoritoService.listarMercados()).resolves.toEqual([3, 4])
    })

    it('listarMercados devolve lista vazia sem favoritos locais', async () => {
      api.get.mockRejectedValue(semConexao())

      await expect(favoritoService.listarMercados()).resolves.toEqual([])
    })

    it('listarMercados devolve lista vazia quando o localStorage esta corrompido', async () => {
      api.get.mockRejectedValue(semConexao())
      localStorage.setItem('sm_fav_markets', '{nao-e-json')

      await expect(favoritoService.listarMercados()).resolves.toEqual([])
    })

    it('favoritarMercado envia o id e devolve a resposta', async () => {
      api.post.mockResolvedValue({ data: { mercadoId: 7 } })

      await expect(favoritoService.favoritarMercado(7)).resolves.toEqual({ mercadoId: 7 })
      expect(api.post).toHaveBeenCalledWith('/favoritos', { mercadoId: 7 })
    })

    it('favoritarMercado sem conexao salva localmente, sem duplicar', async () => {
      api.post.mockRejectedValue(semConexao())

      await favoritoService.favoritarMercado(7)
      const resultado = await favoritoService.favoritarMercado(7)

      expect(resultado).toEqual({ mercadoId: 7 })
      expect(JSON.parse(localStorage.getItem('sm_fav_markets'))).toEqual([7])
    })

    it('favoritarMercado relanca erros do servidor', async () => {
      const erro = erroDoServidor()
      api.post.mockRejectedValue(erro)

      await expect(favoritoService.favoritarMercado(7)).rejects.toBe(erro)
    })

    it('desfavoritarMercado remove no backend', async () => {
      api.delete.mockResolvedValue({})

      await favoritoService.desfavoritarMercado(7)

      expect(api.delete).toHaveBeenCalledWith('/favoritos/mercados/7')
    })

    it('desfavoritarMercado sem conexao remove do localStorage', async () => {
      api.delete.mockRejectedValue(semConexao())
      localStorage.setItem('sm_fav_markets', '[7,8]')

      await favoritoService.desfavoritarMercado(7)

      expect(JSON.parse(localStorage.getItem('sm_fav_markets'))).toEqual([8])
    })

    it('desfavoritarMercado relanca erros do servidor', async () => {
      const erro = erroDoServidor()
      api.delete.mockRejectedValue(erro)

      await expect(favoritoService.desfavoritarMercado(7)).rejects.toBe(erro)
    })
  })

  describe('produtos', () => {
    it('listarProdutos devolve os favoritos do backend', async () => {
      api.get.mockResolvedValue({ data: [10] })

      await expect(favoritoService.listarProdutos()).resolves.toEqual([10])
      expect(api.get).toHaveBeenCalledWith('/favoritos/produtos')
    })

    it('listarProdutos usa o localStorage quando o backend falha', async () => {
      api.get.mockRejectedValue(semConexao())
      localStorage.setItem('sm_fav_products', '[11]')

      await expect(favoritoService.listarProdutos()).resolves.toEqual([11])
    })

    it('listarProdutos devolve lista vazia quando o localStorage esta corrompido', async () => {
      api.get.mockRejectedValue(semConexao())
      localStorage.setItem('sm_fav_products', '{nao-e-json')

      await expect(favoritoService.listarProdutos()).resolves.toEqual([])
    })

    it('favoritarProduto envia a requisicao ao backend', async () => {
      api.post.mockResolvedValue({})

      await favoritoService.favoritarProduto(10)

      expect(api.post).toHaveBeenCalledWith('/favoritos/produtos/10')
    })

    it('favoritarProduto sem conexao salva localmente, sem duplicar', async () => {
      api.post.mockRejectedValue(semConexao())

      await favoritoService.favoritarProduto(10)
      await favoritoService.favoritarProduto(10)

      expect(JSON.parse(localStorage.getItem('sm_fav_products'))).toEqual([10])
    })

    it('favoritarProduto relanca erros do servidor', async () => {
      const erro = erroDoServidor()
      api.post.mockRejectedValue(erro)

      await expect(favoritoService.favoritarProduto(10)).rejects.toBe(erro)
    })

    it('desfavoritarProduto remove no backend', async () => {
      api.delete.mockResolvedValue({})

      await favoritoService.desfavoritarProduto(10)

      expect(api.delete).toHaveBeenCalledWith('/favoritos/produtos/10')
    })

    it('desfavoritarProduto sem conexao remove do localStorage', async () => {
      api.delete.mockRejectedValue(semConexao())
      localStorage.setItem('sm_fav_products', '[10,12]')

      await favoritoService.desfavoritarProduto(10)

      expect(JSON.parse(localStorage.getItem('sm_fav_products'))).toEqual([12])
    })

    it('desfavoritarProduto relanca erros do servidor', async () => {
      const erro = erroDoServidor()
      api.delete.mockRejectedValue(erro)

      await expect(favoritoService.desfavoritarProduto(10)).rejects.toBe(erro)
    })
  })
})
