import api from './api'
import produtoService from './produtoService'
import { PRODUCTS } from '../data'

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))

describe('produtoService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('buscarCatalogoComPrecos', () => {
    it('converte os produtos do backend para o formato da interface', async () => {
      api.get.mockResolvedValue({
        data: [
          {
            id: 1,
            nome: 'Arroz',
            marca: 'Tio Joao',
            categoria: 'graos',
            quantidade: 5,
            unidade: 'kg',
            imagemUrl: 'arroz.png',
            precos: { 1: 25.9 },
            menorPreco: 25.9,
            mercadoMenorPreco: 'Fort',
            promo: true,
            valorOriginal: 29.9,
            unidadePadrao: 'kg',
            quantidadePadrao: 5,
            precosPorUnidadePadrao: { 1: 5.18 },
          },
        ],
      })

      const catalogo = await produtoService.buscarCatalogoComPrecos()

      expect(api.get).toHaveBeenCalledWith('/precos/catalogo')
      expect(catalogo).toEqual([
        {
          id: 1,
          name: 'Arroz',
          brand: 'Tio Joao',
          category: 'graos',
          unit: '5 kg',
          image: 'arroz.png',
          prices: { 1: 25.9 },
          menorPreco: 25.9,
          mercadoMenorPreco: 'Fort',
          promo: true,
          valorOriginal: 29.9,
          unitStandard: 'kg',
          qtyStandard: 5,
          pricesPerUnit: { 1: 5.18 },
        },
      ])
    })

    it('preenche valores padrao para campos ausentes e aceita emPromocao', async () => {
      api.get.mockResolvedValue({ data: [{ id: 2, nome: 'Leite', emPromocao: true }] })

      const [produto] = await produtoService.buscarCatalogoComPrecos()

      expect(produto).toMatchObject({
        brand: '',
        category: 'todos',
        unit: '',
        image: '🏪',
        prices: {},
        promo: true,
        valorOriginal: null,
        unitStandard: '',
        qtyStandard: null,
        pricesPerUnit: {},
      })
    })

    it('marca promo como falso quando o backend nao informa', async () => {
      api.get.mockResolvedValue({ data: [{ id: 3, nome: 'Cafe' }] })

      const [produto] = await produtoService.buscarCatalogoComPrecos()

      expect(produto.promo).toBe(false)
    })

    it('usa os produtos de exemplo quando a lista vem vazia', async () => {
      api.get.mockResolvedValue({ data: [] })

      await expect(produtoService.buscarCatalogoComPrecos()).resolves.toBe(PRODUCTS)
    })

    it('usa os produtos de exemplo quando a requisicao falha', async () => {
      api.get.mockRejectedValue(new Error('offline'))

      await expect(produtoService.buscarCatalogoComPrecos()).resolves.toBe(PRODUCTS)
    })
  })

  describe('listar', () => {
    it('envia a paginacao padrao e ignora filtros vazios', async () => {
      api.get.mockResolvedValue({ data: { content: [] } })

      await produtoService.listar()

      expect(api.get).toHaveBeenCalledWith('/produtos', {
        params: { page: 0, size: 50, sort: 'nome,asc' },
      })
    })

    it('envia nome e categoria quando informados', async () => {
      api.get.mockResolvedValue({ data: { content: [] } })

      await produtoService.listar({ nome: 'arroz', categoria: 'graos', page: 1, size: 10, sort: 'nome,desc' })

      expect(api.get).toHaveBeenCalledWith('/produtos', {
        params: { page: 1, size: 10, sort: 'nome,desc', nome: 'arroz', categoria: 'graos' },
      })
    })

    it('nao envia categoria "todos"', async () => {
      api.get.mockResolvedValue({ data: { content: [] } })

      await produtoService.listar({ categoria: 'todos' })

      expect(api.get.mock.calls[0][1].params).not.toHaveProperty('categoria')
    })

    it('devolve a resposta do backend', async () => {
      const pagina = { content: [{ id: 1 }], totalElements: 1, totalPages: 1 }
      api.get.mockResolvedValue({ data: pagina })

      await expect(produtoService.listar()).resolves.toBe(pagina)
    })

    it('sem conexao devolve todos os produtos locais', async () => {
      api.get.mockRejectedValue(new Error('Network Error'))

      const resultado = await produtoService.listar()

      expect(resultado.content).toEqual(PRODUCTS)
      expect(resultado.totalElements).toBe(PRODUCTS.length)
      expect(resultado.totalPages).toBe(1)
    })

    it('sem conexao filtra os produtos locais por nome, sem diferenciar maiusculas', async () => {
      api.get.mockRejectedValue(new Error('Network Error'))
      const nome = PRODUCTS[0].name.toUpperCase()

      const resultado = await produtoService.listar({ nome })

      expect(resultado.content.length).toBeGreaterThan(0)
      expect(resultado.content.every((p) => p.name.toLowerCase().includes(nome.toLowerCase()))).toBe(true)
    })

    it('sem conexao filtra os produtos locais por categoria', async () => {
      api.get.mockRejectedValue(new Error('Network Error'))
      const categoria = PRODUCTS[0].category

      const resultado = await produtoService.listar({ categoria })

      expect(resultado.content.length).toBeGreaterThan(0)
      expect(resultado.content.every((p) => p.category === categoria)).toBe(true)
    })

    it('sem conexao devolve lista vazia quando nada corresponde ao filtro', async () => {
      api.get.mockRejectedValue(new Error('Network Error'))

      const resultado = await produtoService.listar({ nome: 'produto-que-nao-existe-xyz' })

      expect(resultado).toEqual({ content: [], totalElements: 0, totalPages: 1 })
    })

    it('relanca erros vindos do servidor', async () => {
      const erro = Object.assign(new Error('falha'), { response: { status: 500 } })
      api.get.mockRejectedValue(erro)

      await expect(produtoService.listar()).rejects.toBe(erro)
    })
  })

  it('criar envia o produto e devolve o criado', async () => {
    api.post.mockResolvedValue({ data: { id: 5 } })

    await expect(produtoService.criar({ nome: 'Novo' })).resolves.toEqual({ id: 5 })
    expect(api.post).toHaveBeenCalledWith('/produtos', { nome: 'Novo' })
  })

  it('atualizar envia os dados para o produto informado', async () => {
    api.put.mockResolvedValue({ data: { id: 5, nome: 'Editado' } })

    await expect(produtoService.atualizar(5, { nome: 'Editado' })).resolves.toEqual({ id: 5, nome: 'Editado' })
    expect(api.put).toHaveBeenCalledWith('/produtos/5', { nome: 'Editado' })
  })

  it('remover exclui o produto informado', async () => {
    api.delete.mockResolvedValue({})

    await expect(produtoService.remover(5)).resolves.toBeUndefined()
    expect(api.delete).toHaveBeenCalledWith('/produtos/5')
  })
})
