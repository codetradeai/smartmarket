import { reescreverUrlsDeAssets } from "./urlAssets"

/**
 * Carrega o catálogo como arquivo estático (public/catalogo/produtos.<hash>.json, gerado de src/data.js por
 * scripts/gerar-catalogo-json.mjs) via fetch(), ou de VITE_CATALOGO_URL quando definida.
 * Os frames do 360° ficam fora dele, em um JSON por produto, e só são baixados quando alguém abre ou passa o mouse
 * num produto 360° (carregarFrames).
 * As promessas ficam em cache; se a carga falhar, o cache é limpo e uma nova chamada tenta de novo.
 */
// __CATALOGO_VERSAO__ é injetado pelo Vite (vite.config.js) a partir do manifesto gerado no prebuild.
// O hash entra no nome do arquivo, então cada versão do catálogo tem URL própria e pode ser cacheada
// para sempre. Sem versão (testes, ou sem prebuild), cai nos nomes sem hash.
const VERSAO = typeof __CATALOGO_VERSAO__ !== "undefined" ? __CATALOGO_VERSAO__ : null
export const URL_PRODUTOS = VERSAO ? `/catalogo/produtos.${VERSAO}.json` : "/catalogo/produtos.json"
export const urlFrames = (id) =>
  VERSAO ? `/catalogo/frames/${VERSAO}/${id}.json` : `/catalogo/frames/${id}.json`

function buscarJson(url) {
  return fetch(url).then((resposta) => {
    if (!resposta.ok) throw new Error(`Falha ao carregar ${url} (HTTP ${resposta.status})`)
    return resposta.json()
  })
}

function obterUrlCatalogo() {
  if (typeof process !== "undefined" && process.env?.VITE_CATALOGO_URL) {
    return process.env.VITE_CATALOGO_URL
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_CATALOGO_URL) {
    return import.meta.env.VITE_CATALOGO_URL
  }
  return URL_PRODUTOS
}

let promessaProdutos = null
const promessasFrames = new Map()

export function carregarProdutos() {
  if (!promessaProdutos) {
    promessaProdutos = buscarJson(obterUrlCatalogo())
      .then(reescreverUrlsDeAssets)
      .catch((erro) => {
        promessaProdutos = null
        throw erro
      })
  }
  return promessaProdutos
}

/**
 * Devolve os frames de UM produto (/catalogo/frames/<versao>/<id>.json, ~1,5 KB comprimido), ou [] se
 * não houver. Cada produto é baixado uma vez; se falhar, a próxima chamada tenta de novo.
 */
export function carregarFrames(id) {
  if (!promessasFrames.has(id)) {
    promessasFrames.set(
      id,
      buscarJson(urlFrames(id)).catch((erro) => {
        promessasFrames.delete(id)
        throw erro
      }),
    )
  }
  return promessasFrames.get(id)
}

/** Esquece as promessas em cache (usado pelos testes para começar cada caso do zero). */
export function reiniciarCacheDoCatalogo() {
  promessaProdutos = null
  promessasFrames.clear()
}
