# SmartMarket

Comparador de preços entre supermercados — Grupo 40, Trilha Dev Full Stack 2026.

## Estrutura

- `/frontend` — React 19 + Tailwind CSS v4 + Vite (catálogo com ~9,4 mil produtos; fotos e catálogo vêm do Neon Object Storage em produção)
- `/backend` — Spring Boot 4 / Java 17 (APIs REST, JPA, JWT)
- `/scraper` — Robôs de coleta de preços para as 8 maiores redes do RS + Downloader de Imagens + Agendador Diário
- `/docs` — Documentação técnica, arquitetura de dados e diagramas
- `/.claude` — Skills e agentes de apoio ao desenvolvimento (revisão de código, caça a bugs, TDD)

## Cobertura de Supermercados (Rio Grande do Sul)

Coletores para as 8 principais redes gaúchas. A rotina diária coleta **6**: Zaffari e Rissul estão **suspensas** (o `robots.txt` delas proíbe `/api/`, que os coletores usam), então os preços dessas duas são históricos:
- **Zaffari / Bourbon** (VTEX Catalog System, suspensa)
- **Supermercados Rissul** (VTEX Catalog System, suspensa)
- **Asun Supermercados** (Sense / OSuper API)
- **Stok Center** (VipCommerce API)
- **Atacadão RS** (VTEX Catalog System)
- **Master Supermercados** (VipCommerce API)
- **Fort Atacadista** (Sense / OSuper API)
- **Carrefour Mercado** (storefront headless, stream React Router)

Documentação técnica completa da expansão: [docs/EXPANSAO_RS_SCRAPERS.md](docs/EXPANSAO_RS_SCRAPERS.md).

## Testes

Meta: **70% de cobertura** no back-end e no front-end. O que o CI realmente impõe:

- **Front-end**: o CI roda `npm run test:coverage`, e o `coverageThreshold` global de 70% (branches, functions, lines e statements, em `jest.config.cjs`) reprova o PR se cair. `npm test` roda os testes **sem** checar cobertura.
- **Back-end**: o JaCoCo (`check` na fase `test` do `pom.xml`) exige 70% de **linhas** e de **branches**; funções e statements não são medidos, e `SmartMarketApplication` fica fora da conta. Um `./mvnw test` abaixo disso falha.
- **Scraper**: não há limiar de cobertura, só a suíte passando.

- Scrapers (Python): `python -m unittest discover -s scraper/tests` (367 testes; 32 pulados por exigirem Postgres de teste ou rede)
- Back-end (Java): `cd backend` e `./mvnw test` (Windows: `.\mvnw.cmd test`)
- Front-end (React): `cd frontend` e `npm test` ou `npm run test:coverage` (Jest + React Testing Library)

O CI (`.github/workflows/ci.yml`) roda as três suítes e o build do front em todo PR e push na `main`.

## Automação Diária de Coleta

- **GitHub Actions**: Workflow agendado para rodar todo dia às 04:00 BRT (`.github/workflows/coleta_diaria.yml`). **Hoje só verifica**: instala as dependências e roda os testes do scraper. A coleta só roda se o secret `SMARTMARKET_DSN` existir e `validar_dsn` aceita apenas PostgreSQL local, então um runner hospedado nunca grava preços, `data.js` ou catálogo.
- **Servidor Linux**: Shell script com logs rotacionados (`scraper/cron_coleta_diaria.sh`)
- **Daemon Systemd**: Serviço contínuo em segundo plano (`scraper/agendador_servico.py`)

A coleta real é feita por `scraper/rotina_carga.py` (nos dois últimos). Ela pula Zaffari e Rissul, só marca produtos como indisponíveis após coleta completa e exaustiva (nenhuma rede real é exaustiva hoje), manda registros inválidos para `quarentena.json` em vez de derrubar a carga da rede e recupera sozinha um lock órfão. Detalhes em [`scraper/ROTINA-DE-CARGA.md`](scraper/ROTINA-DE-CARGA.md).

## Produção

| Parte | Onde | Como |
|---|---|---|
| Frontend | **GitHub Pages** (`https://smartmarket-team.github.io/smartmarket/`) | Workflow `.github/workflows/deploy-pages.yml`, a cada push na `main` que mexa em `frontend/`. Guia: [`docs/DEPLOY-PAGES.md`](docs/DEPLOY-PAGES.md) |
| Backend | **Render** (Docker, plano grátis) | `backend/Dockerfile` + variáveis de ambiente; `render.yaml` na raiz descreve o serviço, com `autoDeployTrigger: checksPass` (o deploy automático só dispara depois que o CI passar). Guia: [`backend/DEPLOY.md`](backend/DEPLOY.md) |
| Banco | **Neon** (Postgres) | Schema e carga em `backend/deploy/`. Guia: [`docs/PRODUCAO-NEON.md`](docs/PRODUCAO-NEON.md) |
| Fotos e catálogo | **Neon Object Storage** (bucket público `smartmarket-assets`) | Sai do deploy do front; `scripts/assets-neon/` envia os arquivos. Guia: [`docs/ASSETS-NEON.md`](docs/ASSETS-NEON.md) |
| Coleta de preços | GitHub Actions (`coleta_diaria.yml`) e/ou servidor próprio | Só roda testes e gera arquivos; **grava apenas em Postgres local** (trava `validar_dsn`). Ver `scraper/ROTINA-DE-CARGA.md` |

Variáveis do front (build): `VITE_API_URL` (URL do backend, termina em `/api`), `VITE_BASE`, `VITE_ASSETS_BASE_URL` e `VITE_CATALOGO_URL`; o workflow do Pages define as três últimas e lê `VITE_API_URL` das *Variables* do repositório.

> A Vercel foi abandonada: o `vercel.json` e `docs/PLANO-DEPLOY-VERCEL.md` ficam apenas como histórico.

### Regras que o código impõe (resumo)

- **Segurança do backend**: o papel do usuário é lido do banco a cada requisição (a claim do token não manda); `SMARTMARKET_JWT_SECRET` precisa ter pelo menos 32 bytes e não pode ser o valor de exemplo do `.env.example`, senão o backend não sobe; o e-mail é normalizado (minúsculas, sem espaços); entrada malformada responde 400, não 500; a lista de compras aceita quantidade de 1 a 999 por item e até 100 itens. Detalhes em [`backend/README.md`](backend/README.md).
- **Busca por nome** usa `produto.nome_normalizado` (sem acento). Bancos que já receberam a carga original precisam rodar uma vez, à mão, `backend/deploy/05_corrige_nome_normalizado.sql` (ver `backend/DEPLOY.md`).
- **CSP do front** é injetada no build por `frontend/vite-plugins/csp.js`; origem externa nova precisa entrar pelas variáveis `VITE_*` (ou ampliar o plugin). Ver `docs/DEPLOY-PAGES.md`.
- **Dados locais do usuário**: favoritos, alertas e lista de compras vivem no navegador (alertas não enviam aviso; a lista some ao fechar a aba) e são guardados por conta no logout/401, nunca apagados. Ver [`docs/DADOS-LOCAIS-DO-USUARIO.md`](docs/DADOS-LOCAIS-DO-USUARIO.md).
- **Workflows**: `bloqueia-arquivos-dev.yml`, `coleta_diaria.yml` e `deploy-pages.yml` declaram `permissions: contents: read` (o deploy do Pages sobe `pages: write` e `id-token: write` só no job `deploy`). O `ci.yml` não declara `permissions` e usa o padrão do repositório.

## Como contribuir

1. Crie uma branch a partir de `main`: `feature/nome-da-tarefa` (também valem `feat/`, `fix/`, `docs/`, `chore/`, `ci/` e `perf/`)
2. Abra um Pull Request descrevendo o que foi feito (o template em `.github/pull_request_template.md` já traz o checklist)
3. Peça revisão de alguém antes do merge

### Skills e agentes (`.claude/`)

Para quem usa o Claude Code: `/code-review` (padrões + especificação), `/security-review`, `/tdd`, `/diagnosing-bugs` e `/cacar-bugs` (varredura de bugs com o agente `cacador-de-bugs`). Detalhes de comandos e arquitetura em [`CLAUDE.md`](CLAUDE.md).
