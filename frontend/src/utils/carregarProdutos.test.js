const resposta = (corpo, status = 200) => ({ ok: status === 200, status, json: async () => corpo })

describe('carregarProdutos / carregarFrames', () => {
  let fetchOriginal
  beforeEach(() => {
    jest.resetModules()
    fetchOriginal = global.fetch
  })
  afterEach(() => {
    global.fetch = fetchOriginal
  })

  it('carrega produtos.json por fetch e reaproveita a mesma promessa', async () => {
    global.fetch = jest.fn(async () => resposta([{ id: 'p1' }, { id: 'p2' }]))
    const { carregarProdutos } = require('./carregarProdutos')

    const primeira = carregarProdutos()
    expect(carregarProdutos()).toBe(primeira)
    await expect(primeira).resolves.toEqual([{ id: 'p1' }, { id: 'p2' }])
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith('/catalogo/produtos.json')
  })

  it('se a carga falhar (HTTP ou rede), rejeita e a chamada seguinte tenta de novo', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(resposta(null, 500)).mockResolvedValueOnce(resposta([{ id: 'p9' }]))
    const { carregarProdutos } = require('./carregarProdutos')

    await expect(carregarProdutos()).rejects.toThrow('HTTP 500')
    await expect(carregarProdutos()).resolves.toEqual([{ id: 'p9' }])
  })

  it('frames: um fetch por produto, só em carregarFrames, com cache por id', async () => {
    global.fetch = jest.fn(async (url) =>
      resposta(url === '/catalogo/frames/p1.json' ? ['a.webp', 'b.webp'] : url === '/catalogo/frames/p2.json' ? [] : [{ id: 'p1' }]),
    )
    const { carregarProdutos, carregarFrames } = require('./carregarProdutos')

    await carregarProdutos()
    expect(global.fetch.mock.calls.map(([u]) => u)).toEqual(['/catalogo/produtos.json'])

    await expect(carregarFrames('p1')).resolves.toEqual(['a.webp', 'b.webp'])
    await expect(carregarFrames('p1')).resolves.toEqual(['a.webp', 'b.webp'])
    await expect(carregarFrames('p2')).resolves.toEqual([])
    expect(global.fetch.mock.calls.map(([u]) => u).filter((u) => u.includes('frames'))).toEqual([
      '/catalogo/frames/p1.json',
      '/catalogo/frames/p2.json',
    ])
  })

  it('se o JSON de frames falhar, rejeita e a chamada seguinte tenta de novo', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(resposta(null, 404)).mockResolvedValueOnce(resposta(['x', 'y']))
    const { carregarFrames } = require('./carregarProdutos')

    await expect(carregarFrames('p1')).rejects.toThrow('HTTP 404')
    await expect(carregarFrames('p1')).resolves.toEqual(['x', 'y'])
  })

  it('com versão injetada pelo Vite, as URLs levam o hash no caminho', () => {
    global.__CATALOGO_VERSAO__ = 'abc123def4'
    try {
      const { URL_PRODUTOS, urlFrames } = require('./carregarProdutos')
      expect(URL_PRODUTOS).toBe('/catalogo/produtos.abc123def4.json')
      expect(urlFrames('p5')).toBe('/catalogo/frames/abc123def4/p5.json')
    } finally {
      delete global.__CATALOGO_VERSAO__
    }
  })
})
