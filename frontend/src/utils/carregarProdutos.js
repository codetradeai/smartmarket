/**
 * Carrega o catálogo como arquivo estático (public/catalogo/produtos.json, gerado de src/data.js por
 * scripts/gerar-catalogo-json.mjs) via fetch(). Os frames do 360° ficam fora dele, em frames.json,
 * e só são baixados quando alguém abre ou passa o mouse num produto 360° (carregarFrames).
 * As promessas ficam em cache; se a carga falhar, o cache é limpo e uma nova chamada tenta de novo.
 */
export const URL_PRODUTOS = "/catalogo/produtos.json"
export const URL_FRAMES = "/catalogo/frames.json"

function buscarJson(url) {
  return fetch(url).then((resposta) => {
    if (!resposta.ok) throw new Error(`Falha ao carregar ${url} (HTTP ${resposta.status})`)
    return resposta.json()
  })
}

let promessaProdutos = null
let promessaFrames = null

export function carregarProdutos() {
  if (!promessaProdutos) {
    promessaProdutos = buscarJson(URL_PRODUTOS).catch((erro) => {
      promessaProdutos = null
      throw erro
    })
  }
  return promessaProdutos
}

/** Devolve a lista de frames do produto (ou []), baixando frames.json uma única vez. */
export function carregarFrames(id) {
  if (!promessaFrames) {
    promessaFrames = buscarJson(URL_FRAMES).catch((erro) => {
      promessaFrames = null
      throw erro
    })
  }
  return promessaFrames.then((mapa) => mapa[id] || [])
}

/** Esquece as promessas em cache (usado pelos testes para começar cada caso do zero). */
export function reiniciarCacheDoCatalogo() {
  promessaProdutos = null
  promessaFrames = null
}
