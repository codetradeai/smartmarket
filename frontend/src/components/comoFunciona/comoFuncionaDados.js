// Dados ILUSTRATIVOS da demonstração "Como funciona". Não vêm do catálogo e não representam preços reais.

// Produtos e fotos são os mesmos da lista real do app (fotos em /images/produtos); só os PREÇOS são ilustrativos.
export const PRODUTOS_DEMO = [
  { id: "arroz", nome: "Arroz Blue Ville Branco Tipo 1 5kg", categoria: "Grãos", detalhe: "Geral · 5kg", foto: "/images/produtos/2414_05d74396657f.jpg", precos: [27.9, 25.9, 26.5] },
  { id: "cafe", nome: "Café Torrado e Moído Melitta Tradicional 500g", categoria: "Café", detalhe: "Geral · 500g", foto: "/images/produtos/12380_4809dd2e7cd1.jpg", precos: [21.4, 22.9, 19.9] },
  { id: "leite", nome: "Leite UHT Integral Parmalat 1 Litro", categoria: "Leites", detalhe: "Parmalat · 1 L", foto: "/images/produtos/1087590_1deb1bf03c1e.jpg", precos: [5.49, 4.99, 5.19] },
]

export function indiceMenor(valores) {
  return valores.reduce((melhor, v, i) => (v < valores[melhor] ? i : melhor), 0)
}

export const brl = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
