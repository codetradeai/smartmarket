import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'templates', '**/*.zip']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      // `catch {}` vazio é intencional em setPointerCapture/releasePointerCapture (falham em alvos que não
      // suportam captura e isso não deve quebrar a interação). Bloco vazio fora de catch continua erro.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // A regra nova do React 19 acusa resets de estado ao trocar de prop (ex.: voltar à página 1 ao mudar o
      // filtro), que são funcionais e inofensivos aqui. Fica como aviso para não esconder erros reais.
      'react-hooks/set-state-in-effect': 'warn',
    },
    languageOptions: {
      globals: { ...globals.browser, __CATALOGO_VERSAO__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['**/*.{test,spec}.{js,jsx}', '**/setupTests.{js,cjs}', '**/fileMock.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.browser,
        ...globals.node,
      },
    },
  },
])
