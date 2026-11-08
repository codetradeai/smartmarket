# SmartMarket

Comparador de preços entre supermercados — Grupo 40, Trilha Dev Full Stack 2026.

## Estrutura

- `/frontend` — React 19 + Tailwind CSS v4 + Vite (catálogo com ~9,4 mil produtos; fotos e catálogo vêm do Neon Object Storage em produção)
- `/backend` — Spring Boot 4 / Java 17 (APIs REST, JPA, JWT)
- `/scraper` — Robôs de coleta de preços para as 8 maiores redes do RS + Downloader de Imagens + Agendador Diário
- `/docs` — Documentação técnica, arquitetura de dados e diagramas
- `/.claude` — Skills e agentes de apoio ao desenvolvimento (revisão de código, caça a bugs, TDD)

## Cobertura de Supermercados (Rio Grande do Sul)

Monitoramento diário nas 8 principais redes gaúchas:
- **Zaffari / Bourbon** (VTEX Catalog System)
- **Supermercados Rissul** (VTEX Catalog System)
- **Asun Supermercados** (Sense / OSuper API)
- **Stok Center** (VipCommerce API)
- **Atacadão RS** (VTEX Catalog System)
- **Master Supermercados** (VipCommerce API)
- **Fort Atacadista** (API REST Interna)
- **Carrefour Mercado** (API Pública)

Documentação técnica completa da expansão: [docs/EXPANSAO_RS_SCRAPERS.md](docs/EXPANSAO_RS_SCRAPERS.md).

## Testes

Meta: **70% de cobertura** no back-end e no front-end.

- Scrapers (Python): `python -m unittest discover -s scraper/tests` (295 testes; 32 pulados por exigirem rede)
- Back-end (Java): `cd backend` e `./mvnw test` (Windows: `.\mvnw.cmd test`)
- Front-end (React): `cd frontend` e `npm test` ou `npm run test:coverage` (Jest + React Testing Library)

O CI (`.github/workflows/ci.yml`) roda as três suítes e o build do front em todo PR e push na `main`.

## Automação Diária de Coleta

- **GitHub Actions**: Workflow agendado para rodar todo dia às 04:00 BRT (`.github/workflows/coleta_diaria.yml`)
- **Servidor Linux**: Shell script com logs rotacionados (`scraper/cron_coleta_diaria.sh`)
- **Daemon Systemd**: Serviço contínuo em segundo plano (`scraper/agendador_servico.py`)

## Produção

| Parte | Onde | Como |
|---|---|---|
| Frontend | **GitHub Pages** (`https://smartmarket-team.github.io/smartmarket/`) | Workflow `.github/workflows/deploy-pages.yml`, a cada push na `main` que mexa em `frontend/`. Guia: [`docs/DEPLOY-PAGES.md`](docs/DEPLOY-PAGES.md) |
| Backend | **Render** (Docker, plano grátis) | `backend/Dockerfile` + variáveis de ambiente; `render.yaml` na raiz descreve o serviço. Guia: [`backend/DEPLOY.md`](backend/DEPLOY.md) |
| Banco | **Neon** (Postgres) | Schema e carga em `backend/deploy/`. Guia: [`docs/PRODUCAO-NEON.md`](docs/PRODUCAO-NEON.md) |
| Fotos e catálogo | **Neon Object Storage** (bucket público `smartmarket-assets`) | Sai do deploy do front; `scripts/assets-neon/` envia os arquivos. Guia: [`docs/ASSETS-NEON.md`](docs/ASSETS-NEON.md) |
| Coleta de preços | GitHub Actions (`coleta_diaria.yml`) e/ou servidor próprio | Só roda testes e gera arquivos; **grava apenas em Postgres local** (trava `validar_dsn`). Ver `scraper/ROTINA-DE-CARGA.md` |

Variáveis do front (build): `VITE_API_URL` (URL do backend, termina em `/api`), `VITE_BASE`, `VITE_ASSETS_BASE_URL` e `VITE_CATALOGO_URL`; o workflow do Pages define as três últimas e lê `VITE_API_URL` das *Variables* do repositório.

> A Vercel foi abandonada: o `vercel.json` e `docs/PLANO-DEPLOY-VERCEL.md` ficam apenas como histórico.

## Como contribuir

1. Crie uma branch a partir de `main`: `feature/nome-da-tarefa` (também valem `feat/`, `fix/`, `docs/`, `chore/`, `ci/` e `perf/`)
2. Abra um Pull Request descrevendo o que foi feito (o template em `.github/pull_request_template.md` já traz o checklist)
3. Peça revisão de alguém antes do merge

### Skills e agentes (`.claude/`)

Para quem usa o Claude Code: `/code-review` (padrões + especificação), `/security-review`, `/tdd`, `/diagnosing-bugs` e `/cacar-bugs` (varredura de bugs com o agente `cacador-de-bugs`). Detalhes de comandos e arquitetura em [`CLAUDE.md`](CLAUDE.md).
