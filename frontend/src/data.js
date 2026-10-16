// Dados realistas baseados na saída do scraper Fort Atacadista
export const CATEGORIES = [
  { id: 'todos', label: 'Todos', icon: '🏪' },
  { id: 'graos', label: 'Grãos, Arroz e Feijão', icon: '🌾' },
  { id: 'leites', label: 'Leites e Derivados', icon: '🥛' },
  { id: 'oleos', label: 'Óleos e Gorduras', icon: '🫙' },
  { id: 'cafe', label: 'Café e Achocolatados', icon: '☕' },
  { id: 'higiene', label: 'Higiene e Limpeza', icon: '🧴' },
]

export const MARKETS = [
  { id: 'fort', name: 'Fort Atacadista', color: '#E63312' },
  { id: 'carrefour', name: 'Carrefour', color: '#1A63B9' },
  { id: 'big', name: 'Big Bompreço', color: '#F5A623' },
]

export const PRODUCTS = [
  { id: 'p1',  name: 'Arroz Branco Tipo 1',   brand: 'Tio João',    category: 'graos',   unit: '5 kg',    image: '🌾', prices: { fort: 22.90, carrefour: 24.50, big: 23.80 }, promo: true },
  { id: 'p2',  name: 'Arroz Parboilizado',     brand: 'Camil',       category: 'graos',   unit: '5 kg',    image: '🌾', prices: { fort: 21.49, carrefour: 22.90, big: 21.99 } },
  { id: 'p3',  name: 'Feijão Carioca',         brand: 'Camil',       category: 'graos',   unit: '1 kg',    image: '🫘', prices: { fort: 7.89,  carrefour: 8.50,  big: 7.99  } },
  { id: 'p4',  name: 'Feijão Preto',           brand: 'Kicaldo',     category: 'graos',   unit: '1 kg',    image: '🫘', prices: { fort: 8.49,  carrefour: 9.20,  big: 8.79  } },
  { id: 'p5',  name: 'Lentilha',               brand: 'Yoki',        category: 'graos',   unit: '500 g',   image: '🫘', prices: { fort: 5.49,  carrefour: 6.10,  big: null  } },
  { id: 'p6',  name: 'Grão-de-Bico',           brand: 'Predilecta',  category: 'graos',   unit: '500 g',   image: '🫘', prices: { fort: 6.29,  carrefour: 6.80,  big: 6.49  } },
  { id: 'p7',  name: 'Macarrão Espaguete',     brand: 'Barilla',     category: 'graos',   unit: '500 g',   image: '🍝', prices: { fort: 4.99,  carrefour: 5.50,  big: 5.19  }, promo: true },
  { id: 'p8',  name: 'Macarrão Parafuso',      brand: 'Galo',        category: 'graos',   unit: '500 g',   image: '🍝', prices: { fort: 3.49,  carrefour: 3.90,  big: 3.59  } },
  { id: 'p9',  name: 'Leite Integral UHT',     brand: 'Italac',      category: 'leites',  unit: '1 L',     image: '🥛', prices: { fort: 4.29,  carrefour: 4.79,  big: 4.49  } },
  { id: 'p10', name: 'Leite Desnatado UHT',    brand: 'Piracanjuba', category: 'leites',  unit: '1 L',     image: '🥛', prices: { fort: 4.59,  carrefour: 5.10,  big: 4.79  } },
  { id: 'p11', name: 'Leite em Pó Integral',   brand: 'Ninho',       category: 'leites',  unit: '400 g',   image: '🥛', prices: { fort: 16.90, carrefour: 18.50, big: 17.49 }, promo: true },
  { id: 'p12', name: 'Iogurte Natural',         brand: 'Danone',      category: 'leites',  unit: '170 g',   image: '🫙', prices: { fort: 3.29,  carrefour: 3.50,  big: 3.39  } },
  { id: 'p13', name: 'Creme de Leite',          brand: 'Nestlé',      category: 'leites',  unit: '200 g',   image: '🥛', prices: { fort: 3.79,  carrefour: 4.20,  big: 3.99  } },
  { id: 'p14', name: 'Óleo de Soja',            brand: 'Liza',        category: 'oleos',   unit: '900 ml',  image: '🫙', prices: { fort: 6.49,  carrefour: 7.20,  big: 6.89  } },
  { id: 'p15', name: 'Óleo de Milho',           brand: 'Mazola',      category: 'oleos',   unit: '900 ml',  image: '🫙', prices: { fort: 8.99,  carrefour: 9.80,  big: 9.29  } },
  { id: 'p16', name: 'Azeite Extra Virgem',     brand: 'Gallo',       category: 'oleos',   unit: '500 ml',  image: '🫙', prices: { fort: 22.90, carrefour: 25.50, big: 23.99 } },
  { id: 'p17', name: 'Café Torrado e Moído',    brand: 'Pilão',       category: 'cafe',    unit: '500 g',   image: '☕', prices: { fort: 14.90, carrefour: 16.50, big: 15.49 }, promo: true },
  { id: 'p18', name: 'Café Extraforte',         brand: 'Melitta',     category: 'cafe',    unit: '500 g',   image: '☕', prices: { fort: 15.49, carrefour: 17.20, big: 15.99 } },
  { id: 'p19', name: 'Achocolatado em Pó',      brand: 'Toddy',       category: 'cafe',    unit: '400 g',   image: '🍫', prices: { fort: 9.29,  carrefour: 10.50, big: 9.79  } },
  { id: 'p20', name: 'Papel Higiênico',         brand: 'Neve',        category: 'higiene', unit: '12 rolos',image: '🧻', prices: { fort: 18.90, carrefour: 21.00, big: 19.49 } },
  { id: 'p21', name: 'Detergente Líquido',      brand: 'Ypê',         category: 'higiene', unit: '500 ml',  image: '🧴', prices: { fort: 2.49,  carrefour: 2.80,  big: 2.59  } },
  { id: 'p22', name: 'Sabão em Pó',             brand: 'Omo',         category: 'higiene', unit: '1 kg',    image: '🧺', prices: { fort: 14.49, carrefour: 15.90, big: 14.99 } },
]
