import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import process from 'node:process'
import { visualizer } from 'rollup-plugin-visualizer'

// Relatório de bundle sob demanda: `ANALYZE=1 npm run build` gera dist/stats.html (treemap com
// tamanhos gzip e brotli). Fora disso o plugin não entra no build.
const analisar = process.env.ANALYZE === '1'

// https://vite.dev/config/
export default defineConfig({
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
  server: {
    port: 5174,
    watch: {
      ignored: ['**/templates/**', '**/*.zip'],
    },
  },
})
