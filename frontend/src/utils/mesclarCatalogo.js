/**
 * Junta o catálogo local (data.js, ids "p<id>") com o catálogo devolvido pela API (ids numéricos).
 *
 * - Produto da API que já existe no catálogo local (id igual, ou "p" + id da API) enriquece o item
 *   local: nome, preços etc. vêm da API, mas o id local é mantido (favoritos, lista e coração do
 *   catálogo usam esse id) e o id original da API fica em `apiId`.
 * - Produto que só existe na API entra no fim da lista com o id da API.
 * - Produto que só existe no catálogo local fica como está.
 *
 * Antes cada tela comparava String(id) com String(id): "123" nunca é igual a "p123", então a API
 * nunca enriquecia ninguém e todo produto aparecia duas vezes.
 */
export function mesclarCatalogo(locais, api) {
  if (!Array.isArray(api) || api.length === 0) return locais

  const idsLocais = new Set(locais.map((p) => String(p.id)))
  const idLocalDe = (item) => {
    const id = String(item.id)
    if (idsLocais.has(id)) return id
    return idsLocais.has(`p${id}`) ? `p${id}` : null
  }

  const daApiPorIdLocal = new Map()
  const soNaApi = []
  for (const item of api) {
    const idLocal = idLocalDe(item)
    if (idLocal) daApiPorIdLocal.set(idLocal, item)
    else soNaApi.push(item)
  }

  const enriquecidos = locais.map((local) => {
    const daApi = daApiPorIdLocal.get(String(local.id))
    return daApi ? { ...local, ...daApi, id: local.id, apiId: daApi.id } : local
  })
  return [...enriquecidos, ...soNaApi]
}
