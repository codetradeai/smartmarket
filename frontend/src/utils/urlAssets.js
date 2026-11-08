/**
 * Fotos dos produtos no Neon Object Storage (bucket público).
 *
 * Com VITE_ASSETS_BASE_URL definida no build, os caminhos "/images/produtos/..." viram URLs do bucket
 * e as fotos saem do deploy (a Vercel deixa de guardar ~50 MB por deploy). Sem a variável, nada muda:
 * as fotos continuam sendo servidas de frontend/public (dev local e Docker).
 *
 * Exemplo: VITE_ASSETS_BASE_URL=https://<endpoint-do-neon>/smartmarket-assets
 * (a chave no bucket é o próprio caminho sem a barra inicial: images/produtos/...).
 */
const PREFIXO = "/images/produtos/"

function baseAssets() {
  const base = import.meta.env.VITE_ASSETS_BASE_URL
  return base ? String(base).replace(/\/+$/, "") : ""
}

export function urlAsset(caminho) {
  const base = baseAssets()
  if (!base || typeof caminho !== "string" || !caminho.startsWith(PREFIXO)) return caminho
  return base + caminho
}

/** Reescreve, em qualquer nível do objeto, os caminhos de fotos locais. Não altera o original. */
export function reescreverUrlsDeAssets(valor) {
  if (!baseAssets()) return valor
  if (typeof valor === "string") return urlAsset(valor)
  if (Array.isArray(valor)) return valor.map(reescreverUrlsDeAssets)
  if (valor && typeof valor === "object") {
    const copia = {}
    for (const chave of Object.keys(valor)) copia[chave] = reescreverUrlsDeAssets(valor[chave])
    return copia
  }
  return valor
}
