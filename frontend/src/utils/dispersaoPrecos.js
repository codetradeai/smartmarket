import { CONFIANCA_CONFIRMADO, GRUPOS_EQUIVALENTES } from "./equivalentes"

// Dispersão de preços entre redes para o MESMO produto. Cada item do catálogo tem preço de uma rede só;
// o mesmo produto em outra rede é outro item, ligado por um grupo "confirmado" de equivalentes.json.
// Grupos "provavel" não entram (nunca contam como comparação). Só usa preços reais do catálogo.

/**
 * Normaliza a unidade para poder comparar embalagens: "1kg" -> "1000g", "1,5L" -> "1500ml", "12 un" -> "12un".
 * Devolve null quando não dá para entender (o grupo fica de fora em vez de comparar embalagens incertas).
 */
export function normalizarUnidade(unidade) {
  const m = String(unidade ?? "")
    .toLowerCase()
    .replace(",", ".")
    .match(/^\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l|un|und|unid|unidade|unidades)?\s*$/)
  if (!m) return null
  let quantidade = parseFloat(m[1])
  let tipo = m[2] || "un"
  if (tipo === "kg") {
    quantidade *= 1000
    tipo = "g"
  } else if (tipo === "l") {
    quantidade *= 1000
    tipo = "ml"
  } else if (tipo !== "g" && tipo !== "ml") {
    tipo = "un"
  }
  return `${Math.round(quantidade * 1000) / 1000}${tipo}`
}

const temFoto = (p) => Boolean(p?.imageLocal || p?.imageUrl)

function comparacaoDoGrupo(grupo, porId) {
  const itens = (grupo.itens || []).map((id) => porId.get(String(id))).filter(Boolean)
  if (itens.length < 2) return null

  // mesmo setor e mesma embalagem entre todos os itens, senão não é comparação segura
  if (new Set(itens.map((p) => p.category)).size !== 1) return null
  const unidades = new Set(itens.map((p) => normalizarUnidade(p.unit)))
  if (unidades.size !== 1 || unidades.has(null)) return null

  // menor preço válido por rede entre os itens do grupo
  const porRede = new Map()
  for (const item of itens) {
    for (const [rede, valor] of Object.entries(item.prices || {})) {
      if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) continue
      const atual = porRede.get(rede)
      if (!atual || valor < atual.preco) porRede.set(rede, { rede, preco: valor, item })
    }
  }
  if (porRede.size < 2) return null

  const redes = [...porRede.values()].sort((a, b) => a.preco - b.preco)
  const menor = redes[0]
  const maior = redes[redes.length - 1]
  if (maior.preco <= menor.preco) return null

  const economia = maior.preco - menor.preco
  return {
    grupoId: grupo.id,
    categoria: itens[0].category,
    produto: menor.item,
    imagem: temFoto(menor.item) ? menor.item : itens.find(temFoto) || menor.item,
    unidade: itens[0].unit,
    redes: redes.map(({ rede, preco }) => ({ rede, preco })),
    menor: { rede: menor.rede, preco: menor.preco },
    maior: { rede: maior.rede, preco: maior.preco },
    economia,
    // diferença em relação ao MAIOR preço: ((maior - menor) / maior) x 100
    percentual: Math.round((economia / maior.preco) * 100),
  }
}

/**
 * Todas as comparações válidas do catálogo (uma por grupo confirmado). Calcule uma vez por catálogo.
 * `produtos` é o array do catálogo; `grupos` o conteúdo de equivalentes.json (padrão).
 */
export function calcularComparacoes(produtos, grupos = GRUPOS_EQUIVALENTES) {
  if (!Array.isArray(produtos) || produtos.length === 0 || !Array.isArray(grupos)) return []
  const porId = new Map(produtos.map((p) => [String(p.id), p]))
  const resultado = []
  for (const grupo of grupos) {
    if (grupo?.confianca !== CONFIANCA_CONFIRMADO) continue
    const comparacao = comparacaoDoGrupo(grupo, porId)
    if (comparacao) resultado.push(comparacao)
  }
  return resultado
}

/**
 * Resumo de um setor:
 * - itens: até `limite` comparações com maior variação, evitando repetir a marca quando há alternativa;
 * - total: quantos produtos do setor têm comparação válida;
 * - maxPercentual / mediaPercentual: dispersão real do setor (base do "Até X%").
 */
export function dispersaoDoSetor(comparacoes, categoria, limite = 3) {
  const doSetor = (comparacoes || [])
    .filter((c) => c.categoria === categoria)
    .sort((a, b) => b.percentual - a.percentual || b.economia - a.economia)

  const itens = []
  const marcas = new Set()
  for (const c of doSetor) {
    const marca = String(c.produto.brand || "").toLowerCase()
    if (marca && marcas.has(marca)) continue
    itens.push(c)
    marcas.add(marca)
    if (itens.length === limite) break
  }
  for (const c of doSetor) {
    if (itens.length === limite) break
    if (!itens.includes(c)) itens.push(c)
  }

  const total = doSetor.length
  return {
    itens,
    total,
    maxPercentual: total > 0 ? doSetor[0].percentual : 0,
    mediaPercentual: total > 0 ? Math.round(doSetor.reduce((s, c) => s + c.percentual, 0) / total) : 0,
  }
}

/** Posição (0 a 1) de um preço na trilha, proporcional à distância entre o menor e o maior. */
export function posicaoNaTrilha(preco, menor, maior) {
  if (maior <= menor) return 0
  return Math.min(1, Math.max(0, (preco - menor) / (maior - menor)))
}
