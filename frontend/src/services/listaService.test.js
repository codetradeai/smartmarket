import api from './api'
import listaService from './listaService'

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}))

describe('listaService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    sessionStorage.clear()
  })

  describe('listarMinhas', () => {
    it('devolve as listas do backend', async () => {
      const listas = [{ id: 1, nome: 'Semana' }]
      api.get.mockResolvedValue({ data: listas })

      await expect(listaService.listarMinhas()).resolves.toBe(listas)
      expect(api.get).toHaveBeenCalledWith('/listas')
    })

    it('sem conexao monta uma lista padrao a partir do sessionStorage', async () => {
      api.get.mockRejectedValue(new Error('Network Error'))
      sessionStorage.setItem('sm_list', JSON.stringify({ 10: 2, 11: 1 }))

      const listas = await listaService.listarMinhas()

      expect(listas).toEqual([
        {
          id: 'local_temp',
          nome: 'Minha Lista Padrão',
          itens: [
            { produtoId: '10', quantidade: 2 },
            { produtoId: '11', quantidade: 1 },
          ],
        },
      ])
    })

    it('sem conexao e sem lista salva devolve uma lista padrao vazia', async () => {
      api.get.mockRejectedValue(new Error('Network Error'))

      const [lista] = await listaService.listarMinhas()

      expect(lista.itens).toEqual([])
    })

    it('sem conexao devolve lista vazia quando o sessionStorage esta corrompido', async () => {
      api.get.mockRejectedValue(new Error('Network Error'))
      sessionStorage.setItem('sm_list', '{nao-e-json')

      await expect(listaService.listarMinhas()).resolves.toEqual([])
    })

    it('relanca erros vindos do servidor', async () => {
      const erro = Object.assign(new Error('falha'), { response: { status: 500 } })
      api.get.mockRejectedValue(erro)

      await expect(listaService.listarMinhas()).rejects.toBe(erro)
    })
  })

  it('buscarPorId busca a lista pelo id', async () => {
    api.get.mockResolvedValue({ data: { id: 3 } })

    await expect(listaService.buscarPorId(3)).resolves.toEqual({ id: 3 })
    expect(api.get).toHaveBeenCalledWith('/listas/3')
  })

  it('criar envia nome e itens (padrao: sem itens)', async () => {
    api.post.mockResolvedValue({ data: { id: 4 } })

    await listaService.criar('Churrasco')
    await listaService.criar('Mensal', [{ produtoId: 1, quantidade: 2 }])

    expect(api.post).toHaveBeenNthCalledWith(1, '/listas', { nome: 'Churrasco', itens: [] })
    expect(api.post).toHaveBeenNthCalledWith(2, '/listas', {
      nome: 'Mensal',
      itens: [{ produtoId: 1, quantidade: 2 }],
    })
  })

  it('adicionarItem envia produto e quantidade para a lista', async () => {
    api.post.mockResolvedValue({ data: { id: 3 } })

    await expect(listaService.adicionarItem(3, 9, 2)).resolves.toEqual({ id: 3 })
    expect(api.post).toHaveBeenCalledWith('/listas/3/itens', { produtoId: 9, quantidade: 2 })
  })

  it('removerItem exclui o produto da lista e devolve a lista atualizada', async () => {
    api.delete.mockResolvedValue({ data: { id: 3, itens: [] } })

    await expect(listaService.removerItem(3, 9)).resolves.toEqual({ id: 3, itens: [] })
    expect(api.delete).toHaveBeenCalledWith('/listas/3/itens/9')
  })

  it('removerLista exclui a lista', async () => {
    api.delete.mockResolvedValue({})

    await expect(listaService.removerLista(3)).resolves.toBeUndefined()
    expect(api.delete).toHaveBeenCalledWith('/listas/3')
  })

  it('compararCesta busca a comparacao entre mercados', async () => {
    const comparacao = { mercadoMaisBarato: { mercadoId: 1 } }
    api.get.mockResolvedValue({ data: comparacao })

    await expect(listaService.compararCesta(3)).resolves.toBe(comparacao)
    expect(api.get).toHaveBeenCalledWith('/listas/3/comparar')
  })
})
