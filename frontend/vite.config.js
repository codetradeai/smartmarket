import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: ['**/templates/**', '**/*.zip'],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './jest/setupTests.js',
  },
})