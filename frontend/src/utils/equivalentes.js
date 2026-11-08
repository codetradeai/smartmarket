import dados from "../data/equivalentes.json"

/**
 * Equivalentes entre redes (mesmo produto vendido em supermercados diferentes).
 *
 * Cada item do catálogo tem preço de uma rede só; src/data/equivalentes.json liga itens de redes
 * diferentes em grupos: { id, confianca: "confirmado" | "provavel", camada: "T0".."T4", itens: ["p12", "p3456"] }.
 *  - "confirmado" entra na comparação e no "menor preço";
 *  - "provavel" só é mostrado, com selo, e NUNCA conta para o "menor preço".
 *
 * Funções puras. O catálogo (array de produtos ou Map id -> produto) e os grupos são parâmetros
 * para os testes não dependerem do data.js; o padrão dos grupos é o arquivo JSON.
 */

export const CONFIANCA_CONFIRMADO = "confirmado"
export const CONFIANCA_PROVAVEL = "provavel"
export const CONFIANCA_PROPRIO = "proprio"

export const GRUPOS_EQUIVALENTES = Array.isArray(dados?.grupos) ? dados.grupos : []

const cacheIndiceGrupos = new WeakMap()
const cacheCatalogo = new WeakMap()

/** Índice id do item -> grupo. Em cache por array de grupos. */
export function indexarGrupos(grupos = GRUPOS_EQUIVALENTES) {
  if (!Array.isArray(grupos)) return new Map()
  const emCache = cacheIndiceGrupos.get(grupos)
  if (emCache) return emCache
  const indice = new Map()
  for (const grupo of grupos) {
    for (const id of grupo?.itens || []) indice.set(String(id), grupo)
  }
  cacheIndiceGrupos.set(grupos, indice)
  return indice
}

function produtoPorId(catalogo, id) {
  if (!catalogo) return undefined
  if (catalogo instanceof Map) return catalogo.get(id)
  if (!Array.isArray(catalogo)) return undefined
  let mapa = cacheCatalogo.get(catalogo)
  if (!mapa) {
    mapa = new Map()
    for (const p of catalogo) if (p?.id != null) mapa.set(String(p.id), p)
    cacheCatalogo.set(catalogo, mapa)
  }
  return mapa.get(id)
}

/**
 * Outros itens do grupo do produto: [{ produto, confianca, camada, grupoId }].
 * Ids do grupo que não estão no catálogo carregado são ignorados.
 */
export function equivalentesDe(produto, catalogo, grupos = GRUPOS_EQUIVALENTES) {
  if (!produto || produto.id == null) return []
  const idProprio = String(produto.id)
  const grupo = indexarGrupos(grupos).get(idProprio)
  if (!grupo) return []
  const resultado = []
  for (const id of grupo.itens) {
    if (String(id) === idProprio) continue
    const outro = produtoPorId(catalogo, String(id))
    if (!outro) continue
    resultado.push({ produto: outro, confianca: grupo.confianca, camada: grupo.camada, grupoId: grupo.id })
  }
  return resultado
}

function precosValidos(produto) {
  const lista = []
  for (const [rede, valor] of Object.entries(produto?.prices || {})) {
    const preco = Number(valor)
    if (Number.isFinite(preco) && preco > 0) lista.push([rede, preco])
  }
  return lista
}

/**
 * Une os preços do item com os dos equivalentes, por rede:
 * { [rede]: { preco, produto, confianca: "proprio" | "confirmado" | "provavel", camada, contaParaMenorPreco } }.
 * O preço do próprio item vence um equivalente da mesma rede; entre equivalentes da mesma rede vale o
 * confirmado e, empatando a confiança, o menor preço.
 */
export function precosPorRede(produto, catalogo, grupos = GRUPOS_EQUIVALENTES) {
  const porRede = {}
  if (!produto) return porRede
  for (const [rede, preco] of precosValidos(produto)) {
    porRede[rede] = { preco, produto, confianca: CONFIANCA_PROPRIO, camada: null, contaParaMenorPreco: true }
  }
  const proprias = new Set(Object.keys(porRede))
  const escolhidos = {}
  for (const eq of equivalentesDe(produto, catalogo, grupos)) {
    const confirmado = eq.confianca === CONFIANCA_CONFIRMADO
    for (const [rede, preco] of precosValidos(eq.produto)) {
      if (proprias.has(rede)) continue
      const candidato = {
        preco,
        produto: eq.produto,
        confianca: eq.confianca,
        camada: eq.camada,
        contaParaMenorPreco: confirmado,
      }
      const atual = escolhidos[rede]
      const melhor =
        !atual ||
        (candidato.contaParaMenorPreco && !atual.contaParaMenorPreco) ||
        (candidato.contaParaMenorPreco === atual.contaParaMenorPreco && candidato.preco < atual.preco)
      if (melhor) escolhidos[rede] = candidato
    }
  }
  return Object.assign(porRede, escolhidos)
}

/** Acha a entrada de uma rede (mercado { id, name }) no resultado de precosPorRede. */
export function entradaDaRede(porRede, mercado) {
  if (!porRede || !mercado) return null
  return porRede[mercado.id] ?? porRede[mercado.id?.toString()] ?? porRede[mercado.name?.toLowerCase()] ?? null
}

/** Ids das redes (chaves de `prices`) onde há equivalente confirmado, sem repetir as redes do próprio item. */
export function redesComEquivalenteConfirmado(produto, catalogo, grupos = GRUPOS_EQUIVALENTES) {
  return Object.entries(precosPorRede(produto, catalogo, grupos))
    .filter(([, entrada]) => entrada.confianca === CONFIANCA_CONFIRMADO)
    .map(([rede]) => rede)
}

/** Quantos produtos já estão em 2+ redes por casamento confirmado (um grupo confirmado = um produto). */
export function contarGruposConfirmados(grupos = GRUPOS_EQUIVALENTES) {
  return Array.isArray(grupos) ? grupos.filter((g) => g?.confianca === CONFIANCA_CONFIRMADO).length : 0
}
