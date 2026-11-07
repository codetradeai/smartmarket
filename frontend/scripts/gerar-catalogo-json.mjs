// Gera, a partir de src/data.js (fonte única do catálogo), os JSON servidos como arquivos estáticos:
//   public/catalogo/produtos.json  -> PRODUCTS sem recursosVisuais.frames (o has360 permanece)
//   public/catalogo/frames.json    -> { [id]: string[] } só dos produtos com frames 360
// Assim o app baixa o catálogo leve por fetch() e os frames só quando alguém abre um 360.
// Roda automaticamente em predev/prebuild; os arquivos gerados não vão para o git.
import { mkdirSync, writeFileSync } from 'node:fs'
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

const destino = resolve(raiz, 'public/catalogo')
mkdirSync(destino, { recursive: true })
writeFileSync(resolve(destino, 'produtos.json'), JSON.stringify(produtos))
writeFileSync(resolve(destino, 'frames.json'), JSON.stringify(frames))
console.log(`catálogo: ${produtos.length} produtos; frames de ${Object.keys(frames).length} produtos`)
