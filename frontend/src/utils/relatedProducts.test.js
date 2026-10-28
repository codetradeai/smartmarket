import { describe, it, expect } from 'vitest'
import { getRelatedProducts, getLowestPrice, normalizeUnit, isValidBrand } from './relatedProducts'

describe('relatedProducts - Algoritmo de Produtos Relacionados (Fase 4)', () => {
  describe('getLowestPrice', () => {
    it('retorna o menor preço válido dentre as redes', () => {
      const prod = {
        prices: { asun: 24.9, stok: 21.5, zaffari: 25.0 }
      }
      expect(getLowestPrice(prod)).toBe(21.5)
    })

    it('ignora preços nulos, negativos, zero e strings não numéricas', () => {
      const prod = {
        prices: { asun: 0, stok: -10, zaffari: null, atacadao: 'invalido', rissul: 15.9 }
      }
      expect(getLowestPrice(prod)).toBe(15.9)
    })

    it('retorna null se não houver nenhum preço válido', () => {
      const prod = {
        prices: { asun: 0, stok: null }
      }
      expect(getLowestPrice(prod)).toBeNull()
    })

    it('retorna null para produto sem campo prices ou formato incorreto', () => {
      expect(getLowestPrice(null)).toBeNull()
      expect(getLowestPrice({})).toBeNull()
      expect(getLowestPrice({ prices: 'grátis' })).toBeNull()
    })
  })

  describe('normalizeUnit e isValidBrand', () => {
    it('normaliza unidades com espaços e vírgulas', () => {
      expect(normalizeUnit(' 500 g ')).toBe('500g')
      expect(normalizeUnit('1,5 l')).toBe('1.5l')
      expect(normalizeUnit(null)).toBe('')
    })

    it('identifica marcas genéricas como inválidas para agrupamento de marca', () => {
      expect(isValidBrand('Melitta')).toBe(true)
      expect(isValidBrand('Geral')).toBe(false)
      expect(isValidBrand('Açougue')).toBe(false)
      expect(isValidBrand('')).toBe(false)
      expect(isValidBrand(null)).toBe(false)
    })
  })

  describe('getRelatedProducts', () => {
    const catalogoExemplo = [
      {
        id: 'p1',
        name: 'Café em pó Melitta Tradicional 500g',
        category: 'cafe',
        brand: 'Melitta',
        unit: '500g',
        prices: { asun: 24.9, stok: 22.0 }
      },
      {
        id: 'p2',
        name: 'Café em pó Melitta Tradicional 250g',
        category: 'cafe',
        brand: 'Melitta',
        unit: '250g',
        prices: { asun: 17.9, stok: 16.5 }
      },
      {
        id: 'p3',
        name: 'Café Torrado e Moído União 500g',
        category: 'cafe',
        brand: 'União',
        unit: '500g',
        prices: { asun: 21.0, stok: 19.9 }
      },
      {
        id: 'p4',
        name: 'Café a Vácuo Bom Jesus 500g',
        category: 'cafe',
        brand: 'Bom Jesus',
        unit: '500g',
        prices: { asun: 23.0, stok: 18.5 }
      },
      {
        id: 'p5',
        name: 'Arroz Branco Tio João 1kg',
        category: 'graos',
        brand: 'Tio João',
        unit: '1kg',
        prices: { asun: 6.9, stok: 5.9 }
      },
      {
        id: 'p6',
        name: 'Café em pó Pilão 500g (Sem preço)',
        category: 'cafe',
        brand: 'Pilão',
        unit: '500g',
        prices: { asun: 0, stok: null }
      }
    ]

    it('retorna alternativas de outras marcas priorizando mesma categoria, mesma unidade e menor preço', () => {
      const current = catalogoExemplo[0] // Melitta 500g
      const res = getRelatedProducts(current, catalogoExemplo)

      expect(res.directAlternatives).toHaveLength(3)
      // O produto atual (p1) NUNCA deve estar nos resultados
      expect(res.directAlternatives.some((p) => p.id === 'p1')).toBe(false)

      // Bom Jesus 500g (menor preço R$ 18.50) e União 500g (R$ 19.90) devem ser as primeiras alternativas
      expect(res.directAlternatives[0].id).toBe('p4')
      expect(res.directAlternatives[0]._lowestPrice).toBe(18.5)
      expect(res.directAlternatives[1].id).toBe('p3')
      expect(res.directAlternatives[1]._lowestPrice).toBe(19.9)

      // Pilão 500g (sem preço) deve vir por último
      expect(res.directAlternatives[2].id).toBe('p6')
      expect(res.directAlternatives[2]._lowestPrice).toBeNull()

      // Arroz não deve aparecer pois é de categoria diferente
      expect(res.directAlternatives.some((p) => p.category !== 'cafe')).toBe(false)
    })

    it('retorna produtos da mesma marca com exclusão do produto atual', () => {
      const current = catalogoExemplo[0] // Melitta 500g
      const res = getRelatedProducts(current, catalogoExemplo)

      expect(res.brandAlternatives).toHaveLength(1)
      expect(res.brandAlternatives[0].id).toBe('p2') // Melitta 250g
      expect(res.brandAlternatives[0].brand).toBe('Melitta')
      expect(res.brandAlternatives.some((p) => p.id === 'p1')).toBe(false)
    })

    it('não inclui produtos de marcas genéricas em brandAlternatives', () => {
      const prodGenerico = {
        id: 'p99',
        name: 'Carne Moída 1kg',
        category: 'carnes',
        brand: 'Açougue',
        unit: '1kg',
        prices: { asun: 30.0 }
      }
      const lista = [
        prodGenerico,
        { id: 'p100', name: 'Alcatra 1kg', category: 'carnes', brand: 'Açougue', unit: '1kg', prices: { asun: 45.0 } }
      ]

      const res = getRelatedProducts(prodGenerico, lista)
      expect(res.brandAlternatives).toHaveLength(0) // Marca 'Açougue' é genérica
    })

    it('respeita o limite especificado de resultados', () => {
      const current = catalogoExemplo[0]
      const res = getRelatedProducts(current, catalogoExemplo, 1)

      expect(res.directAlternatives).toHaveLength(1)
    })

    it('lida com catálogo vazio ou parâmetros nulos sem lançar erros', () => {
      expect(getRelatedProducts(null, catalogoExemplo)).toEqual({ directAlternatives: [], brandAlternatives: [] })
      expect(getRelatedProducts(catalogoExemplo[0], [])).toEqual({ directAlternatives: [], brandAlternatives: [] })
      expect(getRelatedProducts(catalogoExemplo[0], null)).toEqual({ directAlternatives: [], brandAlternatives: [] })
    })
  })
})
