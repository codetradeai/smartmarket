import fs from 'fs'
import path from 'path'
import { CATALOGO, GRUPOS } from '../test/equivalentesFixture'
import dados from '../data/equivalentes.json'
import { indexarGrupos, equivalentesDe, precosPorRede, entradaDaRede } from './equivalentes'

const prod = (id) => CATALOGO.find((p) => p.id === id)

describe('indexarGrupos', () => {
  it('mapeia cada id de item para o seu grupo', () => {
    const indice = indexarGrupos(GRUPOS)
    expect(indice.get('p10').id).toBe('g1')
    expect(indice.get('p11').id).toBe('g1')
    expect(indice.get('p14').id).toBe('g2')
    expect(indice.get('p30')).toBeUndefined()
  })

  it('devolve índice vazio para entrada inválida', () => {
    expect(indexarGrupos(undefined).size).toBe(0)
    expect(indexarGrupos(null).size).toBe(0)
  })
})

describe('equivalentesDe', () => {
  it('devolve os outros itens do grupo com confiança e camada, sem o próprio item', () => {
    const r = equivalentesDe(prod('p10'), CATALOGO, GRUPOS)
    expect(r).toEqual([{ produto: prod('p11'), confianca: 'confirmado', camada: 'T2', grupoId: 'g1' }])
  })

  it('é simétrico: o outro lado do grupo enxerga o primeiro', () => {
    const r = equivalentesDe(prod('p11'), CATALOGO, GRUPOS)
    expect(r.map((e) => e.produto.id)).toEqual(['p10'])
  })

  it('marca como provavel os grupos provaveis', () => {
    const r = equivalentesDe(prod('p12'), CATALOGO, GRUPOS)
    expect(r).toEqual([{ produto: prod('p14'), confianca: 'provavel', camada: 'T4', grupoId: 'g2' }])
  })

  it('devolve vazio para produto sem grupo, nulo ou sem id', () => {
    expect(equivalentesDe(prod('p30'), CATALOGO, GRUPOS)).toEqual([])
    expect(equivalentesDe(null, CATALOGO, GRUPOS)).toEqual([])
    expect(equivalentesDe({ name: 'sem id' }, CATALOGO, GRUPOS)).toEqual([])
  })

  it('ignora ids do grupo que não existem no catálogo carregado', () => {
    const r = equivalentesDe(prod('p50'), CATALOGO, GRUPOS)
    expect(r.map((e) => e.produto.id)).toEqual(['p51', 'p52'])
  })

  it('aceita o catálogo como Map de id para produto', () => {
    const mapa = new Map(CATALOGO.map((p) => [p.id, p]))
    expect(equivalentesDe(prod('p10'), mapa, GRUPOS).map((e) => e.produto.id)).toEqual(['p11'])
  })

  it('sem catálogo, não quebra e devolve vazio', () => {
    expect(equivalentesDe(prod('p10'), undefined, GRUPOS)).toEqual([])
  })

  it('o arquivo inicial de equivalentes não liga nada (comportamento atual preservado)', () => {
    expect(equivalentesDe(prod('p10'), CATALOGO)).toEqual([])
  })
})

describe('precosPorRede', () => {
  it('une o preço do item (próprio) com o do equivalente confirmado, que conta para o menor preço', () => {
    const r = precosPorRede(prod('p10'), CATALOGO, GRUPOS)
    expect(r.asun).toMatchObject({ preco: 3.49, confianca: 'proprio', contaParaMenorPreco: true })
    expect(r.asun.produto.id).toBe('p10')
    expect(r.fort).toMatchObject({ preco: 2.99, confianca: 'confirmado', camada: 'T2', contaParaMenorPreco: true })
    expect(r.fort.produto.id).toBe('p11')
    expect(Object.keys(r).sort()).toEqual(['asun', 'fort'])
  })

  it('equivalente provavel aparece, mas não conta para o menor preço', () => {
    const r = precosPorRede(prod('p12'), CATALOGO, GRUPOS)
    expect(r.zaffari.contaParaMenorPreco).toBe(true)
    expect(r.rissul).toMatchObject({ preco: 2.89, confianca: 'provavel', camada: 'T4', contaParaMenorPreco: false })
  })

  it('sem equivalentes devolve só os preços do próprio item', () => {
    const r = precosPorRede(prod('p30'), CATALOGO, GRUPOS)
    expect(Object.keys(r)).toEqual(['asun'])
    expect(r.asun.confianca).toBe('proprio')
  })

  it('ignora equivalente sem preço válido (0, nulo)', () => {
    const r = precosPorRede(prod('p20'), CATALOGO, GRUPOS)
    expect(Object.keys(r).sort()).toEqual(['rissul', 'stok'])
  })

  it('o preço do próprio item vence um equivalente da mesma rede', () => {
    const r = precosPorRede(prod('p40'), CATALOGO, GRUPOS)
    expect(r.fort).toMatchObject({ preco: 9, confianca: 'proprio' })
    expect(r.fort.produto.id).toBe('p40')
    expect(r.master).toMatchObject({ preco: 8.4, confianca: 'confirmado' })
    expect(r.master.produto.id).toBe('p41')
  })

  it('com dois equivalentes na mesma rede fica o de menor preço', () => {
    const r = precosPorRede(prod('p50'), CATALOGO, GRUPOS)
    expect(r.fort.preco).toBe(13)
    expect(r.fort.produto.id).toBe('p52')
  })

  it('produto nulo ou sem preços devolve objeto vazio', () => {
    expect(precosPorRede(null, CATALOGO, GRUPOS)).toEqual({})
    expect(precosPorRede({ id: 'p30x' }, CATALOGO, GRUPOS)).toEqual({})
  })
})

describe('entradaDaRede', () => {
  const porRede = { fort: { preco: 1 }, 'asun supermercados': { preco: 2 } }
  it('acha pelo id da rede', () => {
    expect(entradaDaRede(porRede, { id: 'fort', name: 'Fort Atacadista' })).toEqual({ preco: 1 })
  })
  it('acha pelo nome em minúsculas, como o modal já fazia', () => {
    expect(entradaDaRede(porRede, { id: 'asun', name: 'Asun Supermercados' })).toEqual({ preco: 2 })
  })
  it('devolve null quando não há entrada', () => {
    expect(entradaDaRede(porRede, { id: 'stok', name: 'Stok Center' })).toBeNull()
    expect(entradaDaRede(null, { id: 'stok' })).toBeNull()
  })
})

describe('contrato de src/data/equivalentes.json', () => {
  it('tem versão e lista de grupos', () => {
    expect(typeof dados.versao).toBe('string')
    expect(Array.isArray(dados.grupos)).toBe(true)
  })

  it('cada grupo tem 2+ itens "p<N>", confiança e camada válidas; nenhum id repete', () => {
    const vistos = new Set()
    for (const g of dados.grupos) {
      expect(['confirmado', 'provavel']).toContain(g.confianca)
      expect(['T0', 'T1', 'T2', 'T3', 'T4']).toContain(g.camada)
      expect(g.itens.length).toBeGreaterThanOrEqual(2)
      for (const id of g.itens) {
        expect(id).toMatch(/^p\d+$/)
        expect(vistos.has(id)).toBe(false)
        vistos.add(id)
      }
    }
  })

  it('os itens existem no data.js e cada grupo junta redes diferentes', () => {
    if (dados.grupos.length === 0) return
    const fonte = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8')
    const d = {}
    new Function('exports', fonte.replace(/export const (\w+)/g, 'const $1 = exports.$1'))(d)
    const porId = new Map(d.PRODUCTS.map((p) => [p.id, p]))
    for (const g of dados.grupos) {
      const redes = []
      for (const id of g.itens) {
        const p = porId.get(id)
        expect(p).toBeDefined()
        redes.push(p.supermercadoOrigem)
      }
      expect(new Set(redes).size).toBe(redes.length)
    }
  })
})
