describe('urlPublica', () => {
  const original = process.env.BASE_URL

  afterEach(() => {
    if (original === undefined) delete process.env.BASE_URL
    else process.env.BASE_URL = original
    jest.resetModules()
  })

  it('sem BASE_URL (ou na raiz) não altera o caminho', () => {
    delete process.env.BASE_URL
    expect(require('./urlPublica').urlPublica('/video/hero.mp4')).toBe('/video/hero.mp4')
    jest.resetModules()
    process.env.BASE_URL = '/'
    expect(require('./urlPublica').urlPublica('/video/hero.mp4')).toBe('/video/hero.mp4')
  })

  it('com base de subpasta prefixa caminhos absolutos e ignora URLs completas', () => {
    process.env.BASE_URL = '/smartmarket/'
    const { urlPublica } = require('./urlPublica')
    expect(urlPublica('/images/categorias/a.png')).toBe('/smartmarket/images/categorias/a.png')
    expect(urlPublica('/auth?mode=login')).toBe('/smartmarket/auth?mode=login')
    expect(urlPublica('https://cdn/x.png')).toBe('https://cdn/x.png')
    expect(urlPublica(undefined)).toBeUndefined()
  })
})
