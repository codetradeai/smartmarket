# Deploy do backend SmartMarket

> Pré-requisitos: conta no [Neon](https://neon.tech) e no [Render](https://render.com).
>
> **Situação atual (nov/2026):** o banco de produção do Neon **já está pronto** (schema, 8 mercados e 530 produtos/preços aplicados; nenhum usuário). Pule a seção 1 e vá direto ao [passo a passo rápido](#passo-a-passo-rápido-render--github-pages). A seção 1 só vale para criar um banco novo do zero.
>
> O frontend está no GitHub Pages (`docs/DEPLOY-PAGES.md`), não mais na Vercel.

---

## Passo a passo rápido (Render + GitHub Pages)

> **Atalho:** o `render.yaml` na raiz do repositório já define o serviço (Docker, plano Free, região Virginia, health check, URL do Neon, CORS do Pages e um JWT gerado pelo Render). No Render, **New > Blueprint**, escolha este repositório e preencha só `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD`. O deploy automático espera o CI passar (`autoDeployTrigger: checksPass`); se criar o serviço à mão, escolha **After CI Checks Pass** em Settings > Build & Deploy > Auto-Deploy. Com o Blueprint, os passos 2, 3 e 4 abaixo já vêm feitos; continue no passo 5.

**1. Pegar os dados do Neon** (console.neon.tech > projeto > **Connect**, branch `production`, conexão **direta**, sem `-pooler`):
- Host: `ep-divine-dew-bchgu6dk.c-16.us-east-1.aws.neon.tech` · banco: `neondb`
- Usuário e senha: copie do próprio console (não os cole em chat, issue ou arquivo versionado).
- A URL JDBC fica: `jdbc:postgresql://ep-divine-dew-bchgu6dk.c-16.us-east-1.aws.neon.tech/neondb?sslmode=require`

**2. Gerar um segredo novo do JWT** no seu terminal: `openssl rand -hex 32`. Use um valor novo, nunca um que já apareceu em outro lugar.

**3. Criar o Web Service no Render** (seção 2.1): repositório `smartmarket-team/smartmarket`, Root Directory `backend`, Runtime Docker, Free, Health Check Path `/api/health`.

**4. Variáveis de ambiente** (seção 2.2), com **CORS do Pages**:

| Variável | Valor |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `SPRING_DATASOURCE_URL` | a URL JDBC do passo 1 |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | do console do Neon (Secret) |
| `SMARTMARKET_JWT_SECRET` | o segredo do passo 2 (Secret) |
| `SMARTMARKET_CORS_ORIGINS` | `https://smartmarket-team.github.io` (só o domínio, sem `/smartmarket` e sem barra final) |

**5. Conferir**: abra `https://<seu-servico>.onrender.com/api/health` (a primeira chamada pode levar ~1 min: o plano grátis hiberna). Deve responder `{"status":"UP"}`.

**6. Ligar o frontend**: no GitHub, Settings > Secrets and variables > Actions > **Variables** > `VITE_API_URL` = `https://<seu-servico>.onrender.com/api`. Depois rode o workflow "Deploy do frontend no GitHub Pages" (Actions > Run workflow) para o site passar a usar o backend.

**7. Primeiro usuário e ADMIN**: cadastre-se pelo site, depois promova no SQL Editor do Neon (seção 3.2).

**Problemas comuns**
- Login falha com erro de CORS no navegador: o valor de `SMARTMARKET_CORS_ORIGINS` está diferente do domínio do site (confira `https`, sem barra no fim).
- O deploy no Render cai com erro de memória: o plano grátis tem 512 MB; o `Dockerfile` já limita o Java a 75% da RAM. Se persistir, acrescente `-Xmx300m` em `JAVA_OPTS`.
- Backend não sobe e reclama de coluna/tabela: o `ddl-auto=validate` só valida; rode os scripts de `backend/deploy/` que faltarem (seção 1, passo 5).
- A primeira consulta depois de um tempo parado demora: o Render hiberna e o Neon pausa o compute; é esperado no plano grátis.

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
   DOCKER_CONTAINER=smartmarket-db-dev bash backend/deploy/test_seed_integridade.sh
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

   -- Passo 4: adiciona coluna ativa na tabela promocao
   \i backend/deploy/04_adiciona_ativa_promocao.sql

   -- Passo 5: corrige produto.nome_normalizado (sem acento) — ver aviso abaixo
   \i backend/deploy/05_corrige_nome_normalizado.sql
   ```
   Ou copie e cole o conteúdo de cada arquivo diretamente.

   > ⚠️ **Passo manual — rodar UMA vez no Neon (banco que já recebeu o `03_carga.sql`)**:
   > `05_corrige_nome_normalizado.sql`. A carga original gravou `nome_normalizado` só em
   > minúsculas, com acento (350 dos 530 produtos), e a busca por nome (`GET /api/produtos?nome=`)
   > compara o termo digitado **sem acento** apenas com essa coluna: `feijao` e `feijão` não
   > encontravam "Feijão ...". O script é só um `UPDATE` de `nome_normalizado` (não toca em nome,
   > preço ou outras colunas), idempotente (`WHERE ... IS DISTINCT FROM`; a 2ª execução faz
   > `UPDATE 0`) e aplica a mesma regra do backend (minúsculas, sem acento, espaços colapsados).
   > Depois do deploy do backend, produtos criados ou renomeados já gravam o valor correto sozinhos
   > (`@PrePersist`/`@PreUpdate`); o script só corrige o que já está no banco. Em banco novo,
   > rode-o depois do `03_carga.sql`. Conferência: `SELECT count(*) FROM produto WHERE nome_normalizado ~ '[^ -~]';`
   > deve retornar 0.

   > ⚠️ **Atenção — PR `feat/c3-coleta-segura`**: aplique o script `04_adiciona_ativa_promocao.sql`
   > **antes** de qualquer deploy que inclua esse PR. O Hibernate sobe com `ddl-auto=validate` e
   > exige que a coluna `ativa BOOLEAN NOT NULL DEFAULT TRUE` já exista em `promocao`; sem ela,
   > o backend recusa inicializar. O script é idempotente (`ADD COLUMN IF NOT EXISTS`).
   >
   > **A inativação automática de promoções AINDA NÃO TEM CHAMADOR.**
   > `PromocaoService.inativarNaoRecoletadas` e a query do repositório existem e têm teste
   > unitário, mas nenhuma rotina as invoca: nem o `rotina_carga.py`, nem o backend
   > (não há `@Scheduled`, controller ou endpoint que as use). O scraper também não consegue
   > chamá-las hoje, porque grava direto no PostgreSQL e o backend não expõe esse método via REST.
   > Consequência: `ativa` permanece `TRUE` em todas as promoções até alguém inativá-las. O chamador
   > (que informará `mercado_id` e o início da coleta) será feito em uma próxima entrega. Enquanto
   > isso, a inativação só ocorre manualmente pelo SQL abaixo. As consultas de vigência
   > (`PromocaoRepository`: comparador de lista, catálogo de preços, painel admin) **já filtram
   > `ativa = true`**, então esse `UPDATE` tira a promoção do ar de verdade (antes a flag era
   > ignorada e uma promoção sem `data_fim` valia para sempre):
   > ```sql
   > UPDATE promocao SET ativa = FALSE
   > WHERE mercado_id = <id> AND data_fim IS NULL AND coletado_em < '<inicio_coleta>';
   > ```

   > `03_carga.sql` é idempotente: pode ser re-executado sem duplicar dados
   > (sentinel: `DELETE FROM preco WHERE origem LIKE 'seed_%'`; não depende de data).
   >
   > **Datas de coleta**: o campo `coletado_em` foi confirmado nos arquivos
   > `scraper/output/coleta_<rede>.json` (campo `data_coleta`):
   > asun, atacadao, master, zaffari, rissul → **2026-10-27** (datas reais de coleta,
   > 100% dos preços batem com os JSONs).
   > Para o stok → **2026-10-27** (data em que a carga foi versionada no git,
   > commit `87340ff`); os preços do stok no SQL foram coletados nessa data mas
   > divergem do `coleta_stok.json` atual (54 diferenças, 30 ausentes) — essa
   > data não pode ser afirmada como data de coleta real.
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
2. Conecte o repositório `smartmarket-team/smartmarket`.
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
| `SMARTMARKET_JWT_SECRET` | string aleatória longa (≥ 32 bytes; o backend recusa subir com menos) | ex.: `openssl rand -hex 32` — marque como **Secret** |
| `SMARTMARKET_CORS_ORIGINS` | domínio do frontend | GitHub Pages: `https://smartmarket-team.github.io` (sem `/smartmarket`); várias origens, separe por vírgula |

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

1. Clique em **Deploy** (ou aguarde o trigger automático: com o Blueprint, o deploy dispara no push para `main` **somente depois que o CI do GitHub passar**; o `render.yaml` usa `autoDeployTrigger: checksPass`. Se o CI falhar, o Render não publica).
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
