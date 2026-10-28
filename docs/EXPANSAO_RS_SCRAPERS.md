# Expansão de Web Scraping e Automação — Rio Grande do Sul (SmartMarket)

Documento técnico oficial da expansão de cobertura de dados, engenharia de scraping, catálogo de produtos em alta definição e automação de rotinas diárias no SmartMarket.

---

## 1. Visão Geral da Expansão

O SmartMarket expandiu sua cobertura geográfica e mercadológica para as **8 maiores redes de supermercados e atacarejos do Rio Grande do Sul**, com monitoramento ao vivo, enriquecimento cadastral e comparação em tempo real.

### Redes Monitoradas

| ID | Rede de Supermercado | Tipo de Rede | Cidade / Região Principal | Tecnologia / API |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Fort Atacadista** | Atacarejo | Canoas / Grande Porto Alegre | API REST Interna |
| **2** | **Carrefour Mercado** | Hipermercado | Porto Alegre (Av. Ipiranga) | API Pública Carrefour |
| **3** | **Asun Supermercados** | Varejo Regional | Região Metropolitana / Litoral | API Sense / OSuper |
| **4** | **Atacadão** | Atacado / Varejo | Porto Alegre (Av. Sertório) | API VTEX Catalog System |
| **5** | **Master Supermercados** | Supermercado | Erechim / Porto Alegre | API VipCommerce (Org 80) |
| **6** | **Companhia Zaffari / Bourbon** | Supermercado Premium | Porto Alegre / RS | API VTEX Catalog System |
| **7** | **Supermercados Rissul** | Supermercado | Vale dos Sinos / Região Metropolitana | API VTEX Catalog System |
| **8** | **Stok Center** | Atacarejo | Passo Fundo / RS | API VipCommerce (Org 130) |

---

## 2. Arquitetura dos Novos Scrapers

Os módulos foram implementados em Python 3.11+, seguindo o padrão de injeção de dependências, tratamento gracioso de exceções de rede e rate limiting conservador.

### 2.1. Zaffari / Bourbon (`coleta_zaffari.py`) e Rissul (`coleta_rissul.py`)
- **Padrão**: VTEX Catalog System API.
- **Endpoint**: `/api/catalog_system/pub/products/search?ft={termo}&_from=0&_to=49`.
- **Tratamento de Imagens**: Remoção inteligente de sufixos de resolução em URLs da VTEX (ex: `-200-200`) para obter as fotos originais em até 1000x1000px.

### 2.2. Master (`coleta_master.py`) e Stok Center (`coleta_stok.py`)
- **Padrão**: VipCommerce Gateway API.
- **Autenticação**: Obtenção dinâmica de JWT através de `POST /org/{orgId}/auth/loja/login`.
- **Preços em Promoção**: Tratamento de `oferta.preco_antigo` para identificar o valor regular e o valor promocional ativo.

### 2.3. Asun Supermercados (`coleta_asun.py`)
- **Padrão**: OSuper / Sense Platform.
- **Endpoint**: `https://api.osuper.com.br/v1/search`.

---

## 3. Gestão e Download de Fotos em Alta Definição (HD)

Para eliminar dependência de URLs externas instáveis e garantir carregamento offline instantâneo no frontend:

- **Script Downloader**: [scraper/download_imagens.py](file:///e:/Area_Dev/GitHub/smartmarket/scraper/download_imagens.py)
- **Fallback de Resolução**: `1000x1000` $\rightarrow$ `500x500` $\rightarrow$ `250x250` $\rightarrow$ `original`.
- **Local de Armazenamento**: `frontend/public/images/produtos/{id}_{hash}.jpg`.
- **Status da Massa Coletada**: **528 imagens reais** baixadas e vinculadas aos produtos.

---

## 4. Banco de Dados e Script de Carga Completa

- **Migration**: [backend/database/migration_add_produto_imagem_descricao.sql](file:///e:/Area_Dev/GitHub/smartmarket/backend/database/migration_add_produto_imagem_descricao.sql) adiciona `imagem_url TEXT` e `descricao TEXT` na tabela `produto`.
- **Carga Oficial**: [backend/database/carga_completa_530_produtos.sql](file:///e:/Area_Dev/GitHub/smartmarket/backend/database/carga_completa_530_produtos.sql)
  - 1.124 linhas SQL com suporte a idempotência (`ON CONFLICT DO UPDATE`).
  - Inserção dos 8 mercados com logos e endereços.
  - Inserção dos 530 produtos com categorias, marcas, unidades e caminhos de imagens.
  - Inserção dos preços e das promoções com prazo de validade.

Comando para aplicar a carga no PostgreSQL:
```bash
psql -h localhost -p 5432 -U postgres -d smartmarket -f backend/database/carga_completa_530_produtos.sql
```

---

## 5. Frontend e Componentes Criados

1. **`ProductImage.jsx`**: Componente de imagem otimizado com skeleton blur, carregamento preguiçoso (`loading="lazy"`) e fallback transparente.
2. **`ProductDetailModal.jsx`**: Modal responsivo com foto HD ampliada, especificações completas, cálculo de economia e matriz comparativa com preços lado a lado nas 8 redes do RS.
3. **Catálogo Geral (`CatalogPage.jsx`)**: Suporte a 530 produtos com busca instantânea e filtros por departamento.
4. **Home (`Home.jsx`)**: Vitrine institucional das 8 redes ativas e produtos em oferta.
5. **Painel Admin (`AdminPage.jsx`)**: Gestão de produtos, tabela com fotos e disparador manual de sincronização.

---

## 6. Automação Diária de Coleta para Servidores

Três soluções prontas para produção:

### A. Nuvem: GitHub Actions (`.github/workflows/coleta_diaria.yml`)
- Disparo diário às **04:00 BRT** (`0 7 * * *` UTC).
- Executa testes $\rightarrow$ coleta $\rightarrow$ download de imagens $\rightarrow$ carga no banco $\rightarrow$ upload do relatório.

### B. Linux Cron (`scraper/cron_coleta_diaria.sh`)
- Executável bash com rotação e retenção de logs por 30 dias.
- Configuração via `crontab -e`:
  ```bash
  0 4 * * * /opt/smartmarket/scraper/cron_coleta_diaria.sh >> /var/log/smartmarket_cron.log 2>&1
  ```

### C. Daemon Nativo / Systemd (`scraper/agendador_servico.py`)
- Serviço autônomo com tolerância a falhas e agendamento contínuo.
- Serviço systemd configurado em [scraper/smartmarket-scraper.service](file:///e:/Area_Dev/GitHub/smartmarket/scraper/smartmarket-scraper.service).

---

## 7. Suíte de Testes Automatizados

Execução de todos os 122 testes unitários dos scrapers:
```bash
python -m unittest discover scraper/tests
```
**Resultado**: 122 testes executados e 100% aprovados.
