---
name: cacar-bugs
description: Caça bugs no SmartMarket com vários caçadores em paralelo, verifica cada achado de forma adversarial, reproduz com teste e entrega um relatório (opcionalmente corrige, um bug por PR). Use quando o usuário pedir "caçar bugs", "procurar defeitos", "auditar", "varredura de bugs", ou antes de um deploy/merge grande.
---

# Caçar bugs

Varredura em quatro etapas: **escopo → caça em paralelo → verificação adversarial → relatório (e correção, se pedida)**. Quem caça é o agente `cacador-de-bugs` (`.claude/agents/cacador-de-bugs.md`), que traz o catálogo de armadilhas deste projeto. Para **um** bug específico que já apareceu, use `diagnosing-bugs`; para revisar um diff contra padrões e spec, use `code-review`.

## 1. Defina o escopo

Pergunte só se não for óbvio. Escopos comuns:

- **Diff**: `git diff <ponto-fixo>...HEAD` (padrão: desde o último merge relevante ou `origin/main`). Confirme que o ref existe e o diff não está vazio.
- **Área**: `frontend/src/pages`, `frontend/src/services`, `backend/src/main/java/com/smartmarket/<dominio>`, `scraper/`, `.github/workflows`.
- **Fluxo**: ex. "login → favoritos → lista → comparação de cesta", "coleta → carga → API → tela".

Anote o escopo em uma linha e liste os arquivos. Escopo grande demais (> ~40 arquivos) deve ser fatiado por área, uma rodada por fatia.

## 2. Caça em paralelo

Lance os caçadores **juntos** (`Agent`, `subagent_type: "cacador-de-bugs"`, em primeiro plano), cada um com uma lente diferente, todos com o mesmo escopo e um prompt autocontido (eles não veem esta conversa). Lentes sugeridas:

1. **Tipos e identidade**: ids `"p1"` x `Long`, `String(id)`, `Decimal`/`BigDecimal`, `null`/vazio, lista de um item.
2. **Estado e efeitos**: storage por usuário, `useEffect`/timers, merge `data.js` x API, estado que nunca renderiza, logout/401.
3. **Fronteiras e contratos**: front ↔ back (campos, status HTTP, DTO), back ↔ banco (`validate`, lazy loading, N+1), scraper ↔ banco (contrato v1, idempotência), bucket/Pages (base, CORS, cache).
4. **Autorização e segredos**: IDOR, papéis (`Papel`), JWT, CORS, vazamento em log/artefato, secrets em workflow.
5. **Testes e CI**: `skip`, testes que passam sem a correção, cobertura, workflows (`if` por secret, `concurrency`, `paths`).

Adapte: em escopo só de backend, troque a lente 2 por "transações, concorrência e datas/fuso"; em escopo de scraper, por "robots, pausa, exit codes, disponibilidade". Use 3 a 5 caçadores.

Peça sempre o formato do agente (gravidade, onde, como, impacto, reprodução, correção, confiança) e **somente achados verificados**.

## 3. Verificação adversarial

Junte os relatórios, **deduplique** por `arquivo:linha` + causa, e para cada achado restante lance dois céticos independentes (`Agent`, sem repassar o veredicto do caçador), cada um instruído a **refutar**:

- cético A: "o caminho de execução é alcançável? há guarda em outro lugar?";
- cético B: "reproduza de verdade (teste/comando). Sem reprodução, não confirme".

Regra: o achado **sobrevive** se nenhum cético conseguir refutá-lo e houver reprodução ou caminho de execução inequívoco; se divergirem, rebaixe para "plausível" e diga por quê. Descarte o que for refutado e registre quantos foram descartados, sem listar um a um.

## 4. Relatório

Entregue em PT-BR, do mais grave ao menos grave:

- Resumo: escopo, lentes usadas, nº de achados confirmados / plausíveis / descartados.
- Cada bug: título, gravidade, onde, como acontece, impacto, reprodução (teste ou comando), correção mínima sugerida.
- O que **não** foi coberto (honestidade sobre o limite da varredura).

Se o usuário usa Notion/Docs para acompanhar, publique lá; no GitHub, abra issues com o rótulo `bug` (seguindo `docs/agents/issue-tracker.md`) **só se o usuário pedir** e sem duplicar issues abertas (busque antes).

## 5. Correção (somente se pedida)

Para cada bug confirmado, um por vez: use a skill `tdd` (teste que falha → correção mínima → teste passa), confirme por **mutação** que o teste falha sem a correção, rode a suíte do pacote (`npm test`, `./mvnw test`, `python -m unittest discover -s scraper/tests`), uma branch e uma PR (rascunho) por bug, descrição em PT-BR no formato do `.github/pull_request_template.md`, com `Closes #N` (em inglês, para o GitHub fechar a issue). Não misture refatoração com correção.

## Limites

- Não altere banco, bucket, Render, Pages ou GitHub além de branches/PRs/issues pedidas.
- Não contorne `validar_dsn` do scraper nem baixe limiar de cobertura (70%).
- Nunca imprima segredos; redija com `<REDACTED>`.
- Se a varredura não achar nada verificado, diga isso. Não invente achados para parecer útil.
