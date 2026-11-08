import { totaisHonestos } from './totaisDoCatalogo'

const GRUPOS = [
  { id: 'g1', confianca: 'confirmado', camada: 'T1', itens: ['p1', 'p2'] },
  { id: 'g2', confianca: 'provavel', camada: 'T4', itens: ['p3', 'p4'] },
  { id: 'g3', confianca: 'confirmado', camada: 'T2', itens: ['p5', 'p6', 'p7'] },
]

describe('totaisHonestos', () => {
  it('usa o campo novo "anuncios" quando o resumo já o tem', () => {
    const t = totaisHonestos({ anuncios: 9277, produtosDistintos: 1, produtosComPreco: 9000, produtosEm2Redes: 0 }, [])
    expect(t.anuncios).toBe(9277)
  })

  it('cai no nome antigo "produtosDistintos" quando o resumo ainda não foi renomeado', () => {
    const t = totaisHonestos({ produtosDistintos: 9277, produtosComPreco: 9000, produtosEm2Redes: 0 }, [])
    expect(t.anuncios).toBe(9277)
    expect(t.anunciosComPreco).toBe(9000)
  })

  it('aceita "anunciosComPreco" quando existir', () => {
    expect(totaisHonestos({ anuncios: 10, anunciosComPreco: 8, produtosComPreco: 1 }, []).anunciosComPreco).toBe(8)
  })

  it('produtos em 2+ redes somam os itens com 2 preços e os grupos confirmados (provável não conta)', () => {
    const t = totaisHonestos({ anuncios: 10, produtosComPreco: 10, produtosEm2Redes: 3 }, GRUPOS)
    expect(t.produtosEm2Redes).toBe(5)
  })

  it('sem nada devolve zeros em vez de NaN', () => {
    expect(totaisHonestos(undefined, [])).toEqual({ anuncios: 0, anunciosComPreco: 0, produtosEm2Redes: 0 })
  })

  it('por padrão lê os grupos do arquivo de equivalentes (hoje vazio: não soma nada)', () => {
    expect(totaisHonestos({ anuncios: 5, produtosComPreco: 5, produtosEm2Redes: 2 }).produtosEm2Redes).toBeGreaterThanOrEqual(2)
  })
})
