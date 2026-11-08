# SmartMarket — Frontend Web

Aplicação web do **SmartMarket** desenvolvida com **React 19**, **Vite 8** e **Tailwind CSS v4**, seguindo rigorosamente o design elaborado no Figma e as diretrizes de Clean Code e acessibilidade.

---

## 1. Tecnologias Utilizadas

* **React 19**: Biblioteca de interfaces reativas com componentes funcionais e hooks.
* **Vite 8**: Build tool e dev server ultrarrápido com HMR nativo.
* **Tailwind CSS v4**: Framework utilitário de estilização configurado via `@theme`.
* **React Router DOM 7**: Roteamento client-side com layouts e navegação fluida.
* **Lucide React**: Conjunto profissional e consistente de ícones vetoriais.
* **Jest 30 + React Testing Library**: testes (`npm test`).
* **clsx & tailwind-merge**: Gerenciador de classes dinâmicas sem conflitos de especificidade via utilitário `cn()`.

---

## 2. Design System e Componentes Base

O projeto conta com uma biblioteca de componentes UI atômicos e composables em `src/components/ui/`:
* `Button`: Variantes `primary`, `secondary`, `teal`, `outline`, `ghost`, `danger`, `subtle`, múltiplos tamanhos e estado `isLoading`.
* `Input`: Rótulo, ícone interno, mensagens de erro, helper text e modo busca com limpeza rápida.
* `Card`: Composição via `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` e `CardFooter`.
* `Modal`: Diálogo acessível via React Portal com backdrop-blur, fechamento com ESC e clique externo.
* `Navbar`: Barra de navegação responsiva com logo oficial, busca, contador de lista e menu mobile.

Para documentação completa de cores, tipografia e guia dos componentes, consulte [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md).

---

## 3. Como Rodar Localmente

Certifique-se de estar dentro do diretório `frontend`:

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de desenvolvimento
npm run dev

# 3. Compilar para produção (validação de build)
npm run build
```

---

## 4. Testes

```bash
npm test                # suíte inteira (Jest)
npm run test:coverage   # falha abaixo de 70% de cobertura
npm run lint
```

Testes que importam o `data.js` real (32 MB) devem usar a fixture: `jest.mock('../data', () => require('../test/dataFixture'))`. Detalhes em [`docs/TESTES.md`](../docs/TESTES.md).

---

## 5. Variáveis de build e deploy

| Variável | Para quê | Padrão |
|---|---|---|
| `VITE_API_URL` | URL do backend (termina em `/api`) | `http://localhost:8080/api` (dev); `/api` relativo em produção |
| `VITE_BASE` | Base do app (no GitHub Pages é `/smartmarket/`) | `/` |
| `VITE_ASSETS_BASE_URL` | Fotos de produtos no bucket do Neon | vazio: fotos de `public/` |
| `VITE_CATALOGO_URL` | Catálogo em JSON (gzip) no bucket | vazio: JSON estático `/catalogo/produtos.<hash>.json`, gerado de `src/data.js` por `predev`/`prebuild` |

Sem as três últimas nada muda no dev local, no Docker e nos testes. Regras de código:

* Caminhos de `public/` escritos à mão (`/images/...`, `/video/...`) passam por `urlPublica` (`src/utils/urlPublica.js`) para respeitar a base.
* O catálogo local usa ids `"p<id>"`; a API usa o `<id>` numérico. `mesclarCatalogo` (`src/utils/mesclarCatalogo.js`) junta os dois sem duplicar, mantendo o id local.
* `npm run build:estatico` faz o build e remove `dist/images/produtos` (as fotos ficam no bucket). Ele não roda o `prebuild`: sem `VITE_CATALOGO_URL`, gere antes o catálogo estático (`npm run prebuild`).
* A CSP do build vem de `vite-plugins/csp.js`; origem externa nova precisa entrar pelas variáveis acima (ver `docs/DEPLOY-PAGES.md`).

Deploy: [`docs/DEPLOY-PAGES.md`](../docs/DEPLOY-PAGES.md) · fotos e catálogo: [`docs/ASSETS-NEON.md`](../docs/ASSETS-NEON.md).
