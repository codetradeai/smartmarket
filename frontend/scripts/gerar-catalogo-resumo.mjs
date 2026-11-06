// Gera src/catalogoResumo.js (MARKETS, CATEGORIES e os totais da Home) a partir de src/data.js.
// Uso: node scripts/gerar-catalogo-resumo.mjs   (rode de novo sempre que o data.js for regenerado)
// Os totais contam produtos distintos por (rede, id de origem), não ids de catálogo.
import { writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import path from "node:path"

const raiz = path.resolve(import.meta.dirname, "..")
const { PRODUCTS, MARKETS, CATEGORIES } = await import(pathToFileURL(path.join(raiz, "src", "data.js")).href)

const redesComPreco = (p) => Object.values(p.prices || {}).filter((v) => typeof v === "number" && v > 0).length
const chave = (p) =>
  p.supermercadoOrigem && p.idOrigem != null && p.idOrigem !== "" ? `${p.supermercadoOrigem}|${p.idOrigem}` : `catalogo|${p.id}`
const distintos = (filtro = () => true) => new Set(PRODUCTS.filter(filtro).map(chave)).size

const TOTAIS = {
  idsDeCatalogo: PRODUCTS.length,
  produtosDistintos: distintos(),
  produtosComPreco: distintos((p) => redesComPreco(p) > 0),
  produtosEm2Redes: distintos((p) => redesComPreco(p) >= 2),
}

const corpo = `// GERADO por scripts/gerar-catalogo-resumo.mjs a partir de src/data.js. Não edite à mão.
// Módulo leve: não importa o data.js (32 MB). Totais = produtos distintos por (rede, id de origem).

export const MARKETS = ${JSON.stringify(MARKETS, null, 2)}

export const CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)}

export const TOTAIS = ${JSON.stringify(TOTAIS, null, 2)}
`
writeFileSync(path.join(raiz, "src", "catalogoResumo.js"), corpo, "utf8")
console.log("catalogoResumo.js gerado:", JSON.stringify(TOTAIS))
