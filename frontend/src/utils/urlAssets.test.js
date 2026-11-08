describe('urlAssets', () => {
  const original = process.env.VITE_ASSETS_BASE_URL

  afterEach(() => {
    if (original === undefined) delete process.env.VITE_ASSETS_BASE_URL
    else process.env.VITE_ASSETS_BASE_URL = original
    jest.resetModules()
  })

  it('sem VITE_ASSETS_BASE_URL devolve o caminho local e o mesmo objeto', () => {
    delete process.env.VITE_ASSETS_BASE_URL
    const { urlAsset, reescreverUrlsDeAssets } = require('./urlAssets')
    const produto = { imageLocal: '/images/produtos/a.webp' }
    expect(urlAsset('/images/produtos/a.webp')).toBe('/images/produtos/a.webp')
    expect(reescreverUrlsDeAssets(produto)).toBe(produto)
  })

  it('com a base definida, prefixa só os caminhos de /images/produtos/ e ignora barra final', () => {
    process.env.VITE_ASSETS_BASE_URL = 'https://bucket.exemplo/smartmarket-assets/'
    const { urlAsset } = require('./urlAssets')
    expect(urlAsset('/images/produtos/a.webp')).toBe('https://bucket.exemplo/smartmarket-assets/images/produtos/a.webp')
    expect(urlAsset('/images/logo.svg')).toBe('/images/logo.svg')
    expect(urlAsset('https://cdn.outro/x.jpg')).toBe('https://cdn.outro/x.jpg')
    expect(urlAsset(undefined)).toBeUndefined()
  })

  it('reescreve em profundidade (listas e objetos) sem mutar o original', () => {
    process.env.VITE_ASSETS_BASE_URL = 'https://b/x'
    const { reescreverUrlsDeAssets } = require('./urlAssets')
    const original = {
      id: 'p1',
      preco: 9.9,
      nulo: null,
      imageLocal: '/images/produtos/a.webp',
      imagensAdicionais: ['/images/produtos/galeria/1/f.webp'],
      recursosVisuais: { frames360: ['/images/produtos/360/1/f0.webp'], tem360: true },
    }
    const novo = reescreverUrlsDeAssets(original)
    expect(novo).toEqual({
      id: 'p1',
      preco: 9.9,
      nulo: null,
      imageLocal: 'https://b/x/images/produtos/a.webp',
      imagensAdicionais: ['https://b/x/images/produtos/galeria/1/f.webp'],
      recursosVisuais: { frames360: ['https://b/x/images/produtos/360/1/f0.webp'], tem360: true },
    })
    expect(original.imageLocal).toBe('/images/produtos/a.webp')
  })
})

describe('urlPublica', () => {
  const original = process.env.BASE_URL

  afterEach(() => {
    if (original === undefined) delete process.env.BASE_URL
    else process.env.BASE_URL = original
    jest.resetModules()
  })

  it('sem BASE_URL (ou na raiz) não altera o caminho', () => {
    delete process.env.BASE_URL
    expect(require('./urlAssets').urlPublica('/video/hero.mp4')).toBe('/video/hero.mp4')
    jest.resetModules()
    process.env.BASE_URL = '/'
    expect(require('./urlAssets').urlPublica('/video/hero.mp4')).toBe('/video/hero.mp4')
  })

  it('com base de subpasta prefixa caminhos absolutos e ignora URLs completas', () => {
    process.env.BASE_URL = '/smartmarket/'
    const { urlPublica } = require('./urlAssets')
    expect(urlPublica('/images/categorias/a.png')).toBe('/smartmarket/images/categorias/a.png')
    expect(urlPublica('/auth?mode=login')).toBe('/smartmarket/auth?mode=login')
    expect(urlPublica('https://cdn/x.png')).toBe('https://cdn/x.png')
    expect(urlPublica(undefined)).toBeUndefined()
  })
})
