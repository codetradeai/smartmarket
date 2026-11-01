# SmartMarket

Comparador de preços entre supermercados — Grupo 40, Trilha Dev Full Stack 2026.

## Estrutura

- `/frontend` — React 19 + Tailwind CSS v4 + Vite (Catálogo de 530 produtos com fotos HD)
- `/backend` — Spring Boot (APIs REST e JPA)
- `/scraper` — Robôs de coleta de preços para as 8 maiores redes do RS + Downloader de Imagens + Agendador Diário
- `/docs` — Documentação técnica, arquitetura de dados e diagramas

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

- Suíte de Scrapers (Python): `python -m unittest discover scraper/tests` (122 testes 100% aprovados)
- Back-end (Java): `cd backend` e `./mvnw test` (Windows: `.\mvnw.cmd test`)
- Front-end (React): `cd frontend` e `npm test` ou `npm run test:coverage`

## Automação Diária de Coleta

- **GitHub Actions**: Workflow agendado para rodar todo dia às 04:00 BRT (`.github/workflows/coleta_diaria.yml`)
- **Servidor Linux**: Shell script com logs rotacionados (`scraper/cron_coleta_diaria.sh`)
- **Daemon Systemd**: Serviço contínuo em segundo plano (`scraper/agendador_servico.py`)

## Como contribuir

1. Crie uma branch a partir de main: `feature/nome-da-tarefa`
2. Abra um Pull Request descrevendo o que foi feito
3. Peça revisão de alguém antes do merge
