/* global process */
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serve o app em /smartmarket/; o workflow define VITE_BASE. Fora dele a base é a raiz.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    watch: {
      ignored: ['**/templates/**', '**/*.zip'],
    },
  },
})