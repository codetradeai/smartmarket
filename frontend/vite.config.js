import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Versão do catálogo gerado por scripts/gerar-catalogo-json.mjs (predev/prebuild). Entra no app como
// __CATALOGO_VERSAO__, para o fetch apontar para o arquivo com hash no nome. Sem o manifesto, fica null.
function versaoDoCatalogo() {
  try {
    return JSON.parse(readFileSync(new URL('./public/catalogo/manifesto.json', import.meta.url), 'utf8')).versao
  } catch {
    return null
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __CATALOGO_VERSAO__: JSON.stringify(versaoDoCatalogo()) },
  server: {
    port: 5174,
    watch: {
      ignored: ['**/templates/**', '**/*.zip'],
    },
  },
})
