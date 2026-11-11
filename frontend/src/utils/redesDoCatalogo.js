/**
 * Quais redes de fato têm produtos no catálogo (sem inflar o "8 redes" quando uma tem 0 anúncios),
 * e como escrevê-las em frases.
 */

const GENERICOS = /\b(Supermercados?|Atacadista|Center|Mercado)\b/gi

/** "Fort Atacadista" -> "Fort"; "Supermercados Rissul" -> "Rissul"; "Zaffari / Bourbon" -> "Zaffari". */
export function nomeCurtoRede(mercado) {
  if (!mercado) return ""
  const nome = String(mercado.name || "")
  const curto = nome.split("/")[0].replace(GENERICOS, "").replace(/\s+/g, " ").trim()
  return curto || nome || String(mercado.id ?? "")
}

/**
 * Filtra os mercados que têm ao menos um anúncio com preço. `redesResumo` é o REDES_COM_PRODUTOS do
 * catalogoResumo ([{ id, anuncios }]); sem ele (ex.: mock de teste) nenhuma rede é escondida.
 */
export function redesComProdutos(markets, redesResumo) {
  const lista = Array.isArray(markets) ? markets : []
  if (!Array.isArray(redesResumo)) return lista
  const comProdutos = new Set(redesResumo.filter((r) => Number(r?.anuncios) > 0).map((r) => String(r.id)))
  return lista.filter((m) => comProdutos.has(String(m.id)))
}

/**
 * Redes que o scraper coleta hoje na rotina diária. Fort (403 do Cloudflare), Zaffari e Rissul
 * (robots.txt proíbe /api/) estão em REDES_SUSPENSAS em scraper/rotina_carga.py: têm preço
 * histórico no catálogo, mas não são atualizadas. Ao suspender ou reativar uma rede lá, ajuste aqui.
 */
export const REDES_COM_COLETA_ATIVA = ["asun", "stok", "atacadao", "master", "carrefour"]

/** Mantém só os mercados cuja coleta está ativa, na ordem recebida. */
export function redesComColetaAtiva(markets) {
  const ativas = new Set(REDES_COM_COLETA_ATIVA)
  return (Array.isArray(markets) ? markets : []).filter((m) => ativas.has(String(m.id)))
}

/** ["Fort", "Asun", "Stok"] -> "Fort, Asun e Stok". */
export function listarNomes(nomes) {
  const lista = (nomes || []).filter(Boolean)
  if (lista.length <= 1) return lista.join("")
  return `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}`
}
