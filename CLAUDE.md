# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

SmartMarket é um comparador de preços de supermercados do RS (Grupo 40, Trilha Dev Full Stack 2026). Monorepo com três partes independentes que se comunicam via PostgreSQL e API REST:

- `frontend/` — React 19 + Vite + Tailwind v4 (SPA, servida por Nginx em produção)
- `backend/` — Spring Boot 4.1 / Java 17 (API REST, JPA, JWT)
- `scraper/` — Python: coletores por rede, normalização e carga no PostgreSQL
- `docs/` — documentação técnica, modelagem ER, cenários de teste; `output/` guarda dados coletados

Idioma do projeto: código de domínio, comentários, commits e documentação em PT-BR.

## Comandos

### Frontend (`cd frontend`)
```bash
npm run dev            # Vite em http://localhost:5174
npm run build
npm run lint
npm test               # jest (suíte inteira)
npm test -- src/utils/relatedProducts.test.js   # um único arquivo
npm test -- -t "nome do teste"                  # um único teste
npm run test:watch
npm run test:coverage  # falha se a cobertura global ficar abaixo de 70%
```
A URL da API vem de `VITE_API_URL` (padrão `http://localhost:8080/api`). Outras variáveis de build (todas opcionais; sem elas nada muda no dev local, Docker e testes): `VITE_BASE` (base do app, `/smartmarket/` no GitHub Pages), `VITE_ASSETS_BASE_URL` (fotos de produtos no bucket do Neon) e `VITE_CATALOGO_URL` (catálogo em JSON no bucket). No build, `vite-plugins/csp.js` injeta a Content-Security-Policy numa `<meta>` e monta o `connect-src`, `img-src` e `media-src` a partir dessas três variáveis: **origem externa nova (API, CDN, bucket) precisa entrar por elas ou ampliando o plugin**, senão o navegador a bloqueia em produção (ver `docs/DEPLOY-PAGES.md`). Caminhos de `frontend/public` escritos à mão (`/images/...`, `/video/...`) devem passar por `urlPublica` (`src/utils/urlPublica.js`) para respeitar a base. Deploy do front: `docs/DEPLOY-PAGES.md`; fotos e catálogo: `docs/ASSETS-NEON.md`.

Testes: o runner único é **Jest + React Testing Library** (decisão do grupo, ver `docs/TESTES.md`). Configuração em `jest.config.cjs` (jsdom, setup em `jest/setupTests.cjs`) e `babel.config.cjs`. Use as globais do Jest (`describe`/`it`/`expect`) e `jest.fn`/`jest.mock`/`jest.useFakeTimers`; não importe de `vitest`. Testes que importam o `data.js` real (32 MB) devem usar a fixture: `jest.mock('../data', () => require('../test/dataFixture'))`. No Windows, se o caminho tiver `&`, rode `node node_modules/jest/bin/jest.js` em vez de `npm test`.

Cobertura mínima de **70%**. No front são os quatro contadores do `coverageThreshold` do `jest.config.cjs` (branches, functions, lines e statements), avaliados só com `--coverage`: o CI roda `npm run test:coverage`, mas `npm test` **não** checa cobertura (o `src/ciCobertura.test.js` trava o workflow e o limiar). No back o JaCoCo (`check` na fase `test` do `pom.xml`) exige 70% de **linhas** e de **branches**, com `SmartMarketApplication` excluída; funções e statements não são medidos. Não baixe o limiar sem acordo do grupo; escreva testes para o código novo.

### Backend (`cd backend`)
```bash
docker compose --env-file ../.env up -d postgres   # Postgres de dev em localhost:5436 (diferente do compose da raiz, que usa 5432)
./mvnw spring-boot:run            # perfil "dev" por padrão (Windows: .\mvnw.cmd)
./mvnw test
./mvnw test -Dtest=NomeDaClasse#metodo   # um único teste
```
Perfis: `dev` (ddl-auto=update, carrega `data.sql`), `prod` (tudo via variáveis de ambiente), `test`. O padrão em `application.properties` é `ddl-auto=validate`.
O `backend/docker-compose.yml` **não** lê o `.env` da raiz (o Compose procura o `.env` ao lado do compose file), por isso o `--env-file ../.env` acima; o Spring também não lê `.env`: exporte `SMARTMARKET_JWT_SECRET` (mínimo 32 bytes) e `POSTGRES_PASSWORD` no shell. Detalhes em `backend/README.md`.

### Scraper (raiz do repo)
```bash
pip install -r scraper/requirements.txt
python -m unittest discover -s scraper/tests -v          # suíte inteira (offline)
python -m unittest scraper.tests.test_x.Classe.metodo    # um único teste (ajuste ao módulo)
python scraper/coleta_fort_atacadista.py --fixture scraper/tests/fixtures/fort_valido.json --output-dir scraper/output/fort_valido   # demo offline
```
Exit codes dos coletores: `0` sucesso, `1` falha total (saída anterior preservada) e, só em Fort, Carrefour, Asun e Atacadão, `2` sucesso parcial. Master, Stok, Zaffari e Rissul devolvem apenas `0` ou `1`.

### Stack completa
`docker compose up --build` na raiz sobe postgres (5432), backend (8080) e frontend.

### CI
`.github/workflows/ci.yml` roda `./mvnw clean test -B` (JaCoCo: 70% de linhas e branches) e, no front, `npm ci` + `npm run test:coverage` (limiar de 70% em quatro contadores) + build (Node 24, JDK 17), além do scraper. `deploy-pages.yml` publica o front no GitHub Pages a cada push na `main` que mexa em `frontend/`. `coleta_diaria.yml` roda às 04:00 BRT, mas **só verifica**: instala dependências e roda os testes do scraper; a rotina de coleta só executa com o secret `SMARTMARKET_DSN` e `validar_dsn` só aceita Postgres local, então o runner nunca grava preço nem publica `data.js`. `bloqueia-arquivos-dev.yml` barra arquivos de dev pessoal (`.ai/`, `AGENTS.md`, `.neon`). Os três últimos declaram `permissions: contents: read` (o deploy do Pages sobe `pages: write`/`id-token: write` só no job `deploy`); o `ci.yml` não declara `permissions`. No Render, `render.yaml` usa `autoDeployTrigger: checksPass`: o deploy automático do backend só dispara depois que o CI passar.

## Arquitetura

### Fluxo de dados
Scrapers coletam preços por rede → normalizam → gravam em PostgreSQL (tabelas `produto`, `mercado`, `preco` com histórico) → backend expõe via REST → frontend consome via serviços axios.

### Scraper
- Um módulo `coleta_<rede>.py` por rede (Zaffari, Rissul, Atacadão, Asun, Stok, Master, Fort, Carrefour), todos obedecendo o **Contrato de Extração v1** (JSON/CSV com colunas idênticas, `Decimal`, moeda BRL, gravação atômica). Veja `scraper/README.md` para o contrato completo.
- `normalizacao.py` normaliza nomes/medidas; `pipeline.py` faz a carga transacional com idempotência por hash e **valida que o DSN é um PostgreSQL local** (`validar_dsn`) — não contorne essa trava.
- `rotina_carga.py` é o orquestrador (one-shot ou daemon, com lock de processo multiplataforma que recupera sozinho o lock órfão de um dono morto); `agendador_servico.py` / `cron_coleta_diaria.sh` / `smartmarket-scraper.service` são as formas de agendamento. `executar_pipeline.py` também tem lock para Unix (`fcntl`) e Windows (`msvcrt`). **Zaffari e Rissul estão suspensas na rotina** (`REDES_SUSPENSAS`: o `robots.txt` proíbe `/api/`), então a coleta diária cobre 6 redes.
- Registro inválido não derruba a carga da rede: vai para `quarentena.json` na pasta da execução (o lote só falha acima de 20% de rejeitados ou sem nenhum válido). Produtos ausentes só são marcados `disponivel = FALSE` quando a coleta é completa **e** exaustiva (`coleta_exaustiva`); hoje nenhum coletor real é exaustivo, então ninguém é marcado. Cada coleta bem-sucedida gera nova linha em `preco` (histórico).

### Backend (`com.smartmarket`)
Camadas clássicas: `controller` → `service` → `repository` (Spring Data JPA) → `model`, com DTOs agrupados por domínio em `dto/<dominio>`. Domínios: auth, produto, mercado, preco, promoção, favorito, lista de compras, alerta, admin. `ComparadorService` concentra a comparação de preços. `exception/GlobalExceptionHandler` centraliza erros. Segurança em `security/`: JWT (`JwtTokenProvider`), `RateLimitingFilter` (15 req/min por IP no login e no cadastro), papéis em `Papel`; CORS controlado por `SMARTMARKET_CORS_ORIGINS`, segredo por `SMARTMARKET_JWT_SECRET`. O papel do usuário é lido do banco a cada requisição (`PapelDoBancoJwtConverter`); a claim do token não decide, e token de usuário apagado dá 401. O segredo precisa ter ao menos 32 bytes e não pode ser o valor de exemplo do `.env.example`, ou a aplicação não sobe. E-mail é normalizado (minúsculas, sem espaços) no cadastro e ignora caixa no login. JSON malformado e parâmetro de tipo errado respondem 400 (não 500). Lista de compras: quantidade de 1 a 999 por item e até 100 itens por lista. A busca por nome (`GET /api/produtos?nome=`) usa só `produto.nome_normalizado`; bancos que já receberam a carga original precisam rodar uma vez, à mão, `backend/deploy/05_corrige_nome_normalizado.sql` (ver `backend/DEPLOY.md`). `open-in-view` está desligado (cuidado com lazy loading fora de transação). Consultas SQL otimizadas de referência em `backend/database/smartmarket_queries_otimizadas.sql`.

### Frontend
- `services/api.js`: instância axios única; injeta `Bearer` a partir de `localStorage["sm_token"]` e trata 401/403 no interceptor de resposta. Um arquivo de serviço por domínio (`produtoService`, `favoritoService`, ...), reexportados por `services/index.js`.
- `contexts/AuthContext.jsx` + `hooks/useAuth.js` guardam a sessão; `components/ProtectedRoute.jsx` protege rotas; `components/Layout.jsx` é o shell (menu, navegação).
- Favoritos, alertas de preço e lista de compras vivem no navegador (alerta não envia aviso; a lista fica no `sessionStorage`); `services/storageKeys.js` guarda esses dados por conta no logout/401 em vez de apagá-los. Ver `docs/DADOS-LOCAIS-DO-USUARIO.md`.
- O catálogo local (`data.js`, fonte do JSON estático que o app carrega por `fetch()`) usa ids `"p<id>"` e a API usa o `<id>` numérico; `utils/mesclarCatalogo.js` junta os dois (o id local é mantido, o da API fica em `apiId`). Não compare `String(id)` entre os dois formatos.
- Páginas em `pages/` (Home, Catalog, Favorites, ShoppingList, Admin, Auth, Sobre). Visitantes veem a home com apresentação; busca e comparador direcionam ao cadastro. Componentes de UI base em `components/ui`; guia visual em `frontend/DESIGN-SYSTEM.md`.

## Convenções
- Branches: `feature/nome-da-tarefa` a partir de `main` (também valem os prefixos `feat/`, `fix/`, `docs/`, `chore/`, `ci/` e `perf/`); PR com revisão antes do merge (template em `.github/pull_request_template.md`).
- `login/`, `output/` e `frontend/templates/` não são código da aplicação (artefatos/protótipos).
- Comentários de bots nas PRs (ECC Tools; a Vercel foi desativada): veja `docs/COMENTARIOS-DE-BOTS.md` para saber quais olhar e quais ignorar.

## Agent skills

### Agentes e skills do projeto (`.claude/`)

`cacador-de-bugs` (agente só de leitura que devolve apenas bugs verificados) e `cacar-bugs` (skill que orquestra caçadores em paralelo, verificação adversarial e relatório), além de `code-review`, `tdd`, `diagnosing-bugs`, `pr` e `triage`. A skill `tdd` pede para combinar com o usuário os pontos de teste antes de escrever testes.

### Issue tracker

As issues ficam no GitHub Issues de `smartmarket-team/smartmarket` (CLI `gh`). Veja `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulário padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Veja `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` e `docs/adr/` na raiz, criados sob demanda. Veja `docs/agents/domain.md`.
