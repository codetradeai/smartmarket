import { mesclarCatalogo } from './mesclarCatalogo'

// O catálogo local (data.js) usa ids "p<id>"; a API devolve o mesmo produto com id numérico (Long).
const LOCAIS = [
  { id: 'p1', name: 'Arroz local', prices: { fort: 20 } },
  { id: 'p2', name: 'Feijão local', prices: { fort: 8 } },
]

describe('mesclarCatalogo', () => {
  it('produto da API com id numérico que existe no catálogo local vira um item só, com o id local', () => {
    const api = [{ id: 1, name: 'Arroz da API', prices: { 1: 21.5 } }]

    const resultado = mesclarCatalogo(LOCAIS, api)

    expect(resultado).toHaveLength(2)
    expect(resultado[0]).toMatchObject({ id: 'p1', name: 'Arroz da API', prices: { 1: 21.5 }, apiId: 1 })
    expect(resultado[1]).toEqual(LOCAIS[1])
  })

  it('produto que só existe na API entra no fim da lista com o id da API', () => {
    const api = [{ id: 10, name: 'Leite só da API', prices: { 1: 4.5 } }]

    const resultado = mesclarCatalogo(LOCAIS, api)

    expect(resultado.map((p) => p.id)).toEqual(['p1', 'p2', 10])
  })

  it('id da API que já é igual ao id local (texto) continua enriquecendo o item local', () => {
    const api = [{ id: 'p2', name: 'Feijão da API', prices: { 1: 9 } }]

    const resultado = mesclarCatalogo(LOCAIS, api)

    expect(resultado).toHaveLength(2)
    expect(resultado[1]).toMatchObject({ id: 'p2', name: 'Feijão da API' })
  })

  it('sem produtos na API devolve o catálogo local intacto', () => {
    expect(mesclarCatalogo(LOCAIS, [])).toEqual(LOCAIS)
    expect(mesclarCatalogo(LOCAIS, null)).toEqual(LOCAIS)
  })

  it('não altera as listas recebidas', () => {
    const api = [{ id: 1, name: 'Arroz da API', prices: {} }]
    const locaisAntes = JSON.stringify(LOCAIS)

    mesclarCatalogo(LOCAIS, api)

    expect(JSON.stringify(LOCAIS)).toBe(locaisAntes)
    expect(api[0].id).toBe(1)
  })
})
