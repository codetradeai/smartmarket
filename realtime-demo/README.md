# Demonstração: live query com Neon Realtime

Mostra o caminho completo de uma *live query*: uma consulta SQL que o servidor sela, um cliente que a
assina e recebe cada mudança do banco sem consultar de novo. Usa a tabela `realtime_demo`
(`schema.sql`) no banco do Neon. **Não faz parte do app**: é só um exemplo para o grupo estudar.

> O Neon Realtime está em beta (SDK `@neon/realtime` 0.2.0). Siga a skill `neon-realtime` e a
> documentação oficial em vez de supor APIs.

## Como funciona

1. **`servidor.mjs`** define a consulta (`SELECT ... FROM realtime_demo`), **sela** com
   `NEON_REALTIME_SECRET` e entrega a consulta selada em `POST /api/live`. O cliente não vê nem altera o SQL.
2. **`assinante.mjs`** busca a consulta selada e a assina com `createRealtimeClient(...).subscribe(...)`.
   Recebe o resultado inicial e, depois, cada transação confirmada. Quando a consulta selada expira
   (`stale`), o cliente pede outra igual e chama `renew()`.
3. **Escrita**: `POST /api/mensagens` insere a linha e devolve o `txid` no próprio `RETURNING`
   (`pg_current_xact_id()`). Um cliente pode esperar esse `txid` com `assinatura.awaitTxId(txid, 10_000)`.

## Como rodar

Pré-requisitos: Node 20.19+; `.env.local` na raiz do repositório com `DATABASE_URL`,
`NEON_REALTIME_URL` e `NEON_REALTIME_SECRET` (`neon env pull --service postgres --service realtime`).
Esse arquivo é ignorado pelo Git: **nunca** o commite.

```bash
cd realtime-demo
npm install
# criar a tabela uma vez (psql, console SQL do Neon ou o SQL abaixo):  schema.sql
npm run servidor            # terminal 1
npm run assinante           # terminal 2: mostra as linhas ao vivo
npm run inserir -- "olá"    # terminal 3: a linha aparece no terminal 2
```

## Cuidados

- Uma consulta selada é um **token ao portador**: quem a tem consegue assiná-la até expirar. Não a ponha em
  URL, log nem armazenamento persistente.
- Esta demonstração **não tem login**. Num endpoint real, autentique o usuário antes de selar e ponha a
  autorização dentro da própria consulta (por exemplo, com um `JOIN` na tabela de membros).
- Não exponha `servidor.mjs` na internet: qualquer pessoa poderia gravar mensagens.
- Consultas devem ser só de leitura e determinísticas (sem `now()`); valores variáveis entram como parâmetros.
