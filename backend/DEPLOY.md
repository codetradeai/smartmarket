# Deploy do backend SmartMarket

> Pré-requisitos: conta no [Neon](https://neon.tech) e no [Render](https://render.com).
>
> **Situação atual (nov/2026):** o banco de produção do Neon **já está pronto** (schema, 8 mercados e 530 produtos/preços aplicados; já tem usuários cadastrados — 4 em 12/11/2026). As migrations `06_lojas_por_cep.sql` e `07_indice_unico_vinculo_vigente.sql` já foram aplicadas em produção (12/11/2026). Pule a seção 1 e vá direto ao [passo a passo rápido](#passo-a-passo-rápido-render--github-pages). A seção 1 só vale para criar um banco novo do zero.
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
- Depois de aplicar migrations que faltavam, o deploy que falhou no Render **não é refeito sozinho**: use **Manual Deploy → Deploy latest commit**.
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

   -- Passo 6: lojas (filiais), preço por loja e localização do usuário por CEP
   \i backend/deploy/06_lojas_por_cep.sql

   -- Passo 7 (só PostgreSQL): travas de integridade do preço por loja
   \i backend/deploy/07_indice_unico_vinculo_vigente.sql

   -- Passo 8 (opcional, só por ordem do responsável): filiais reais de Fort, Asun e Zaffari/Bourbon
   -- (roteiro próprio em "Passo manual — 08_lojas_filiais.sql", mais abaixo)
   \i backend/deploy/08_lojas_filiais.sql
   ```
   Para o 06 e o 07, a ordem é: **backup (branch do Neon) → pré-conferência → 06 → conferência pós-06 → 07 →
   conferência pós-07**, com as consultas em *Conferência antes e depois do 06 e do 07* (no aviso abaixo).

   O `\i` só funciona no **psql**. No **SQL Editor do Neon** ele não existe: abra cada arquivo, cole o
   conteúdo e execute, **um arquivo por vez**, na ordem acima.

   Alternativa com psql (use a conexão **direta**, sem `-pooler`; mantenha a URL numa variável de ambiente,
   nunca em arquivo ou chat):
   ```bash
   psql "$NEON_URL" -v ON_ERROR_STOP=1 -f backend/deploy/06_lojas_por_cep.sql
   # pare aqui: rode a conferência pós-06 e só siga se tudo bater
   psql "$NEON_URL" -v ON_ERROR_STOP=1 -f backend/deploy/07_indice_unico_vinculo_vigente.sql
   ```

   Se der erro no meio de um script no SQL Editor, o **primeiro comando é `ROLLBACK;`**, antes de qualquer
   outra coisa.

   > ⚠️ **Passos manuais — `06_lojas_por_cep.sql` e depois `07_indice_unico_vinculo_vigente.sql` (lojas por
   > CEP)**: **só por ordem do responsável, à mão no Neon**; nenhum pipeline os aplica. **Ordem obrigatória:
   > 06 e só então 07** (o 07 depende das tabelas e da coluna `produto_id` criadas pelo 06; o 07 só roda em
   > PostgreSQL, no Neon). Rode **antes** de subir o backend que traz as entidades `Loja` e `PrecoLoja` (o
   > Hibernate com `ddl-auto=validate` recusa iniciar sem as tabelas e colunas novas) e **com o coletor antigo
   > parado**.
   >
   > **Antes de aplicar, faça uma cópia do banco:** crie uma **branch do banco no Neon** (copy-on-write,
   > instantânea) a partir do ramo de produção, ou anote o ponto de restauração. Se algo sair errado, volte
   > para essa branch/ponto. As duas migrations só criam e ligam dados (nenhum `preco` é apagado ou
   > alterado), mas a cópia é a rede de segurança.
   > - Cria `loja`, `preco_loja`, as colunas opcionais de localização em `usuario` (`cep`, `cidade`, `uf`,
   >   `latitude`, `longitude`, `loja_preferida_id`), `promocao.loja_id` (nulo = promoção da rede toda) e os
   >   índices, inclusive `produto(codigo_barras)`.
   > - Dados atuais: cria uma loja "padrão" por mercado (`codigo_externo = 'padrao'`) e liga cada preço que já
   >   existe a ela, com a vigência encadeada pela data de coleta. **Nenhuma linha de `preco` é apagada ou
   >   alterada**; contas antigas ficam com a localização nula.
   > - Idempotente: rodar de novo não duplica nada; só cria o que falta e só liga preços ainda sem vínculo.
   >   Rode-o de novo depois de cadastrar um mercado novo para ele ganhar a loja padrão.
   > - Conferência depois do 06: `SELECT count(*) FROM loja;` deve ser igual a
   >   `SELECT count(*) FROM mercado;` e `SELECT count(*) FROM preco_loja;` igual a `SELECT count(*) FROM preco;`
   >   (até o coletor novo entrar; consultas completas em *Conferência antes e depois do 06 e do 07*,
   >   abaixo). Cópia idêntica do script em `backend/database/migration_lojas_por_cep.sql`.
   > - `preco_loja.produto_id` repete `preco.produto_id` de propósito (leitura direta do preço atual da
   >   loja e a trava abaixo). O 06 o preenche; quem impede a divergência é o 07.
   > - **`07_indice_unico_vinculo_vigente.sql` (só PostgreSQL, rode logo depois do 06, também por ordem do
   >   responsável):** cria o índice único parcial `(loja_id, produto_id) WHERE vigente_ate IS NULL` (uma
   >   loja nunca tem dois preços vigentes do mesmo produto, sem depender só do lock da carga) e a FK
   >   composta `(preco_id, produto_id) → preco(id, produto_id)`. Fica separado porque o H2 dos testes não
   >   suporta índice parcial nem bloco `DO`. **A carga (coletor) precisa fechar o vínculo antigo antes de
   >   abrir o novo, na mesma transação; senão o 07 recusa a gravação.** Apagar um `preco` (o
   >   `PrecoService.remover`) continua apagando seus vínculos em cascata, também com a FK composta
   >   (conferido em PostgreSQL 15 e 16 pelo script abaixo). Idempotente.
   > - **Validação em PostgreSQL real:** `bash backend/deploy/test_lojas_postgres.sh` (Docker em execução)
   >   sobe um container descartável (nunca o Neon), aplica 01–05 + histórico sintético + 06 duas vezes + 07
   >   duas vezes, e confere contagens, checksum de `preco`, cadeia de vigência, a recusa de dois vínculos
   >   vigentes e a FK composta. Passou em `postgres:16` e `postgres:15-alpine`.
   >
   > ### Conferência antes e depois do 06 e do 07
   >
   > Consultas validadas em PostgreSQL 16 (ver a issue #159). Rode no SQL Editor do Neon.
   >
   > **Pré-conferência (só leitura)**: anote as contagens e o checksum.
   > ```sql
   > SELECT to_regclass('public.loja') AS loja, to_regclass('public.preco_loja') AS preco_loja;  -- ambos vazios
   > SELECT (SELECT count(*) FROM mercado) mercados, (SELECT count(*) FROM produto) produtos,
   >        (SELECT count(*) FROM preco) precos, (SELECT count(*) FROM usuario) usuarios;       -- anote
   > SELECT md5(string_agg(id||':'||produto_id||':'||mercado_id||':'||valor||':'||coletado_em||':'||disponivel||':'||coalesce(origem,''), ',' ORDER BY id)) AS checksum_preco FROM preco;  -- ANOTE
   > ```
   >
   > **Pós-06**: tudo `t`, 7 colunas, 0 duplicados. Depois rode o checksum da pré-conferência de novo: tem que
   > dar o mesmo valor.
   > ```sql
   > SELECT (SELECT count(*) FROM loja) = (SELECT count(*) FROM mercado)                     AS uma_loja_por_mercado,
   >        (SELECT count(*) FROM preco_loja) = (SELECT count(*) FROM preco)                 AS um_vinculo_por_preco,
   >        (SELECT count(*) FROM preco_loja WHERE vigente_ate IS NULL)
   >          = (SELECT count(*) FROM (SELECT DISTINCT produto_id, mercado_id FROM preco) x) AS um_vigente_por_par,
   >        (SELECT count(*) FROM preco p WHERE NOT EXISTS (SELECT 1 FROM preco_loja pl WHERE pl.preco_id = p.id)) = 0 AS nenhum_preco_sem_vinculo,
   >        (SELECT count(*) FROM preco_loja pl JOIN preco p ON p.id = pl.preco_id WHERE pl.produto_id <> p.produto_id) = 0 AS produto_id_confere;  -- tudo t
   >
   > SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'
   >  AND ((table_name = 'usuario' AND column_name IN ('cep','cidade','uf','latitude','longitude','loja_preferida_id'))
   >    OR (table_name = 'promocao' AND column_name = 'loja_id')) ORDER BY 1, 2;  -- 7 linhas
   >
   > SELECT loja_id, produto_id, count(*) FROM preco_loja WHERE vigente_ate IS NULL GROUP BY 1, 2 HAVING count(*) > 1;  -- 0 linhas
   > ```
   >
   > **Pós-07**:
   > ```sql
   > SELECT (SELECT count(*) FROM pg_indexes WHERE indexname IN ('uk_preco_id_produto','uk_preco_loja_vigente')) AS indices,  -- 2
   >        (SELECT count(*) FROM pg_constraint WHERE conname = 'fk_preco_loja_preco_produto')                    AS fk;       -- 1
   > ```
   >
   > **Rollback.** O caminho preferido é restaurar a branch de backup do Neon (Restore no console); isso apaga
   > o que foi gravado depois do backup. Alternativa manual, que devolve o banco ao estado anterior:
   > ```sql
   > BEGIN;
   > DROP TABLE IF EXISTS preco_loja;
   > ALTER TABLE usuario DROP COLUMN IF EXISTS loja_preferida_id, DROP COLUMN IF EXISTS cep, DROP COLUMN IF EXISTS cidade,
   >                     DROP COLUMN IF EXISTS uf, DROP COLUMN IF EXISTS latitude, DROP COLUMN IF EXISTS longitude;
   > ALTER TABLE promocao DROP COLUMN IF EXISTS loja_id;
   > DROP TABLE IF EXISTS loja;
   > DROP INDEX IF EXISTS uk_preco_id_produto;
   > DROP INDEX IF EXISTS idx_produto_codigo_barras;
   > COMMIT;
   > ```
   > ⚠️ **O rollback manual derruba o backend da `main`**, que precisa dessas tabelas e colunas. Só faz
   > sentido com o Render numa versão anterior ao #155.
   >
   > **Depois do redeploy.** Com as conferências ok, faça o deploy manual no Render (**Manual Deploy → Deploy
   > latest commit**) e rode o smoke: `GET /api/health` → `UP`, e `GET /api/mercados` e
   > `GET /api/produtos?nome=feijao` respondendo. Só então apague a branch de backup do Neon.

   > ⚠️ **Passo manual — `08_lojas_filiais.sql` (filiais reais de Fort, Asun e Zaffari/Bourbon)**: **só por
   > ordem do responsável, à mão no Neon, depois do 06 e do 07**; nenhum pipeline o aplica. Traz 82 lojas
   > (Fort 7, Asun 36, Zaffari/Bourbon 39) levantadas em 12/11/2026 das páginas oficiais das redes (a
   > `fonte_url` de cada uma está em `scraper/lojas/lojas.json`). Ligar `LOJAS_PROXIMAS_ATIVO` é uma decisão
   > **separada**, depois da aplicação e da conferência. O arquivo é **gerado** (`python scraper/gerar_sql_lojas.py`);
   > não o edite à mão: altere o JSON e gere de novo.
   >
   > O que o script faz: `BEGIN`/`COMMIT`; uma **pré-conferência** que aborta tudo (`RAISE EXCEPTION`) se o
   > mercado 1, 3 ou 6 não existir ou o nome dele não contiver Fort, Asun ou Zaffari; e um `INSERT` por loja
   > com `ON CONFLICT (mercado_id, codigo_externo) DO UPDATE` (atualiza só nome, endereço, cidade, UF, CEP e
   > coordenadas). Nunca apaga linha, nunca toca a loja padrão e nunca muda `ativa` de loja existente.
   > Idempotente: rodar duas vezes deixa as mesmas 82 lojas (testado em PostgreSQL 16 descartável).
   >
   > **Roteiro** (SQL Editor do Neon, um arquivo por vez):
   >
   > 1. **Backup:** crie uma **branch do banco no Neon** a partir de produção e anote o nome dela.
   > 2. **Pré-conferência (só leitura):**
   >    ```sql
   >    SELECT id, nome FROM mercado ORDER BY id;     -- 1 Fort, 3 Asun, 6 Zaffari / Bourbon (o nome precisa conter a rede)
   >    SELECT mercado_id, count(*) AS lojas FROM loja GROUP BY mercado_id ORDER BY mercado_id;
   >    -- anote os números: depois do 08, cada mercado deve ter essas lojas + as novas
   >    ```
   > 3. **Aplicar:** cole o conteúdo de `backend/deploy/08_lojas_filiais.sql` e execute. Se o `RAISE EXCEPTION`
   >    disparar, nada foi inserido: leia a mensagem (diz qual mercado), corrija o nome do mercado ou avise o
   >    grupo, e **comece pelo `ROLLBACK;`** se o editor mostrar transação aberta. Com psql:
   >    `psql "$NEON_URL" -v ON_ERROR_STOP=1 -f backend/deploy/08_lojas_filiais.sql` (conexão direta, sem `-pooler`).
   > 4. **Pós-conferência (o `SELECT` no fim do próprio arquivo já mostra a primeira):**
   >    ```sql
   >    SELECT m.id, m.nome, count(l.id) AS lojas,
   >           count(l.id) FILTER (WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL) AS com_coordenadas,
   >           count(l.id) FILTER (WHERE l.latitude IS NULL OR l.longitude IS NULL) AS sem_coordenadas
   >    FROM mercado m LEFT JOIN loja l ON l.mercado_id = m.id AND l.codigo_externo <> 'padrao'
   >    WHERE m.id IN (1, 3, 6) GROUP BY m.id, m.nome ORDER BY m.id;
   >    -- esperado: Fort 7 (7 com coordenadas), Asun 36 (33 com), Zaffari 39 (34 com): 82 lojas, 74 com coordenadas, 8 sem
   >    -- (Asun Guaíba, Asun Noiva do Mar, Asun Xangri-lá 2, Hipermercado Zaffari Otto Niemeyer, Zaffari Fernando Machado,
   >    --  Zaffari Ipanema, Zaffari Hípica e Hipermercado Zaffari Caxias Centro: sem coordenada confiável, então ficam sem distância)
   >    SELECT count(*) FROM loja WHERE codigo_externo = 'padrao';   -- continua 1 por mercado (8)
   >    SELECT count(*) FROM preco_loja;                              -- igual ao de antes (o 08 não toca em preço)
   >    ```
   > 5. **Desfazer:** restaure a branch de backup do Neon (Restore no console); isso apaga o que foi gravado
   >    depois do backup. Só apague a branch de backup depois de conferir tudo.
   >
   > **Origem das coordenadas.** As coordenadas das lojas vêm do endereço, pelo Nominatim (OpenStreetMap):
   > *coordenadas © colaboradores do OpenStreetMap, via Nominatim* (licença ODbL). A geocodificação só aceita o
   > resultado quando a cidade devolvida é a da loja e **anula** (deixa `NULL`, a loja fica sem distância) as lojas
   > de uma mesma rede que terminarem no mesmo ponto: melhor sem distância do que distância errada. Também rejeita o
   > resultado do endereço que fica a mais de 30 km da coordenada do CEP (o Nominatim achou a mesma rua em outro
   > distrito do município; o Caxias Centro foi o único caso e ficou para revisão manual, `rejeitada_revisao`). Duas lojas
   > da Asun ainda usam a coordenada do CEP (centro da cidade, menos precisa): Asun Osório e Asun Xangri-lá.
   > Como gerar de novo: `python scraper/geocodificar_lojas.py --por-endereco` e depois
   > `python scraper/gerar_sql_lojas.py`. O ritmo é de uma chamada a cada 2 s, com User-Agent identificado, e
   > para no primeiro 403/429/503. Veja `docs/PESQUISA-FILIAIS.md`.

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

**Localização pela rua do CEP (Fase 4C) — opcionais, com padrão; nada a configurar e sem migration de banco.** O backend refina a coordenada do usuário consultando o Nominatim (OpenStreetMap) com a rua, o bairro e a cidade do CEP:

| Variável (propriedade) | Padrão | Notas |
|---|---|---|
| `SMARTMARKET_CEP_NOMINATIM_URL` (`smartmarket.cep.nominatim-url`) | `https://nominatim.openstreetmap.org` | trocar só para um Nominatim próprio |
| `SMARTMARKET_CEP_REFINAR_POR_RUA` (`smartmarket.cep.refinar-por-rua`) | `true` | `false` desliga o refino e volta ao comportamento anterior (coordenada da BrasilAPI, que costuma ser o centro da cidade) |
| `SMARTMARKET_CEP_USER_AGENT` (`smartmarket.cep.user-agent`) | `SmartMarket/1.0 (+https://github.com/smartmarket-team/smartmarket)` | o Nominatim exige um User-Agent identificado |

O teto do refino (`smartmarket.cep.refino-timeout-ms`, 2000 ms) é separado do teto de BrasilAPI + ViaCEP (`smartmarket.cep.timeout-ms`, 2000 ms); se estourar, o cadastro segue com cidade e UF, sem coordenadas. A aplicação faz no máximo 1 requisição por segundo ao Nominatim (política de uso do serviço) e guarda em memória as últimas 5000 ruas resolvidas, então um pico de cadastros não passa desse ritmo (quem não consegue a vez dentro do teto fica sem coordenada e pode atualizar o CEP depois). **Privacidade:** o Nominatim recebe rua, bairro, cidade e UF do CEP, sem nome, e-mail nem identificador do usuário; o backend não grava CEP, rua nem coordenada em log. Coordenadas © colaboradores do OpenStreetMap.

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
