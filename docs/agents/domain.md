# Documentação de domínio

Como as skills de engenharia devem consumir a documentação de domínio deste repositório ao explorar o código.

## Antes de explorar, leia

- **`GLOSSARY.md`** na raiz do repositório, ou
- **`GLOSSARY-MAP.md`** na raiz, se existir: ele aponta para um `GLOSSARY.md` por contexto. Leia cada um que for relevante para o assunto.
- **`docs/adr/`**: leia os ADRs que tocam a área em que você vai trabalhar. Em repositórios multi-contexto, veja também `src/<contexto>/docs/adr/` para decisões específicas do contexto.

Se algum desses arquivos não existir, **siga em frente sem avisar**. Não sinalize a ausência e não sugira criá-los de antemão. A skill `/domain-modeling` (acionada por `/grill-with-docs` e `/improve-codebase-architecture`) os cria sob demanda, quando termos ou decisões são de fato resolvidos.

## Estrutura de arquivos

Repositório de contexto único (este caso):

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Repositório multi-contexto (há um `GLOSSARY-MAP.md` na raiz):

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← decisões do sistema inteiro
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← decisões específicas do contexto
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito de domínio (no título de uma issue, numa proposta de refatoração, numa hipótese, no nome de um teste), use o termo como definido no `GLOSSARY.md`. Não escorregue para sinônimos que o glossário evita explicitamente.

Se o conceito de que você precisa ainda não está no glossário, isso é um sinal: ou você está inventando uma linguagem que o projeto não usa (reconsidere), ou há uma lacuna real (anote para o `/domain-modeling`).

## Sinalize conflitos com ADRs

Se sua saída contradiz um ADR existente, deixe isso explícito em vez de sobrescrevê-lo em silêncio:

> _Contradiz o ADR-0007 (pedidos com event sourcing), mas vale reabrir porque…_
