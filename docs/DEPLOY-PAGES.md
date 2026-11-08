# Deploy do frontend no GitHub Pages

O frontend é publicado em **https://smartmarket-team.github.io/smartmarket/** pelo workflow `.github/workflows/deploy-pages.yml` a cada push na `main` que mexa em `frontend/`, ou à mão (Actions > Deploy do frontend no GitHub Pages > Run workflow).

## Configurar (uma vez)

1. **Settings > Pages > Source = "GitHub Actions"**.
2. **Settings > Secrets and variables > Actions > Variables**: crie `VITE_API_URL` com a URL pública do backend, terminada em `/api` (ex.: `https://smartmarket-api.onrender.com/api`). Sem ela o app abre, mas as chamadas à API falham (o Pages não faz proxy de `/api`).
3. No backend, libere o endereço do Pages no CORS: `SMARTMARKET_CORS_ORIGINS=https://smartmarket-team.github.io` (só o domínio, sem `/smartmarket`).
4. O backend continua em outro host (Render/Fly, ver `backend/DEPLOY.md`); banco, fotos e catálogo ficam no Neon (ver `docs/ASSETS-NEON.md`).

## Como funciona

- **Base `/smartmarket/`**: o workflow define `VITE_BASE`; o Vite prefixa os assets e o `BrowserRouter` usa `basename`. Caminhos escritos à mão no código (`/images/categorias/...`, `/video/...`) passam por `urlPublica` (`src/utils/urlAssets.js`). Ao criar um caminho novo para `frontend/public`, use `urlPublica("/...")`. Fora do Pages a base é `/` e nada muda.
- **Rotas (SPA)**: o Pages não tem fallback; o workflow copia `index.html` para `404.html`, então abrir `/smartmarket/catalog` direto carrega o app. A resposta técnica é 404, o que não afeta o uso, mas crawlers não indexam essas rotas.
- **Tamanho**: o `dist` publicado tem ~5 MB (fotos e catálogo vêm do bucket); o workflow falha acima de 20 MB.

## Rodar local com a mesma base

```bash
cd frontend
VITE_BASE=/smartmarket/ npm run build && npx vite preview   # abre em /smartmarket/
```

## Limitações

- Sem domínio próprio o endereço é `github.io/smartmarket`. Com domínio próprio, defina `VITE_BASE=/` no workflow e configure o domínio em Settings > Pages.
- Pages não aplica cabeçalhos customizados nem rewrites; qualquer proxy ou redirecionamento precisa ser feito no backend ou no CDN do bucket.
