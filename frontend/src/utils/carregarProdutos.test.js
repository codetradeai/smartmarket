describe('carregarProdutos', () => {
  afterEach(() => {
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
})
