// Remove do dist o que já está no Neon Object Storage (fotos dos produtos).
// Rode depois do `vite build`, só quando VITE_ASSETS_BASE_URL estiver definida: sem ela o app
// perderia as fotos. Uso: `npm run build:estatico` (build para hospedagem estática, como o GitHub Pages).
import { rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

if (!process.env.VITE_ASSETS_BASE_URL) {
  console.error("podar-dist: VITE_ASSETS_BASE_URL não definida; as fotos precisam continuar no dist. Nada foi removido.")
  process.exit(1)
}
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist")
await rm(path.join(dist, "images", "produtos"), { recursive: true, force: true })
console.log("podar-dist: dist/images/produtos removido (fotos servidas pelo bucket).")
