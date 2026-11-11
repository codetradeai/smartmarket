// Dados ILUSTRATIVOS da demonstração "Como funciona". Não vêm do catálogo e não representam preços reais.
// Os nomes dos mercados são genéricos de propósito (Mercado A/B/C).

// Produtos e fotos são os mesmos da lista real do app (fotos em /images/produtos); só os PREÇOS são ilustrativos.
export const PRODUTOS_DEMO = [
  { id: "arroz", nome: "Arroz Blue Ville Branco Tipo 1 5kg", categoria: "Grãos", detalhe: "Geral · 5kg", foto: "/images/produtos/2414_05d74396657f.jpg", precos: [27.9, 25.9, 26.5] },
  { id: "cafe", nome: "Café Torrado e Moído Melitta Tradicional 500g", categoria: "Café", detalhe: "Geral · 500g", foto: "/images/produtos/12380_4809dd2e7cd1.jpg", precos: [21.4, 22.9, 19.9] },
  { id: "leite", nome: "Leite UHT Integral Parmalat 1 Litro", categoria: "Leites", detalhe: "Parmalat · 1 L", foto: "/images/produtos/1087590_1deb1bf03c1e.jpg", precos: [5.49, 4.99, 5.19] },
]

export const MERCADOS_DEMO = ["Mercado A", "Mercado B", "Mercado C"]

export const PASSOS = [
  { numero: "01", titulo: "Monte sua lista", texto: "Escolha os produtos do dia a dia e guarde a lista para a próxima compra." },
  { numero: "02", titulo: "Cruze os preços", texto: "O comparador olha o preço de cada item nas redes presentes no catálogo." },
  { numero: "03", titulo: "Escolha o mercado", texto: "Veja onde a cesta fecha mais barata antes de sair de casa." },
]

// Limites da linha do tempo (progresso do scroll de 0 a 1) em que cada passo começa.
export const INICIO_PASSO = [0, 0.34, 0.68]

export function totaisDemo(produtos = PRODUTOS_DEMO) {
  const n = produtos[0]?.precos.length ?? 0
  return Array.from({ length: n }, (_, m) =>
    Math.round(produtos.reduce((soma, p) => soma + p.precos[m] * 100, 0)) / 100,
  )
}

export function indiceMenor(valores) {
  return valores.reduce((melhor, v, i) => (v < valores[melhor] ? i : melhor), 0)
}

export function economiaDemo(produtos = PRODUTOS_DEMO) {
  const totais = totaisDemo(produtos)
  return Math.round((Math.max(...totais) - Math.min(...totais)) * 100) / 100
}

export function passoDoProgresso(p) {
  if (p >= INICIO_PASSO[2]) return 2
  if (p >= INICIO_PASSO[1]) return 1
  return 0
}

export const brl = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
