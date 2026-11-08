# Comentários de bots nas PRs: o que olhar

Nas PRs aparecem comentários de bots. A maioria é informativa. Este guia diz o que vale ler,
para ninguém perder tempo nem ignorar um aviso real.

## ECC Tools (`ecc-tools[bot]`)

A cada commit de uma PR ele posta cerca de 6 comentários. Todos terminam com *"Check publication was
denied or unavailable. An app owner must enable Checks: read and write"*: o bot queria publicar como
*check*, mas não tem a permissão e cai nos comentários. Por isso são tantos.

| Comentário | Leia? | Observação |
| --- | --- | --- |
| **PR Config Audit** | Sim, se a PR mexe em workflow ou configuração | Procura problemas nos arquivos de configuração alterados. |
| **PR Harness Audit** | Sim, se a PR mexe em configuração de agentes | Mesma ideia, para arquivos de agentes. |
| **Security Evidence** | Com atenção | Pede "evidência de scanner" quando mexe em área sensível. Dispara por engano em arquivos de skills (`.claude/skills/*/agents/openai.yaml`). Se a PR realmente mexe em login, segredo ou CI, trate como lembrete de teste. |
| **PR Risk Taxonomy** | Passe o olho | Lembretes genéricos (ex.: atualizar `.env.example`, registrar como o CI falha). Úteis só quando o lembrete se aplica ao que você mudou. |
| **Reference Set Readiness** | Ignore | Fala de corpus de analisadores e RAG do próprio ECC Tools, não do SmartMarket. |
| **Hosted Promotion Readiness** | Ignore | Idem. |

Regras práticas:
- Um comentário "informativo" ou "neutral" não bloqueia a PR e não exige novo push.
- Só aja se o aviso apontar um defeito real **que a sua PR introduziu**.
- O Security Evidence roda em modo `enforce`. Não o marque como verificação obrigatória na proteção da `main`.

### Reduzir o barulho (quem administra o repositório)
- Dar ao app a permissão **Checks: read and write** (GitHub > Settings > Applications > ecc-tools > Configure)
  deve mover os resultados para a lista de checks e parar os comentários. Isso não foi testado aqui.
- Ou restringir/desinstalar o app neste repositório, nas mesmas configurações.

## Vercel (`vercel[bot]`) — desativada

> O frontend não é mais publicado na Vercel (agora GitHub Pages). Se o projeto antigo ainda estiver conectado ao repositório, os comentários abaixo continuam valendo até ele ser apagado.

Um comentário por PR, atualizado a cada deploy de Preview. É útil: tem o **link do Preview** e o estado
do build. Os Previews só são gerados quando o último commit mexe em `frontend/` (ver `vercel.json`).

## O que fazer de verdade com "falta evidência de segurança"
O sinal que se repete é a falta de varredura automática. As opções reais, em ordem de custo:
1. **Secret scanning e push protection** do GitHub (sem minutos de Actions).
2. **Dependabot** para dependências (npm, Maven, pip).
3. **CodeQL** como workflow: útil, mas gasta minutos de Actions. Ligue só depois de conferir a cota.
