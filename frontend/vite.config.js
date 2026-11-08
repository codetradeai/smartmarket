import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import process from 'node:process'
import { visualizer } from 'rollup-plugin-visualizer'

// Relatório de bundle sob demanda: `ANALYZE=1 npm run build` gera dist/stats.html (treemap com
// tamanhos gzip e brotli). Fora disso o plugin não entra no build.
const analisar = process.env.ANALYZE === '1'

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
  // GitHub Pages serve o app em /smartmarket/; o workflow define VITE_BASE. Fora dele a base é a raiz.
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
    analisar &&
      visualizer({
        filename: process.env.ANALYZE_OUT || 'dist/stats.html',
        template: process.env.ANALYZE_TEMPLATE || 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  define: { __CATALOGO_VERSAO__: JSON.stringify(versaoDoCatalogo()) },
  server: {
    port: 5174,
    watch: {
      ignored: ['**/templates/**', '**/*.zip'],
    },
  },
})
