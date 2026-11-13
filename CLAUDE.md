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

**Guarda de tamanho do `dist`:** o CI e o deploy do Pages rodam `scripts/verificar-tamanho-dist.sh` (dist de até 100 MB no CI e 20 MB no Pages, e no máximo 3 MB por arquivo, exceto o catálogo em JSON). É o passo que costuma derrubar o pipeline sem nenhum teste falhar: não commite vídeo ou mídia bruta em `frontend/public` (comprima antes ou sirva pelo bucket). Para reproduzir o do Pages, rode `npm run build:estatico` com as variáveis do `deploy-pages.yml`; esse script **não** dispara o `prebuild`, então não gere `public/catalogo/` antes.

## Arquitetura

### Fluxo de dados
Scrapers coletam preços por rede → normalizam → gravam em PostgreSQL (tabelas `produto`, `mercado`, `preco` com histórico, `loja` e `preco_loja`) → backend expõe via REST → frontend consome via serviços axios.

### Lojas e preço por loja
- `loja` é a filial de um mercado (rede): endereço, CEP, coordenadas e `codigo_externo` (único por mercado). Todo mercado tem a loja **padrão** (`codigo_externo = 'padrao'`), que recebe tudo o que é coletado: **o preço continua por rede, não se multiplica a coleta por filial**.
- `preco_loja` liga um `preco` (histórico por mercado) a uma loja, com `vigente_desde`, `vigente_ate` (nulo = vigente), `disponivel` e `confirmado_em` por loja, e repete `produto_id`. O mesmo preço vale em várias lojas sem duplicar o valor. `usuario` ganhou CEP, cidade, UF, coordenadas e `loja_preferida_id` (opcionais), e `promocao.loja_id` (nulo = rede toda).
- Migrations manuais, **só por ordem do responsável e nesta ordem**: `backend/deploy/06_lojas_por_cep.sql` (portável) e depois `07_indice_unico_vinculo_vigente.sql` (**só PostgreSQL**: índice único parcial `(loja_id, produto_id) WHERE vigente_ate IS NULL` e FK composta). Branch do banco no Neon antes. Validação em PostgreSQL real descartável: `bash backend/deploy/test_lojas_postgres.sh`. Detalhes em `backend/DEPLOY.md`. Em produção (Neon), o 06 e o 07 já foram aplicados em 12/11/2026; para um banco novo, continuam manuais e nesta ordem.
- A carga (`pipeline.gravar_preco_na_loja`): mesmo valor só avança `confirmado_em` (sem linha nova em `preco`); valor novo fecha o vínculo antigo **antes** de abrir o novo, na mesma transação (o índice do 07 recusa dois vigentes); coleta anterior ao vínculo vigente vai para a quarentena. Mudou: coleta com preço igual **não** gera mais linha em `preco`.
- Lojas reais vêm de lista curada (`scraper/lojas/lojas.json`, só de páginas públicas permitidas, com `fonte_url`; modelo em `lojas_modelo.json`): `python scraper/carregar_lojas.py` (upsert idempotente, respeita `validar_dsn`) e `python scraper/geocodificar_lojas.py` (BrasilAPI v2, ViaCEP de reserva, 1 consulta por CEP, 2 s entre chamadas, grava as coordenadas no próprio arquivo). Pesquisa de filiais por rede: `docs/PESQUISA-FILIAIS.md`.
- Fase 4C (backend) feita: localização pela **rua** do CEP. A BrasilAPI v2 devolve o centro da cidade para a maioria dos CEPs (36 CEPs de Porto Alegre caíram no mesmo ponto), então, quando o CEP tem rua, o `ResolvedorCep` pergunta ao Nominatim (OpenStreetMap) por "rua, bairro, cidade, UF, Brasil" e só aceita o resultado se a cidade devolvida for a do CEP e ficar a até 30 km da coordenada da BrasilAPI. Sem refino válido (rejeitado, não encontrado, erro, tempo esgotado), o usuário fica com cidade e UF **sem coordenadas**, nunca com o centro da cidade; CEP sem rua mantém a coordenada da BrasilAPI. O refino tem teto próprio (`smartmarket.cep.refino-timeout-ms`, 2000, fora dos 2 s de BrasilAPI + ViaCEP), no máximo 1 requisição por segundo ao Nominatim na aplicação toda e cache em memória por CEP (5000 entradas). Propriedades: `smartmarket.cep.nominatim-url`, `smartmarket.cep.refinar-por-rua` (`false` volta ao comportamento anterior) e `smartmarket.cep.user-agent`. **Sem migration.** O backend envia rua, bairro e cidade do CEP ao Nominatim, sem identificar o usuário, e não registra CEP, rua nem coordenada em log; coordenadas © colaboradores do OpenStreetMap. O aviso de privacidade do cadastro (`AuthPage.jsx`) ainda cita só BrasilAPI/ViaCEP e precisa ser atualizado no frontend.
- Fase 3 (backend) feita: CEP obrigatório no cadastro (`ResolvedorCep`: BrasilAPI v2 com ViaCEP de reserva, teto de 2 s, nunca barra o cadastro), `GET /api/lojas/proximas` (loja preferida, depois filial mais próxima por Haversine, depois loja padrão), `GET`/`PUT`/`DELETE /api/usuarios/me/localizacao`, `PUT /api/usuarios/me/loja-preferida`, e loja padrão criada ao criar mercado. A 4A (frontend: `lojaService`, casamento loja ↔ rede, hook `useLocalizacao`, `SeletorCepRaio` controlado e catálogo ligado à API, tudo atrás da flag) está feita. A 4B (ligar `LOJAS_PROXIMAS_ATIVO`, só com filial real com coordenadas em produção) está pendente.

### Scraper
- Um módulo `coleta_<rede>.py` por rede (Zaffari, Rissul, Atacadão, Asun, Stok, Master, Fort, Carrefour), todos obedecendo o **Contrato de Extração v1** (JSON/CSV com colunas idênticas, `Decimal`, moeda BRL, gravação atômica). Veja `scraper/README.md` para o contrato completo.
- `normalizacao.py` normaliza nomes/medidas; `pipeline.py` faz a carga transacional com idempotência por hash e **valida que o DSN é um PostgreSQL local** (`validar_dsn`) — não contorne essa trava.
- `rotina_carga.py` é o orquestrador (one-shot ou daemon, com lock de processo multiplataforma que recupera sozinho o lock órfão de um dono morto); `agendador_servico.py` / `cron_coleta_diaria.sh` / `smartmarket-scraper.service` são as formas de agendamento. `executar_pipeline.py` também tem lock para Unix (`fcntl`) e Windows (`msvcrt`). **Zaffari, Rissul, Fort e Asun estão suspensas na rotina** (`REDES_SUSPENSAS`: o `robots.txt` de Zaffari e Rissul proíbe `/api/`; o Cloudflare do Fort e o da Asun/OSuper respondem 403 ao coletor identificado; a Asun fica suspensa até haver autorização, já pedida pelo responsável), então a coleta diária cobre 4 redes: Carrefour, Atacadão, Master e Stok. Não contorne bloqueios (proxy, troca de headers, anti-bot).
- Registro inválido não derruba a carga da rede: vai para `quarentena.json` na pasta da execução (o lote só falha acima de 20% de rejeitados ou sem nenhum válido). Produtos ausentes só são marcados `disponivel = FALSE` quando a coleta é completa **e** exaustiva (`coleta_exaustiva`); hoje nenhum coletor real é exaustivo, então ninguém é marcado. Coleta bem-sucedida com **valor novo** gera nova linha em `preco` (histórico); com o mesmo valor só confirma o vínculo da loja (`preco_loja.confirmado_em`). Testes de integração do scraper em PostgreSQL descartável: `bash scraper/tests/rodar_postgres_descartavel.sh` (Docker; DSN com `127.0.0.1` e `PYTHONUTF8=1` no Windows).
- **Só existe coleta em `scraper/`.** `scripts/` guarda utilitários de build (`assets-neon`, `logos-redes`, `verificar-tamanho-dist.sh`), nunca coletores. Em 2026-11-11 foi removido um sistema paralelo (coletores Playwright com sessão salva, orquestrador de 8 redes, `consolidar_ofertas.py` e catálogos JSON de filiais e produtos servidos pelo frontend) porque violava `REDES_SUSPENSAS` e o `robots.txt` (coletava `/api/catalog_system` de Zaffari e Rissul e contornava o Cloudflare do Fort mascarando `navigator.webdriver`). Não reintroduza coletor que mascare automação, use User-Agent de navegador ou tente superar bloqueio; o contrato é parar no primeiro 403. Casamento de produtos entre redes é só `casamento.py` e `casamento_camadas.py`.

### Backend (`com.smartmarket`)
Camadas clássicas: `controller` → `service` → `repository` (Spring Data JPA) → `model`, com DTOs agrupados por domínio em `dto/<dominio>`. Domínios: auth, produto, mercado, preco, promoção, favorito, lista de compras, alerta, admin. `ComparadorService` concentra a comparação de preços. `exception/GlobalExceptionHandler` centraliza erros. Segurança em `security/`: JWT (`JwtTokenProvider`), `RateLimitingFilter` (15 req/min por IP no login e no cadastro), papéis em `Papel`; CORS controlado por `SMARTMARKET_CORS_ORIGINS`, segredo por `SMARTMARKET_JWT_SECRET`. O papel do usuário é lido do banco a cada requisição (`PapelDoBancoJwtConverter`); a claim do token não decide, e token de usuário apagado dá 401. O segredo precisa ter ao menos 32 bytes e não pode ser o valor de exemplo do `.env.example`, ou a aplicação não sobe. E-mail é normalizado (minúsculas, sem espaços) no cadastro e ignora caixa no login. JSON malformado e parâmetro de tipo errado respondem 400 (não 500). Lista de compras: quantidade de 1 a 999 por item e até 100 itens por lista. A busca por nome (`GET /api/produtos?nome=`) usa só `produto.nome_normalizado`; bancos que já receberam a carga original precisam rodar uma vez, à mão, `backend/deploy/05_corrige_nome_normalizado.sql` (ver `backend/DEPLOY.md`). `open-in-view` está desligado (cuidado com lazy loading fora de transação). Consultas SQL otimizadas de referência em `backend/database/smartmarket_queries_otimizadas.sql`.

### Frontend
- `services/api.js`: instância axios única; injeta `Bearer` a partir de `localStorage["sm_token"]` e trata 401/403 no interceptor de resposta. Um arquivo de serviço por domínio (`produtoService`, `favoritoService`, ...), reexportados por `services/index.js`.
- `contexts/AuthContext.jsx` + `hooks/useAuth.js` guardam a sessão; `components/ProtectedRoute.jsx` protege rotas; `components/Layout.jsx` é o shell (menu, navegação).
- Favoritos, alertas de preço e lista de compras vivem no navegador (alerta não envia aviso; a lista fica no `sessionStorage`); `services/storageKeys.js` guarda esses dados por conta no logout/401 em vez de apagá-los. Ver `docs/DADOS-LOCAIS-DO-USUARIO.md`.
- O catálogo local (`data.js`, fonte do JSON estático que o app carrega por `fetch()`) usa ids `"p<id>"` e a API usa o `<id>` numérico; `utils/mesclarCatalogo.js` junta os dois (o id local é mantido, o da API fica em `apiId`). Não compare `String(id)` entre os dois formatos.
- Seletor de CEP/raio e "loja mais próxima" no catálogo seguem **desligados** (`LOJAS_PROXIMAS_ATIVO` em `src/config/recursos.js`), mas já estão ligados à API: `hooks/useLocalizacao` (CEP na conta, via `services/lojaService`) alimenta o `SeletorCepRaio` (componente só de apresentação) e `utils/lojasDoCatalogo` entrega a loja de cada rede aos cartões (`casarLojaComRede` casa loja ↔ rede; `raioLojas` filtra por raio). O CEP **nunca é gravado** no navegador; só o raio (`sm_raio_lojas_km`). O preço é por rede, a loja é só referência. `utils/proximidadeFiliais.js` não existe mais. Só ligue a flag quando houver ao menos uma filial real com coordenadas em produção, nunca alimentando o catálogo com um arquivo local.
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
