/**
 * Carrega o catálogo estático (src/data.js, ~32 MB) sob demanda, com import() dinâmico.
 * O bundler o separa num chunk próprio; só quem chama esta função paga o download.
 * A promessa fica em cache; se a carga falhar, o cache é limpo e uma nova chamada tenta de novo.
 */
let promessa = null

export function carregarProdutos() {
  if (!promessa) {
    promessa = import("../data")
      .then((modulo) => modulo.PRODUCTS)
      .catch((erro) => {
        promessa = null
        throw erro
      })
  }
  return promessa
}
