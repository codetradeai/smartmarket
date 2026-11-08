# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

SmartMarket é um comparador de preços de supermercados do RS (Grupo 40, Trilha Dev Full Stack 2026). Monorepo com três partes independentes que se comunicam via PostgreSQL e API REST:

- `frontend/` — React 19 + Vite + Tailwind v4 (SPA, servida por Nginx em produção)
- `backend/` — Spring Boot 4.0 / Java 17 (API REST, JPA, JWT)
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
A URL da API vem de `VITE_API_URL` (padrão `http://localhost:8080/api`).

Testes: o runner único é **Jest + React Testing Library** (decisão do grupo, ver `docs/TESTES.md`). Configuração em `jest.config.cjs` (jsdom, setup em `jest/setupTests.cjs`) e `babel.config.cjs`. Use as globais do Jest (`describe`/`it`/`expect`) e `jest.fn`/`jest.mock`/`jest.useFakeTimers`; não importe de `vitest`. Testes que importam o `data.js` real (32 MB) devem usar a fixture: `jest.mock('../data', () => require('../test/dataFixture'))`. No Windows, se o caminho tiver `&`, rode `node node_modules/jest/bin/jest.js` em vez de `npm test`.

Cobertura mínima de **70%** (branches, functions, lines e statements) no front (`coverageThreshold` do `jest.config.cjs`) e no back (JaCoCo). Não baixe o limiar sem acordo do grupo; escreva testes para o código novo.

### Backend (`cd backend`)
```bash
docker compose up -d postgres     # Postgres de dev em localhost:5436 (diferente do compose da raiz, que usa 5432)
./mvnw spring-boot:run            # perfil "dev" por padrão (Windows: .\mvnw.cmd)
./mvnw test
./mvnw test -Dtest=NomeDaClasse#metodo   # um único teste
```
Perfis: `dev` (ddl-auto=update, carrega `data.sql`), `prod` (tudo via variáveis de ambiente), `test`. O padrão em `application.properties` é `ddl-auto=validate`.

### Scraper (raiz do repo)
```bash
pip install -r scraper/requirements.txt
python -m unittest discover -s scraper/tests -v          # suíte inteira (offline)
python -m unittest scraper.tests.test_x.Classe.metodo    # um único teste (ajuste ao módulo)
python scraper/coleta_fort_atacadista.py --fixture scraper/tests/fixtures/fort_valido.json --output-dir scraper/output/fort_valido   # demo offline
```
Exit codes dos coletores: `0` sucesso, `2` sucesso parcial, `1` falha total (saída anterior preservada).

### Stack completa
`docker compose up --build` na raiz sobe postgres (5432), backend (8080) e frontend.

### CI
`.github/workflows/ci.yml` roda `./mvnw clean test -B` e, no front, `npm ci` + testes + build (Node 24, JDK 17). `coleta_diaria.yml` executa a coleta às 04:00 BRT. Meta de cobertura: 70% em back e front.

## Arquitetura

### Fluxo de dados
Scrapers coletam preços por rede → normalizam → gravam em PostgreSQL (tabelas `produto`, `mercado`, `preco` com histórico) → backend expõe via REST → frontend consome via serviços axios.

### Scraper
- Um módulo `coleta_<rede>.py` por rede (Zaffari, Rissul, Atacadão, Asun, Stok, Master, Fort, Carrefour), todos obedecendo o **Contrato de Extração v1** (JSON/CSV com colunas idênticas, `Decimal`, moeda BRL, gravação atômica). Veja `scraper/README.md` para o contrato completo.
- `normalizacao.py` normaliza nomes/medidas; `pipeline.py` faz a carga transacional com idempotência por hash e **valida que o DSN é um PostgreSQL local** (`validar_dsn`) — não contorne essa trava.
- `rotina_carga.py` é o orquestrador (one-shot ou daemon, com lock de processo multiplataforma); `agendador_servico.py` / `cron_coleta_diaria.sh` / `smartmarket-scraper.service` são as formas de agendamento. `executar_pipeline.py` usa `fcntl` (somente Unix).
- Produtos que somem da coleta são marcados `disponivel = FALSE`; cada coleta bem-sucedida gera nova linha em `preco` (histórico).

### Backend (`com.smartmarket`)
Camadas clássicas: `controller` → `service` → `repository` (Spring Data JPA) → `model`, com DTOs agrupados por domínio em `dto/<dominio>`. Domínios: auth, produto, mercado, preco, promoção, favorito, lista de compras, alerta, admin. `ComparadorService` concentra a comparação de preços. `exception/GlobalExceptionHandler` centraliza erros. Segurança em `security/`: JWT (`JwtTokenProvider`), `RateLimitingFilter`, papéis em `Papel`; CORS controlado por `SMARTMARKET_CORS_ORIGINS`, segredo por `SMARTMARKET_JWT_SECRET`. `open-in-view` está desligado (cuidado com lazy loading fora de transação). Consultas SQL otimizadas de referência em `backend/smartmarket_queries_otimizadas.sql`.

### Frontend
- `services/api.js`: instância axios única; injeta `Bearer` a partir de `localStorage["sm_token"]` e trata 401/403 no interceptor de resposta. Um arquivo de serviço por domínio (`produtoService`, `favoritoService`, ...), reexportados por `services/index.js`.
- `contexts/AuthContext.jsx` + `hooks/useAuth.js` guardam a sessão; `components/ProtectedRoute.jsx` protege rotas; `components/Layout.jsx` é o shell (menu, navegação).
- Páginas em `pages/` (Home, Catalog, Favorites, ShoppingList, Admin, Auth, Sobre). Visitantes veem a home com apresentação; busca e comparador direcionam ao cadastro. Componentes de UI base em `components/ui`; guia visual em `frontend/DESIGN-SYSTEM.md`.

## Convenções
- Branches: `feature/nome-da-tarefa` a partir de `main`; PR com revisão antes do merge (template em `.github/pull_request_template.md`).
- `login/`, `output/` e `frontend/templates/` não são código da aplicação (artefatos/protótipos).
- Comentários de bots nas PRs (ECC Tools, Vercel): veja `docs/COMENTARIOS-DE-BOTS.md` para saber quais olhar e quais ignorar.

## Agent skills

### Issue tracker

As issues ficam no GitHub Issues de `smartmarket-team/smartmarket` (CLI `gh`). Veja `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulário padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Veja `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` e `docs/adr/` na raiz, criados sob demanda. Veja `docs/agents/domain.md`.
