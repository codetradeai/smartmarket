// Gera src/catalogoResumo.js (MARKETS, CATEGORIES e os totais da Home) a partir de src/data.js.
// Uso: node scripts/gerar-catalogo-resumo.mjs   (rode de novo sempre que o data.js ou o equivalentes.json mudarem)
//
// Os totais são de ANÚNCIOS (uma listagem por rede, chave = rede + id de origem), não de produtos:
// o data.js guarda o preço de uma rede só por linha. "Produtos em 2+ redes" não sai do data.js: vem dos
// grupos "confirmado" de src/data/equivalentes.json quando o arquivo existe, e é 0 quando não existe.
// A regra de contagem fica em src/utils/totaisCatalogo.js (a mesma que os testes usam).
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import path from "node:path"

const raiz = path.resolve(import.meta.dirname, "..")
const { PRODUCTS, MARKETS, CATEGORIES } = await import(pathToFileURL(path.join(raiz, "src", "data.js")).href)
const { calcularTotais, anunciosPorRede } = await import(pathToFileURL(path.join(raiz, "src", "utils", "totaisCatalogo.js")).href)

const arquivoEquivalentes = path.join(raiz, "src", "data", "equivalentes.json")
const equivalentes = existsSync(arquivoEquivalentes) ? JSON.parse(readFileSync(arquivoEquivalentes, "utf8")) : null

const TOTAIS = calcularTotais(PRODUCTS, equivalentes)

// Anúncios (rede + id de origem) com preço, por rede: quem tem 0 não pode aparecer em textos como "compare em ...".
const REDES_COM_PRODUTOS = anunciosPorRede(PRODUCTS, MARKETS)

const corpo = `// GERADO por scripts/gerar-catalogo-resumo.mjs a partir de src/data.js. Não edite à mão.
// Módulo leve: não importa o data.js (32 MB). Totais = anúncios por (rede, id de origem), não produtos;
// produtosEm2Redes = grupos confirmados de src/data/equivalentes.json (0 sem o arquivo).

export const MARKETS = ${JSON.stringify(MARKETS, null, 2)}

export const CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)}

export const TOTAIS = ${JSON.stringify(TOTAIS, null, 2)}

export const REDES_COM_PRODUTOS = ${JSON.stringify(REDES_COM_PRODUTOS, null, 2)}
`
writeFileSync(path.join(raiz, "src", "catalogoResumo.js"), corpo, "utf8")
console.log("catalogoResumo.js gerado:", JSON.stringify(TOTAIS), equivalentes ? "(com equivalentes.json)" : "(sem equivalentes.json: produtosEm2Redes = 0)")
