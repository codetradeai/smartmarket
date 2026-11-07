# Issue tracker: GitHub

As issues e specs deste repositório ficam como issues do GitHub. Use a CLI `gh` para todas as operações.

## Convenções

- **Criar uma issue**: `gh issue create --title "..." --body "..."`. Use heredoc para corpos com várias linhas.
- **Ler uma issue**: `gh issue view <número> --json number,title,body,labels,comments`.
- **Listar issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` com os filtros `--label` e `--state` adequados.
- **Tornar uma issue sub-issue de uma pai**: `gh issue create --parent <pai> ...`, ou depois `gh issue edit <pai> --add-sub-issue <filha>` (`gh` 2.94+). Em `gh` mais antigo: `gh api --method POST repos/<owner>/<repo>/issues/<pai>/sub_issues -F sub_issue_id=<id-do-banco-da-filha>` (id do banco, como em **Bloqueio** abaixo). Sem sub-issues, ponha `Part of #<pai>` no topo do corpo da filha.
- **Bloqueio**: use as **dependências nativas de issues** do GitHub, a representação canônica e visível na interface. Adicione uma aresta com `gh issue create --blocked-by <n>,<n> ...` ou `gh issue edit <filha> --add-blocked-by <bloqueadora>` (`gh` 2.94+). Em `gh` mais antigo: `gh api --method POST repos/<owner>/<repo>/issues/<filha>/dependencies/blocked_by -F issue_id=<id-do-banco-da-bloqueadora>`, onde o id é o **id numérico do banco** da bloqueadora (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _não_ o `#número` nem o `node_id`). Onde as dependências não existirem, use como alternativa uma linha `Blocked by: #<n>, #<n>` no topo do corpo da filha. Um ticket está desbloqueado quando todas as bloqueadoras estão fechadas.
- **Contar bloqueios abertos**: `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (só bloqueios abertos; 0 significa pronto para começar). `gh issue view <n> --json blockedBy` também lista as já fechadas, então filtre: `--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`.
- **Comentar numa issue**: `gh issue comment <número> --body "..."`
- **Aplicar / remover labels**: `gh issue edit <número> --add-label "..."` / `--remove-label "..."`
- **Fechar**: publique a explicação com `gh issue comment <número> --body "..."` e depois `gh issue close <número>`. Em issue já fechada, `gh issue close --comment` descarta o comentário e ainda sai com código 0.

O repositório é inferido de `git remote -v`; o `gh` faz isso sozinho dentro de um clone.

Abra issues apenas no repositório do próprio usuário. Nunca abra em `mattpocock/skills` (o repositório de onde vêm estas skills), a menos que seja dele. Em um fork, o `gh` pode usar o repositório de origem como padrão; por isso, antes do primeiro `gh issue create` da sessão, confira o destino com `gh repo view --json nameWithOwner` e confirme com o usuário se não for o repositório dele.

## Pull requests como superfície de triagem

**PRs como superfície de pedidos: não.** _(Mude para `sim` se este repositório tratar PRs externas como pedidos de funcionalidade; o `/triage` lê esta flag.)_

Quando estiver em `sim`, as PRs passam pelos mesmos labels e estados das issues, usando os equivalentes `gh pr`:

- **Ler uma PR**: `gh pr view <número>`, depois `gh pr view <número> --comments` (fora de um TTY, `--comments` imprime só os comentários, sem o corpo) e `gh pr diff <número>` para o diff.
- **Listar PRs externas para triagem**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comentar / aplicar label / fechar**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

O GitHub usa um único espaço de numeração para issues e PRs, então um `#42` solto pode ser qualquer um dos dois: resolva com `gh pr view 42` e, se falhar, `gh issue view 42`.

## Quando uma skill diz "publique no issue tracker"

Crie uma issue do GitHub.

## Quando uma skill diz "busque o ticket relevante"

Leia como em **Ler uma issue**, acima.

## Operações de wayfinding

Usadas pelo `/wayfinder`. O **mapa** é uma única issue, e os **filhos** são issues que funcionam como tickets.

- **Mapa**: uma única issue com o label `wayfinder:map`, contendo as seções Notas / Decisões até agora / Névoa. `gh issue create --label wayfinder:map`.
- **Ticket filho**: uma issue ligada ao mapa como sub-issue do GitHub (veja **Tornar uma issue sub-issue de uma pai**). Onde sub-issues não estiverem habilitadas, adicione o filho a uma lista de tarefas no corpo do mapa e ponha `Part of #<mapa>` no topo do corpo do filho. Labels: `wayfinder:<tipo>` (`research`/`prototype`/`grilling`/`task`). Quando assumido, o ticket é atribuído a quem está conduzindo.
- **Bloqueio**: veja **Bloqueio** em Convenções.
- **Consulta de fronteira**: liste os filhos abertos do mapa (`gh issue list --state open`, restrito às sub-issues do mapa ou à lista de tarefas), descarte os que têm bloqueio aberto (veja **Contar bloqueios abertos**, ou uma issue aberta na linha `Blocked by`) ou responsável; vence o primeiro na ordem do mapa.
- **Assumir**: `gh issue edit <n> --add-assignee @me`, a primeira escrita da sessão.
- **Resolver**: `gh issue comment <n> --body "<resposta>"`, depois `gh issue close <n>`, e por fim acrescente um ponteiro de contexto (gist + link) às Decisões até agora do mapa.

## Notas deste repositório

- Repositório: `codetradeai/smartmarket`. O endereço antigo `opedromeireless/smartmarket` redireciona para ele.
- Nas sessões do Claude Code na nuvem, `gh issue create`/`gh issue list` funcionam, mas comandos que usam GraphQL (como `gh repo view`) são bloqueados. Nesses casos, use `gh api repos/codetradeai/smartmarket/...`.
- Antes de criar uma issue, confirme o repositório de destino com `gh repo view --json nameWithOwner` (ou pela API REST, se o GraphQL estiver bloqueado).
