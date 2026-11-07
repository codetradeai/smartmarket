// Gera, a partir de src/data.js (fonte única do catálogo), os JSON servidos como arquivos estáticos:
//   public/catalogo/produtos.<versao>.json   -> PRODUCTS sem recursosVisuais.frames (has360 permanece)
//   public/catalogo/frames/<versao>/<id>.json -> lista de frames de UM produto (só dos que têm 360°)
//   public/catalogo/manifesto.json           -> { versao, produtos } lido pelo vite.config.js
// A <versao> é o hash do conteúdo: o nome muda quando o catálogo muda, então o arquivo pode ser
// cacheado "para sempre" (immutable) sem risco de servir catálogo velho. O app baixa o catálogo leve
// de uma vez e os frames de um produto só quando alguém o abre ou passa o mouse nele.
// Roda automaticamente em predev/prebuild; os arquivos gerados não vão para o git.
import { createHash } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { PRODUCTS } = await import(pathToFileURL(resolve(raiz, 'src/data.js')).href)

const frames = {}
const produtos = PRODUCTS.map((produto) => {
  const lista = produto.recursosVisuais?.frames
  if (!Array.isArray(lista)) return produto
  const { frames: _removido, ...recursosVisuais } = produto.recursosVisuais
  // O app só mostra 360° com 2+ quadros; com menos, o produto passa a valer como sem 360°.
  if (lista.length < 2) return { ...produto, recursosVisuais: { ...recursosVisuais, has360: false } }
  frames[produto.id] = lista
  return { ...produto, recursosVisuais }
})

const jsonProdutos = JSON.stringify(produtos)
const hash = createHash('sha256').update(jsonProdutos)
for (const id of Object.keys(frames).sort()) hash.update(id).update(JSON.stringify(frames[id]))
const versao = hash.digest('hex').slice(0, 10)

const destino = resolve(raiz, 'public/catalogo')
rmSync(destino, { recursive: true, force: true })
mkdirSync(resolve(destino, 'frames', versao), { recursive: true })
const nomeProdutos = `produtos.${versao}.json`
writeFileSync(resolve(destino, nomeProdutos), jsonProdutos)
for (const [id, lista] of Object.entries(frames)) {
  writeFileSync(resolve(destino, 'frames', versao, `${id}.json`), JSON.stringify(lista))
}
writeFileSync(resolve(destino, 'manifesto.json'), JSON.stringify({ versao, produtos: nomeProdutos }))
console.log(`catálogo ${versao}: ${produtos.length} produtos; frames de ${Object.keys(frames).length} produtos`)
