# Fotos e catálogo no Neon Object Storage

Para o deploy na Vercel não carregar ~50 MB de fotos e ~28 MB de catálogo (`data.js`) a cada build, esses arquivos ficam num bucket público do Neon (`smartmarket-assets`, declarado em `neon.ts`). O `dist` cai de ~85 MB para ~5 MB.

## Como funciona

| O quê | Onde fica no bucket | Variável do build (Vercel) |
|---|---|---|
| Fotos (`/images/produtos/**`) | `images/produtos/<arquivo>` | `VITE_ASSETS_BASE_URL` |
| Catálogo (9.406 produtos, JSON em gzip, ~3,5 MB) | `catalogo/produtos.json` | `VITE_CATALOGO_URL` |

- Sem as variáveis, nada muda: dev local, Docker e testes continuam usando `frontend/public` e `src/data.js`.
- Com `VITE_CATALOGO_URL`, o Vite descarta o `import("../data")` e o chunk de ~28 MB nem é gerado (`src/utils/carregarProdutos.js`).
- Com `VITE_ASSETS_BASE_URL`, os caminhos `/images/produtos/...` são reescritos para o bucket na carga do catálogo (`src/utils/urlAssets.js`).

## Configurar na Vercel

1. Environment Variables (Production e Preview), valores públicos:
   - `VITE_ASSETS_BASE_URL` = `https://br-rough-pond-bcbjyd79.storage.c-16.us-east-1.aws.neon.tech/smartmarket-assets`
   - `VITE_CATALOGO_URL` = `https://br-rough-pond-bcbjyd79.storage.c-16.us-east-1.aws.neon.tech/smartmarket-assets/catalogo/produtos.json`
2. Build Command: `npm run build:vercel` (faz `vite build` e remove `dist/images/produtos`; recusa rodar sem `VITE_ASSETS_BASE_URL`).

## Reenviar fotos ou catálogo

Quando o `data.js` ou as fotos mudarem:

```bash
neon env pull                       # grava as credenciais S3 em .env.local (não vai pro git)
cd scripts/assets-neon && npm install
npm run catalogo                    # gera saida/produtos.json(.gz) a partir de frontend/src/data.js
npm run simular                     # mostra o que seria enviado, sem enviar
npm run enviar                      # envia fotos novas (as já presentes com mesmo tamanho são puladas) e o catálogo
```

Flags de `enviar.mjs`: `--so-imagens`, `--so-catalogo`, `--cors` (reaplica CORS GET/HEAD de qualquer origem). O script lê as credenciais só do `.env.local` e nunca as imprime.

## Limites e cuidados

- Plano gratuito do Neon: 5 GB de armazenamento e 5 GB de transferência por mês. Hoje são ~53 MB de fotos e ~3,5 MB de catálogo por visita (as fotos têm `Cache-Control: immutable`; o catálogo, 5 min).
- O bucket não tem CDN. Se o tráfego crescer, coloque a Cloudflare na frente (origem = endpoint do bucket) e troque o valor das duas variáveis.
- O bucket acompanha a branch do Neon (`production`). Branches de preview herdam uma cópia; só a de produção é a origem das URLs acima.
- Alterar o catálogo sem mudar o nome mantém o cache por até 5 min; fotos novas devem ter nome novo (o nome já leva hash).
