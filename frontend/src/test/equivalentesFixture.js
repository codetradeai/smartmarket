// Fixture pequena de equivalentes entre redes, no formato de src/data/equivalentes.json.
// Cada item do catálogo tem preço de uma rede só; os grupos ligam itens de redes diferentes.
export const CATALOGO = [
  { id: 'p10', name: 'Iogurte Nestlé Natural Desnatado 160g', brand: 'Nestlé', unit: '160g', prices: { asun: 3.49 } },
  { id: 'p11', name: 'Iogurte Natural Desnatado Nestlé 160 g', brand: 'Nestlé', unit: '160g', prices: { fort: 2.99 } },
  { id: 'p12', name: 'Iogurte Nestlé Natural 160g', brand: 'Nestlé', unit: '160g', prices: { zaffari: 3.19 } },
  { id: 'p14', name: 'Iogurte Natural Nestlé 170g', brand: 'Nestlé', unit: '170g', prices: { rissul: 2.89 } },
  { id: 'p20', name: 'Arroz Tipo 1 Camil 5kg', brand: 'Camil', unit: '5kg', prices: { stok: 24.9 } },
  { id: 'p21', name: 'Arroz Camil Tipo 1 5 kg', brand: 'Camil', unit: '5kg', prices: { rissul: 26.5 } },
  { id: 'p22', name: 'Arroz Camil T1 5kg', brand: 'Camil', unit: '5kg', prices: { fort: 0 } },
  { id: 'p30', name: 'Produto solitário', brand: 'X', unit: '1un', prices: { asun: 9.9 } },
  { id: 'p40', name: 'Feijão Camil 1kg', brand: 'Camil', unit: '1kg', prices: { asun: 8, fort: 9 } },
  { id: 'p41', name: 'Feijão Camil Carioca 1kg', brand: 'Camil', unit: '1kg', prices: { fort: 7.5, master: 8.4 } },
  { id: 'p50', name: 'Sabão em Pó 1kg', brand: 'Omo', unit: '1kg', prices: { master: 15 } },
  { id: 'p51', name: 'Sabão em Pó Omo 1kg', brand: 'Omo', unit: '1kg', prices: { fort: 14 } },
  { id: 'p52', name: 'Sabão Omo em Pó 1 kg', brand: 'Omo', unit: '1kg', prices: { fort: 13 } },
]

export const GRUPOS = [
  { id: 'g1', confianca: 'confirmado', camada: 'T2', itens: ['p10', 'p11'] },
  { id: 'g2', confianca: 'provavel', camada: 'T4', itens: ['p12', 'p14'] },
  { id: 'g3', confianca: 'confirmado', camada: 'T1', itens: ['p20', 'p21', 'p22'] },
  { id: 'g4', confianca: 'confirmado', camada: 'T3', itens: ['p40', 'p41'] },
  { id: 'g5', confianca: 'confirmado', camada: 'T1', itens: ['p50', 'p51', 'p52', 'p999'] },
]
