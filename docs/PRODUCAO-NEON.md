# Produção: Neon (banco) + backend + Vercel (frontend)

Passo a passo curto. Detalhes e justificativas em `backend/DEPLOY.md` e
`docs/PLANO-DEPLOY-VERCEL.md`. **Nunca** cole valores reais (senhas, tokens,
connection strings) em arquivos versionados, issues ou PRs: abaixo só há
placeholders.

## 1. Aplicar o schema no Neon

Use a connection string **não-pooled** (direta). No painel do Neon, em
*Connect*, desligue a opção *Connection pooling*: o host **não** deve conter
`-pooler`. O pooler (PgBouncer em modo transação) não combina com scripts DDL
longos nem com o `psql -f` em lote.

```bash
# Guarde a string só na sessão do terminal, nunca em arquivo versionado
export NEON_URL='postgresql://<USUARIO>:<SENHA>@<HOST-DIRETO>.neon.tech/<BANCO>?sslmode=require'

psql "$NEON_URL" -v ON_ERROR_STOP=1 -f backend/deploy/01_schema.sql
psql "$NEON_URL" -v ON_ERROR_STOP=1 -f backend/deploy/02_mercados.sql
psql "$NEON_URL" -v ON_ERROR_STOP=1 -f backend/deploy/03_carga.sql   # opcional: seed de 530 produtos
psql "$NEON_URL" -v ON_ERROR_STOP=1 -f backend/deploy/04_adiciona_ativa_promocao.sql
```

Respeite a ordem 01 a 04 (o `02` define os IDs dos mercados que o `03` usa por
nome; o `04` é obrigatório porque o backend sobe com `ddl-auto=validate` e exige
a coluna `promocao.ativa`). Todos são idempotentes. O `03` é opcional se os
dados vierem só do scraper.

Antes, rode o teste de integridade local (ver `backend/DEPLOY.md`, item 4):
`DOCKER_CONTAINER=smartmarket-db-dev bash backend/deploy/test_seed_integridade.sh`.

Conferência:

```sql
SELECT COUNT(*) FROM mercado;   -- 8
SELECT COUNT(*) FROM produto;   -- 530 (se rodou o 03)
```

## 2. Variáveis de ambiente do backend (perfil `prod`)

Defina no painel do provedor do backend (ex.: Render, em *Environment*). São as
que `application.properties` e `application-prod.properties` realmente leem:

| Variável | Valor | Observação |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Sem perfil o boot falha de propósito |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<HOST>.neon.tech/<BANCO>?sslmode=require` | Formato JDBC, com `sslmode=require`; sem usuário/senha na URL |
| `SPRING_DATASOURCE_USERNAME` | `<USUARIO>` | Secret |
| `SPRING_DATASOURCE_PASSWORD` | `<SENHA>` | Secret |
| `SMARTMARKET_JWT_SECRET` | 32+ caracteres aleatórios | Gere com `openssl rand -base64 48`; guarde **só** no painel do provedor |
| `SMARTMARKET_CORS_ORIGINS` | `https://<seu-dominio-vercel>` | Origem(ns) do frontend, separadas por vírgula |

Opcionais, com default seguro: `SPRING_JPA_HIBERNATE_DDL_AUTO` (`validate`),
`SPRING_SQL_INIT_MODE` (`never`; mantenha assim, pois o `data.sql` cria um ADMIN
com senha em claro), `SMARTMARKET_JWT_EXPIRATION` (86400000 ms) e `PORT` (8080).

Para o backend, use a URL direta do Neon por simplicidade.

## 3. O que trocar no `vercel.json`

Em `rewrites`, substitua o placeholder pela URL pública real do backend:

```json
"destination": "https://BACKEND-SMARTMARKET-URL-AQUI/api/$1"
```

por, por exemplo, `https://<backend>.onrender.com/api/$1`. Mantenha o `/api/$1`
no fim. Não defina `VITE_API_URL` na Vercel: o frontend usa `/api` (mesmo
domínio) e a Vercel faz o proxy. Depois do deploy, ajuste
`SMARTMARKET_CORS_ORIGINS` no backend para o domínio final do frontend.

## 4. Primeiro usuário e promoção a ADMIN

1. Abra o frontend publicado e crie a conta pela tela de registro (ou
   `POST /api/auth/register` com `nome`, `email`, `senha`).
2. Promova por SQL no Neon (tabela `usuario`, coluna `papel`, valores válidos
   `'USER'` e `'ADMIN'`, conforme `01_schema.sql` e o enum `Papel`):

```sql
UPDATE usuario SET papel = 'ADMIN' WHERE email = '<email-do-admin>';
SELECT id, nome, email, papel FROM usuario WHERE email = '<email-do-admin>';
```

3. Saia e entre de novo na aplicação para o token refletir o novo papel.

## 5. Checklist de verificação

- [ ] `GET https://<backend>/api/health` retorna HTTP 200 com `{"status":"UP"}`
      (`HealthController`; o projeto não usa Actuator).
- [ ] O mesmo pelo domínio do frontend, `GET https://<frontend>/api/health`
      (confirma o rewrite do `vercel.json`).
- [ ] `POST https://<backend>/api/auth/login` com `{"email":"...","senha":"..."}`
      retorna 200 e um token.
- [ ] A listagem de produtos/mercados carrega no frontend (8 mercados).
- [ ] Login como ADMIN abre a área administrativa.
- [ ] Nenhum erro de CORS no console do navegador.
- [ ] Nenhum segredo apareceu em logs, commits ou em texto aberto no painel.
