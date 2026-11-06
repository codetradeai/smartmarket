# Deploy do backend SmartMarket

> Pré-requisitos: conta no [Neon](https://neon.tech) e no [Render](https://render.com).

---

## 1. Neon — criar o banco de dados

1. Faça login em **console.neon.tech** e clique em **New Project**.
2. Escolha a região mais próxima (ex.: `AWS / us-east-1`).
3. Anote a **Connection string** no formato:
   ```
   postgresql://usuario:senha@host.neon.tech/smartmarket?sslmode=require
   ```

4. **Obrigatório antes de carregar o Neon**: rode o teste de integridade contra
   o Postgres local para garantir que os scripts estão corretos:
   ```bash
   DOCKER_CONTAINER=smartmarket-db bash backend/deploy/test_seed_integridade.sh
   ```
   Todos os 5 testes devem passar. O checksum MD5 esperado dos 530 pares
   (produto_id | rede | valor) é:
   ```
   9290cf98a94537edaf4cfed732f20420
   ```
   Não prossiga se qualquer teste falhar ou o checksum divergir.

5. No painel do projeto, abra o **SQL Editor** e execute os scripts na ordem:
   ```sql
   -- Passo 1: estrutura completa
   \i backend/deploy/01_schema.sql

   -- Passo 2: mercados iniciais (8 redes)
   \i backend/deploy/02_mercados.sql

   -- Passo 3 (opcional): catálogo seed com 530 produtos e preços
   \i backend/deploy/03_carga.sql
   ```
   Ou copie e cole o conteúdo de cada arquivo diretamente.

   > `03_carga.sql` é idempotente: pode ser re-executado sem duplicar dados
   > (sentinel: `DELETE FROM preco WHERE origem LIKE 'seed_%'`; não depende de data).
   >
   > **Datas de coleta**: o campo `coletado_em` foi confirmado nos arquivos
   > `scraper/output/coleta_<rede>.json` (campo `data_coleta`):
   > asun, atacadao, master, zaffari, rissul → **2026-10-27** (datas reais de coleta).
   > Para o stok, o campo recebe `CURRENT_DATE` (data de execução da carga) —
   > os preços do JSON divergem da coleta original armazenada no SQL.
   >
   > **Ordem dos mercados**: `02_mercados.sql` usa IDs explícitos idênticos
   > ao `carga_completa_530_produtos.sql` (1=Fort, 2=Carrefour, 3=Asun, 4=Atacadão,
   > 5=Master, 6=Zaffari, 7=Rissul, 8=Stok); `03_carga.sql` resolve o mercado por
   > nome (subselect), nunca por id numérico fixo. Sem essa combinação, em banco vazio
   > todos os 530 preços ligam à rede errada (IDs atribuídos pela sequência são
   > não-determinísticos sem ORDER BY).
   >
   > **Segurança contra typo**: `preco.mercado_id` é `NOT NULL`; um nome de mercado
   > digitado errado no subselect causa falha do INSERT em vez de gravar `NULL`.
   >
   > Pule este passo se preferir que os dados venham apenas do scraper.

5. Confirme as contagens após os scripts:
   ```sql
   SELECT COUNT(*) AS mercados  FROM mercado;   -- esperado: 8
   SELECT COUNT(*) AS produtos  FROM produto;   -- esperado: 530 (se rodou o 03)
   SELECT COUNT(*) AS precos    FROM preco;     -- esperado: 530 (se rodou o 03)

   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name;
   ```
   Tabelas esperadas: `alerta`, `favorito`, `favorito_produto`, `item_lista`,
   `lista_compra`, `mercado`, `preco`, `produto`, `promocao`,
   `usuario`, `vinculo_produto`.

---

## 2. Render — publicar o backend

### 2.1 Criar o Web Service

1. No painel do Render, clique em **New → Web Service**.
2. Conecte o repositório `codetradeai/smartmarket`.
3. Configure:

   | Campo | Valor |
   |---|---|
   | **Name** | `smartmarket-backend` |
   | **Region** | mesma do Neon ou a mais próxima |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | **Docker** |
   | **Instance Type** | Free (512 MB RAM, 0,1 vCPU) |
   | **Health Check Path** | `/api/health` |

4. O Render detecta o `Dockerfile` automaticamente.

### 2.2 Variáveis de ambiente

Adicione em **Environment → Add Environment Variable**:

| Variável | Valor | Notas |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | ativa o perfil de produção |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://host.neon.tech/smartmarket?sslmode=require` | URL JDBC do Neon (veja seção 1) |
| `SPRING_DATASOURCE_USERNAME` | `usuario_neon` | usuário do Neon |
| `SPRING_DATASOURCE_PASSWORD` | `senha_neon` | senha do Neon — marque como **Secret** |
| `SMARTMARKET_JWT_SECRET` | string aleatória longa (≥ 32 chars) | ex.: `openssl rand -hex 32` — marque como **Secret** |
| `SMARTMARKET_CORS_ORIGINS` | URL do frontend no Vercel | ex.: `https://smartmarket.vercel.app` |

> **Nunca** grave esses valores em arquivos versionados.

### 2.3 URL JDBC para o Neon

A connection string do Neon é no formato `postgresql://...`.
Para Spring Boot, converta para o formato JDBC:

```
# Neon dá:
postgresql://usuario:senha@ep-xxx.us-east-1.aws.neon.tech/smartmarket?sslmode=require

# Spring Boot precisa de:
jdbc:postgresql://ep-xxx.us-east-1.aws.neon.tech/smartmarket?sslmode=require
```

Coloque o usuário e a senha em variáveis separadas (`SPRING_DATASOURCE_USERNAME` e
`SPRING_DATASOURCE_PASSWORD`), **não** na URL.

### 2.4 Deploy e verificação

1. Clique em **Deploy** (ou aguarde o trigger automático no push para `main`).
2. Acompanhe os logs em **Logs** no painel do Render.
3. Quando o serviço estiver `Live`, acesse:
   ```
   GET https://smartmarket-backend.onrender.com/api/health
   ```
   Deve retornar `{"status":"UP"}` com HTTP 200.

> No plano gratuito, o serviço hiberna após 15 min de inatividade e leva
> ~30 s para "acordar" na primeira requisição.

---

## 3. Criar o usuário admin

### 3.1 Registrar via API

Após o deploy, registre o usuário pela tela de cadastro do frontend
(ou via curl):

```bash
curl -X POST https://smartmarket-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Admin SmartMarket","email":"admin@smartmarket.com","senha":"SenhaForte123!"}'
```

### 3.2 Promover para ADMIN no Neon

No **SQL Editor** do console do Neon:

```sql
UPDATE usuario
SET papel = 'ADMIN'
WHERE email = 'admin@smartmarket.com';
```

Confirme:
```sql
SELECT id, nome, email, papel FROM usuario WHERE email = 'admin@smartmarket.com';
```

---

## 4. Resumo das variáveis obrigatórias

| Variável | Onde definir |
|---|---|
| `SPRING_PROFILES_ACTIVE=prod` | Render (Environment) |
| `SPRING_DATASOURCE_URL` | Render (Environment, Secret) |
| `SPRING_DATASOURCE_USERNAME` | Render (Environment, Secret) |
| `SPRING_DATASOURCE_PASSWORD` | Render (Environment, Secret) |
| `SMARTMARKET_JWT_SECRET` | Render (Environment, Secret) |
| `SMARTMARKET_CORS_ORIGINS` | Render (Environment) |

---

## 5. Schema em produção

O perfil `prod` usa `ddl-auto=validate` (definido em `application.properties`).
Isso significa que o Hibernate **valida** as tabelas mas **não as cria nem altera**.

O schema deve existir antes do primeiro boot — por isso os scripts em `deploy/`.
Quando houver uma alteração de modelo (nova coluna, nova tabela), atualize
`01_schema.sql` e aplique a migration manual no console do Neon antes do deploy.

> Se o volume de migrações crescer, considere adotar Flyway
> (`spring-boot-starter-data-flyway`), que gerencia versões automaticamente.
