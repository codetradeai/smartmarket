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

  it('frames só são baixados em carregarFrames, uma vez, e [] para produto sem frames', async () => {
    global.fetch = jest.fn(async () => resposta({ p1: ['a.webp', 'b.webp'] }))
    const { carregarProdutos, carregarFrames } = require('./carregarProdutos')

    global.fetch = jest.fn(async (url) => resposta(url.endsWith('frames.json') ? { p1: ['a.webp', 'b.webp'] } : []))
    await carregarProdutos()
    expect(global.fetch).not.toHaveBeenCalledWith('/catalogo/frames.json')

    await expect(carregarFrames('p1')).resolves.toEqual(['a.webp', 'b.webp'])
    await expect(carregarFrames('p2')).resolves.toEqual([])
    expect(global.fetch.mock.calls.filter(([u]) => u === '/catalogo/frames.json')).toHaveLength(1)
  })

  it('se frames.json falhar, rejeita e a chamada seguinte tenta de novo', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(resposta(null, 404)).mockResolvedValueOnce(resposta({ p1: ['x', 'y'] }))
    const { carregarFrames } = require('./carregarProdutos')

    await expect(carregarFrames('p1')).rejects.toThrow('HTTP 404')
    await expect(carregarFrames('p1')).resolves.toEqual(['x', 'y'])
  })
})
