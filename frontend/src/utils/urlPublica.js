/**
 * Caminho de arquivo em frontend/public (ou rota) respeitando a base do app.
 * Na raiz ("/") não muda nada; no GitHub Pages (base "/smartmarket/") vira "/smartmarket/images/...".
 */
export function urlPublica(caminho) {
  const base = String(import.meta.env.BASE_URL || "/").replace(/\/+$/, "")
  return typeof caminho === "string" && caminho.startsWith("/") ? base + caminho : caminho
}
