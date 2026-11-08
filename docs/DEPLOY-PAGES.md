# Deploy do frontend no GitHub Pages

O frontend é publicado em **https://smartmarket-team.github.io/smartmarket/** pelo workflow `.github/workflows/deploy-pages.yml` a cada push na `main` que mexa em `frontend/`, ou à mão (Actions > Deploy do frontend no GitHub Pages > Run workflow).

## Configurar (uma vez)

1. **Settings > Pages > Source = "GitHub Actions"**.
2. **Settings > Secrets and variables > Actions > Variables**: crie `VITE_API_URL` com a URL pública do backend, terminada em `/api` (ex.: `https://smartmarket-api.onrender.com/api`). Sem ela o app abre, mas as chamadas à API falham (o Pages não faz proxy de `/api`).
3. No backend, libere o endereço do Pages no CORS: `SMARTMARKET_CORS_ORIGINS=https://smartmarket-team.github.io` (só o domínio, sem `/smartmarket`).
4. O backend continua em outro host (Render/Fly, ver `backend/DEPLOY.md`); banco, fotos e catálogo ficam no Neon (ver `docs/ASSETS-NEON.md`).

## Como funciona

- **Base `/smartmarket/`**: o workflow define `VITE_BASE`; o Vite prefixa os assets e o `BrowserRouter` usa `basename`. Caminhos escritos à mão no código (`/images/categorias/...`, `/video/...`) passam por `urlPublica` (`src/utils/urlPublica.js`; o `urlAssets.js` é outra coisa: reescreve as fotos para o bucket). Ao criar um caminho novo para `frontend/public`, use `urlPublica("/...")`. Fora do Pages a base é `/` e nada muda.
- **Rotas (SPA)**: o Pages não tem fallback; o workflow copia `index.html` para `404.html`, então abrir `/smartmarket/catalog` direto carrega o app. A resposta técnica é 404, o que não afeta o uso, mas crawlers não indexam essas rotas.
- **Tamanho**: o `dist` publicado tem ~5 MB (fotos e catálogo vêm do bucket); o workflow falha acima de 20 MB.

## Content-Security-Policy

Como o Pages não aceita cabeçalhos, a política vai numa `<meta http-equiv="Content-Security-Policy">` que o plugin `frontend/vite-plugins/csp.js` injeta no `index.html` **só no build** (no `npm run dev` ela não existe, por causa do HMR). A política é `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'`, e as origens externas são montadas a partir das variáveis do build:

| Diretiva | Recebe |
| --- | --- |
| `connect-src` | origem de `VITE_API_URL` e de `VITE_CATALOGO_URL` (só esquema + host, sem caminho) |
| `img-src` | `'self' data: https:` (as fotos também vêm de URLs https dos próprios mercados) e a origem de `VITE_ASSETS_BASE_URL` |
| `media-src` | `'self'` e a origem de `VITE_ASSETS_BASE_URL` |

Ao trocar o host da API, do catálogo ou do bucket, basta atualizar a variável do workflow: a política acompanha no próximo build. Um `fetch` para um host fora da lista aparece no console como violação de `connect-src`.

**Regra para quem mexe no front:** origem externa nova (outra API, CDN, fonte, script, iframe) não funciona só por aparecer no código; ela precisa entrar na política. Se for uma das três já previstas, entra pela variável do build (`VITE_API_URL`, `VITE_CATALOGO_URL`, `VITE_ASSETS_BASE_URL`); se for outro tipo de origem, é preciso ampliar `montarCsp` em `frontend/vite-plugins/csp.js` (e o teste `csp.test.js`). Sem isso, o navegador bloqueia script externo, `eval` e `fetch`/WebSocket para host fora da lista (imagens https continuam liberadas).

Limites de uma `<meta>`: `frame-ancestors` é ignorado, então o site pode ser embutido em iframe (clickjacking) até que o host envie `X-Frame-Options`/`frame-ancestors` por cabeçalho. O JWT continua em `localStorage` (`sm_token`); a CSP reduz o impacto de um XSS futuro, mas não o elimina.

## Rodar local com a mesma base

```bash
cd frontend
VITE_BASE=/smartmarket/ npm run build && npx vite preview   # abre em /smartmarket/
```

## Limitações

- Sem domínio próprio o endereço é `github.io/smartmarket`. Com domínio próprio, defina `VITE_BASE=/` no workflow e configure o domínio em Settings > Pages.
- Pages não aplica cabeçalhos customizados nem rewrites; qualquer proxy ou redirecionamento precisa ser feito no backend ou no CDN do bucket.
