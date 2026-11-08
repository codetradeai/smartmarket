import { calcularTotais, chaveDeAnuncio, contarGruposConfirmados } from './totaisCatalogo'

const anuncio = (id, rede, idOrigem, prices = { fort: 1 }) => ({ id, supermercadoOrigem: rede, idOrigem, prices })

describe('chaveDeAnuncio', () => {
  it('é rede + id de origem: o mesmo id em redes diferentes são anúncios diferentes', () => {
    expect(chaveDeAnuncio(anuncio('p1', 'Master', '754'))).not.toBe(chaveDeAnuncio(anuncio('p2', 'Stok Center', '754')))
    expect(chaveDeAnuncio(anuncio('p1', 'Master', '754'))).toBe(chaveDeAnuncio(anuncio('p9', 'Master', '754')))
  })

  it('sem rede ou sem id de origem cai no id do catálogo, para não juntar itens diferentes', () => {
    expect(chaveDeAnuncio({ id: 'p1', prices: {} })).toBe('catalogo|p1')
    expect(chaveDeAnuncio({ id: 'p2', supermercadoOrigem: 'Fort', idOrigem: '' })).toBe('catalogo|p2')
  })
})

describe('contarGruposConfirmados', () => {
  const grupo = (confianca, itens) => ({ id: 'g', confianca, camada: 'T1', itens })

  it('é 0 quando o arquivo de equivalentes não existe', () => {
    expect(contarGruposConfirmados(null)).toBe(0)
    expect(contarGruposConfirmados(undefined)).toBe(0)
    expect(contarGruposConfirmados({})).toBe(0)
    expect(contarGruposConfirmados({ grupos: 'quebrado' })).toBe(0)
  })

  it('conta só os grupos confirmados: o provável nunca entra no número', () => {
    const eq = { versao: 'x', grupos: [grupo('confirmado', ['p1', 'p2']), grupo('provavel', ['p3', 'p4']), grupo('confirmado', ['p5', 'p6', 'p7'])] }
    expect(contarGruposConfirmados(eq)).toBe(2)
  })

  it('ignora grupo confirmado com menos de 2 itens', () => {
    expect(contarGruposConfirmados({ grupos: [grupo('confirmado', ['p1']), grupo('confirmado', [])] })).toBe(0)
  })
})

describe('calcularTotais', () => {
  const produtos = [
    anuncio('p1', 'Fort', '10'),
    anuncio('p2', 'Fort', '10'), // cópia: mesmo anúncio
    anuncio('p3', 'Asun', '10'),
    anuncio('p4', 'Asun', '20', {}), // sem preço
    anuncio('p5', 'Asun', '30', { asun: 5, fort: 6 }), // dois preços no mesmo objeto NÃO é produto em 2 redes
  ]

  it('conta anúncios por rede + id de origem, não ids de catálogo', () => {
    const t = calcularTotais(produtos)
    expect(t.idsDeCatalogo).toBe(5)
    expect(t.anuncios).toBe(4)
    expect(t.anunciosComPreco).toBe(3)
  })

  it('não usa mais o nome produtosDistintos para o que é contagem de anúncios', () => {
    expect(calcularTotais(produtos)).not.toHaveProperty('produtosDistintos')
    expect(calcularTotais(produtos)).not.toHaveProperty('produtosComPreco')
  })

  it('produtos em 2+ redes vêm dos grupos confirmados, e é 0 sem equivalentes (mesmo com 2 preços no objeto)', () => {
    expect(calcularTotais(produtos).produtosEm2Redes).toBe(0)
    const eq = { grupos: [{ confianca: 'confirmado', itens: ['p1', 'p3'] }, { confianca: 'provavel', itens: ['p4', 'p5'] }] }
    expect(calcularTotais(produtos, eq).produtosEm2Redes).toBe(1)
  })
})
