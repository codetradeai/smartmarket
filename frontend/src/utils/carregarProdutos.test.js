describe('carregarProdutos', () => {
  const guardadas = {
    catalogo: process.env.VITE_CATALOGO_URL,
    assets: process.env.VITE_ASSETS_BASE_URL,
  }

  beforeEach(() => {
    delete process.env.VITE_CATALOGO_URL
    delete process.env.VITE_ASSETS_BASE_URL
  })

  afterEach(() => {
    for (const [chave, valor] of [['VITE_CATALOGO_URL', guardadas.catalogo], ['VITE_ASSETS_BASE_URL', guardadas.assets]]) {
      if (valor === undefined) delete process.env[chave]
      else process.env[chave] = valor
    }
    delete global.fetch
    jest.resetModules()
    jest.dontMock('../data')
  })

  it('carrega PRODUCTS do data.js por import dinâmico e reaproveita a mesma promessa', async () => {
    jest.doMock('../data', () => ({ PRODUCTS: [{ id: 'p1' }, { id: 'p2' }] }))
    const { carregarProdutos } = require('./carregarProdutos')

    const primeira = carregarProdutos()
    expect(carregarProdutos()).toBe(primeira)
    await expect(primeira).resolves.toEqual([{ id: 'p1' }, { id: 'p2' }])
  })

  it('se a carga falhar, rejeita e a chamada seguinte tenta de novo', async () => {
    jest.doMock('../data', () => {
      throw new Error('chunk indisponível')
    })
    const { carregarProdutos } = require('./carregarProdutos')
    await expect(carregarProdutos()).rejects.toThrow('chunk indisponível')

    jest.doMock('../data', () => ({ PRODUCTS: [{ id: 'p9' }] }))
    await expect(carregarProdutos()).resolves.toEqual([{ id: 'p9' }])
  })

  it('com VITE_CATALOGO_URL baixa o JSON do bucket e não usa o data.js', async () => {
    process.env.VITE_CATALOGO_URL = 'https://bucket.exemplo/smartmarket-assets/catalogo/produtos.json'
    const dataJs = jest.fn(() => ({ PRODUCTS: [{ id: 'nao-deve-usar' }] }))
    jest.doMock('../data', dataJs)
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 'p1' }] })
    const { carregarProdutos } = require('./carregarProdutos')

    await expect(carregarProdutos()).resolves.toEqual([{ id: 'p1' }])
    expect(global.fetch).toHaveBeenCalledWith('https://bucket.exemplo/smartmarket-assets/catalogo/produtos.json')
    expect(dataJs).not.toHaveBeenCalled()
  })

  it('com o catálogo remoto, reescreve as fotos para o bucket quando VITE_ASSETS_BASE_URL existe', async () => {
    process.env.VITE_CATALOGO_URL = 'https://b/c.json'
    process.env.VITE_ASSETS_BASE_URL = 'https://b/assets'
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 'p1', imageLocal: '/images/produtos/a.webp' }] })
    const { carregarProdutos } = require('./carregarProdutos')

    await expect(carregarProdutos()).resolves.toEqual([{ id: 'p1', imageLocal: 'https://b/assets/images/produtos/a.webp' }])
  })

  it('HTTP de erro no catálogo remoto rejeita e permite nova tentativa', async () => {
    process.env.VITE_CATALOGO_URL = 'https://b/c.json'
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'ok' }] })
    const { carregarProdutos } = require('./carregarProdutos')

    await expect(carregarProdutos()).rejects.toThrow('HTTP 503')
    await expect(carregarProdutos()).resolves.toEqual([{ id: 'ok' }])
  })
})
