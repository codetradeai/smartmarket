# Fotos e catálogo no Neon Object Storage

Para o deploy não carregar ~50 MB de fotos e ~28 MB de catálogo (`data.js`) a cada build (na Vercel isso estourou 8 GB de armazenamento), esses arquivos ficam num bucket público do Neon (`smartmarket-assets`, declarado em `neon.ts`). O `dist` cai de ~85 MB para ~5 MB.

## Como funciona

| O quê | Onde fica no bucket | Variável do build |
|---|---|---|
| Fotos (`/images/produtos/**`) | `images/produtos/<arquivo>` | `VITE_ASSETS_BASE_URL` |
| Catálogo (9.406 produtos, JSON em gzip, ~3,5 MB) | `catalogo/produtos.json` | `VITE_CATALOGO_URL` |

- Sem as variáveis, nada muda: dev local, Docker e testes continuam usando `frontend/public` e `src/data.js`.
- Com `VITE_CATALOGO_URL`, o Vite descarta o `import("../data")` e o chunk de ~28 MB nem é gerado (`src/utils/carregarProdutos.js`).
- Com `VITE_ASSETS_BASE_URL`, os caminhos `/images/produtos/...` são reescritos para o bucket na carga do catálogo (`src/utils/urlAssets.js`).

## Configurar o deploy

O frontend é publicado no **GitHub Pages** (`docs/DEPLOY-PAGES.md`). O workflow `deploy-pages.yml` já define as duas variáveis abaixo (valores públicos) e roda `npm run build:estatico`, que faz o `vite build` e remove `dist/images/produtos`; o script recusa rodar sem `VITE_ASSETS_BASE_URL`.

Para outra hospedagem estática (ou a Vercel, se voltar a ser usada), defina no build:
- `VITE_ASSETS_BASE_URL` = `ENDPOINT/smartmarket-assets`
- `VITE_CATALOGO_URL` = `ENDPOINT/smartmarket-assets/catalogo/produtos.json`

e use `npm run build:estatico` como comando de build. Os valores atuais estão em `.github/workflows/deploy-pages.yml`.

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
- **O catálogo do bucket é estático.** A coleta diária (`coleta_diaria.yml`) regenera o `data.js` mas **não** republica `catalogo/produtos.json`; depois de mudar o catálogo, rode `npm run catalogo && npm run enviar` (seção acima). Alterações aparecem no site em até 5 min (cache do catálogo).
- **Cache das fotos:** só nomes com hash de conteúdo (`<id>_<12 hex>.<ext>`) recebem `immutable` de 1 ano; galeria e frames 360 têm cache de 1 dia. Fotos enviadas antes dessa regra continuam com `immutable`: se regerar um arquivo sem hash, mude o nome ou a pasta.
