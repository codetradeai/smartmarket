import { reescreverUrlsDeAssets } from "./urlAssets"

/**
 * Carrega o catálogo de produtos sob demanda. A promessa fica em cache; se a carga falhar,
 * o cache é limpo e uma nova chamada tenta de novo.
 *
 * Duas origens:
 * - VITE_CATALOGO_URL definida no build: baixa o JSON (gzip, ~3,5 MB) do Neon Object Storage.
 *   O data.js (~32 MB) sai do bundle e do deploy.
 * - Sem a variável (dev local, Docker, testes): import() dinâmico de src/data.js, que o
 *   bundler separa num chunk próprio.
 * Em ambos os casos os caminhos de fotos passam por urlAssets (ver VITE_ASSETS_BASE_URL).
 */
let promessa = null

async function baixarCatalogo(url) {
  const resposta = await fetch(url)
  if (!resposta.ok) throw new Error(`Falha ao baixar o catálogo (HTTP ${resposta.status})`)
  return resposta.json()
}

function carregarOrigem() {
  // A leitura fica inline para o Vite trocar a variável por um literal e descartar o ramo
  // do import("../data") quando a URL do catálogo está definida (o chunk de ~28 MB não é gerado).
  return import.meta.env.VITE_CATALOGO_URL
    ? baixarCatalogo(import.meta.env.VITE_CATALOGO_URL)
    : import("../data").then((modulo) => modulo.PRODUCTS)
}

export function carregarProdutos() {
  if (!promessa) {
    promessa = carregarOrigem()
      .then(reescreverUrlsDeAssets)
      .catch((erro) => {
        promessa = null
        throw erro
      })
  }
  return promessa
}
