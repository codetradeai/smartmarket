// Gera o catálogo em JSON a partir de frontend/src/data.js (a fonte, gerada pelo scraper).
// Saída em saida/: produtos.json (texto puro) e produtos.json.gz (o que vai para o bucket).
// Uso: npm run catalogo
import { mkdirSync, writeFileSync, statSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"

const aqui = path.dirname(fileURLToPath(import.meta.url))
const fonte = path.resolve(aqui, "../../frontend/src/data.js")
const saida = path.resolve(aqui, "saida")

const { PRODUCTS } = await import(pathToFileURL(fonte).href)
if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) {
  console.error("ERRO: data.js não exporta PRODUCTS como lista com itens.")
  process.exit(1)
}

mkdirSync(saida, { recursive: true })
const json = JSON.stringify(PRODUCTS)
writeFileSync(path.join(saida, "produtos.json"), json)
writeFileSync(path.join(saida, "produtos.json.gz"), gzipSync(json, { level: 9 }))

const mb = (arquivo) => (statSync(path.join(saida, arquivo)).size / 1048576).toFixed(2)
console.log(`${PRODUCTS.length} produtos -> produtos.json ${mb("produtos.json")} MB, produtos.json.gz ${mb("produtos.json.gz")} MB`)
