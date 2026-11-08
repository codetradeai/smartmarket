const resposta = (corpo, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => corpo,
})

describe('carregarProdutos / carregarFrames', () => {
  const guardadas = {
    catalogo: process.env.VITE_CATALOGO_URL,
    assets: process.env.VITE_ASSETS_BASE_URL,
  }
  let fetchOriginal

  beforeEach(() => {
    delete process.env.VITE_CATALOGO_URL
    delete process.env.VITE_ASSETS_BASE_URL
    delete process.env.BASE_URL
    jest.resetModules()
    fetchOriginal = global.fetch
  })

  afterEach(() => {
    for (const [chave, valor] of [
      ['VITE_CATALOGO_URL', guardadas.catalogo],
      ['VITE_ASSETS_BASE_URL', guardadas.assets],
    ]) {
      if (valor === undefined) delete process.env[chave]
      else process.env[chave] = valor
    }
    global.fetch = fetchOriginal
    delete process.env.BASE_URL
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
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(resposta(null, 500))
      .mockResolvedValueOnce(resposta([{ id: 'p9' }]))
    const { carregarProdutos } = require('./carregarProdutos')

    await expect(carregarProdutos()).rejects.toThrow('HTTP 500')
    await expect(carregarProdutos()).resolves.toEqual([{ id: 'p9' }])
  })

  it('frames: um fetch por produto, só em carregarFrames, com cache por id', async () => {
    global.fetch = jest.fn(async (url) =>
      resposta(
        url === '/catalogo/frames/p1.json'
          ? ['a.webp', 'b.webp']
          : url === '/catalogo/frames/p2.json'
            ? []
            : [{ id: 'p1' }],
      ),
    )
    const { carregarProdutos, carregarFrames } = require('./carregarProdutos')

    await carregarProdutos()
    expect(global.fetch.mock.calls.map(([u]) => u)).toEqual(['/catalogo/produtos.json'])

    await expect(carregarFrames('p1')).resolves.toEqual(['a.webp', 'b.webp'])
    await expect(carregarFrames('p1')).resolves.toEqual(['a.webp', 'b.webp'])
    await expect(carregarFrames('p2')).resolves.toEqual([])
    expect(
      global.fetch.mock.calls.map(([u]) => u).filter((u) => u.includes('frames')),
    ).toEqual(['/catalogo/frames/p1.json', '/catalogo/frames/p2.json'])
  })

  it('se o JSON de frames falhar, rejeita e a chamada seguinte tenta de novo', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(resposta(null, 404))
      .mockResolvedValueOnce(resposta(['x', 'y']))
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

  it('com base de subpasta (GitHub Pages) o catálogo e os frames respeitam a base', async () => {
    process.env.BASE_URL = '/smartmarket/'
    global.fetch = jest.fn(async () => resposta([]))
    const { carregarProdutos, carregarFrames, URL_PRODUTOS, urlFrames } = require('./carregarProdutos')

    expect(URL_PRODUTOS).toBe('/smartmarket/catalogo/produtos.json')
    expect(urlFrames('p1')).toBe('/smartmarket/catalogo/frames/p1.json')
    await carregarProdutos()
    await carregarFrames('p1')
    expect(global.fetch.mock.calls.map(([u]) => u)).toEqual([
      '/smartmarket/catalogo/produtos.json',
      '/smartmarket/catalogo/frames/p1.json',
    ])
  })

  it('com base de subpasta e versão injetada, o hash vem depois da base', () => {
    process.env.BASE_URL = '/smartmarket/'
    global.__CATALOGO_VERSAO__ = 'abc123def4'
    try {
      const { URL_PRODUTOS, urlFrames } = require('./carregarProdutos')
      expect(URL_PRODUTOS).toBe('/smartmarket/catalogo/produtos.abc123def4.json')
      expect(urlFrames('p5')).toBe('/smartmarket/catalogo/frames/abc123def4/p5.json')
    } finally {
      delete global.__CATALOGO_VERSAO__
    }
  })

  it('VITE_CATALOGO_URL absoluta não recebe a base do app', async () => {
    process.env.BASE_URL = '/smartmarket/'
    process.env.VITE_CATALOGO_URL = 'https://bucket.exemplo/catalogo/produtos.json'
    global.fetch = jest.fn().mockResolvedValue(resposta([{ id: 'p1' }]))
    const { carregarProdutos } = require('./carregarProdutos')

    await carregarProdutos()
    expect(global.fetch).toHaveBeenCalledWith('https://bucket.exemplo/catalogo/produtos.json')
  })

  it('com VITE_CATALOGO_URL baixa o JSON do bucket e não usa o data.js', async () => {
    process.env.VITE_CATALOGO_URL = 'https://bucket.exemplo/smartmarket-assets/catalogo/produtos.json'
    global.fetch = jest.fn().mockResolvedValue(resposta([{ id: 'p1' }]))
    const { carregarProdutos } = require('./carregarProdutos')

    await expect(carregarProdutos()).resolves.toEqual([{ id: 'p1' }])
    expect(global.fetch).toHaveBeenCalledWith(
      'https://bucket.exemplo/smartmarket-assets/catalogo/produtos.json',
    )
  })

  it('com o catálogo remoto, reescreve as fotos para o bucket quando VITE_ASSETS_BASE_URL existe', async () => {
    process.env.VITE_CATALOGO_URL = 'https://b/c.json'
    process.env.VITE_ASSETS_BASE_URL = 'https://b/assets'
    global.fetch = jest
      .fn()
      .mockResolvedValue(resposta([{ id: 'p1', imageLocal: '/images/produtos/a.webp' }]))
    const { carregarProdutos } = require('./carregarProdutos')

    await expect(carregarProdutos()).resolves.toEqual([
      { id: 'p1', imageLocal: 'https://b/assets/images/produtos/a.webp' },
    ])
  })

  it('HTTP de erro no catálogo remoto rejeita e permite nova tentativa', async () => {
    process.env.VITE_CATALOGO_URL = 'https://b/c.json'
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(resposta([{ id: 'ok' }]))
    const { carregarProdutos } = require('./carregarProdutos')

    await expect(carregarProdutos()).rejects.toThrow('HTTP 503')
    await expect(carregarProdutos()).resolves.toEqual([{ id: 'ok' }])
  })
})
