/**
 * Contagem de produtos do catálogo estático (data.js).
 *
 * O mesmo produto de uma rede pode aparecer com mais de um id de catálogo (ex.: p131 e p338 são o
 * mesmo item do Rissul). Os totais exibidos contam produtos distintos por (rede, id de origem);
 * sem essa informação, o próprio id de catálogo vale como chave.
 */
export function chaveDeOrigem(produto) {
  if (produto?.supermercadoOrigem && produto?.idOrigem != null && produto.idOrigem !== "") {
    return `${produto.supermercadoOrigem}|${produto.idOrigem}`
  }
  return `catalogo|${produto?.id}`
}

/** Quantos produtos distintos (rede + id de origem) satisfazem o filtro. */
export function contarDistintos(produtos, filtro = () => true) {
  const chaves = new Set()
  for (const p of produtos || []) {
    if (filtro(p)) chaves.add(chaveDeOrigem(p))
  }
  return chaves.size
}
