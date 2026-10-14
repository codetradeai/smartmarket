# SmartMarket - Rotina Automática de Coleta e Carga na Tabela Preço

> **Status da Entrega**: Concluída e Validada  
> **Autores**: Equipe de Dados / Engenharia SmartMarket  
> **Complemento ao PR**: Resolvendo pendências do PR #10 (Commit `0efd7b4`)

---

## 1. Contexto e Objetivos

Esta entrega soluciona as pendências levantadas na entrega parcial da carga (PR #10 / commit `0efd7b4`):
1. **Coletor da Segunda Rede Integrado**: Coletor oficial do **Carrefour Mercado** (`mercado.carrefour.com.br`) integrado ao lado do **Fort Atacadista** (`fortatacadista.com.br`).
2. **Rotina de Carga Automática e Contínua**: Orquestrador unificado (`scraper/rotina_carga.py`) que executa a extração, normalização estrita (Contrato v1), persistência com histórico e idempotência na tabela `preco`.
3. **Agendamento e Multiplataforma**: Suporte nativo a execução em lote (*one-shot*) ou modo contínuo (*daemon* agendado), com controle de concorrência via arquivo de lock multiplataforma (sem dependência do `fcntl` exclusivo de Unix/Linux).
4. **Regras de Negócio na Tabela `preco`**:
   - **Preservação de Histórico**: Cada coleta bem-sucedida armazena uma nova observação na tabela `preco` com `coletado_em` em UTC, permitindo gráficos de evolução temporal.
   - **Idempotência por Hash**: Replays idênticos dentro da mesma rodada ou mesmo timestamp não duplicam registros na tabela `preco`.
   - **Atualização de Indisponibilidade (Cenário 3.1 BDD)**: Produtos vinculados à loja que deixam de constar na coleta mais recente têm seu status atualizado para `disponivel = FALSE`.
   - **Inicialização Automática de Mercados**: Garante a integridade referencial inserindo as redes na tabela `mercado` (`id=1`: Fort Atacadista, `id=2`: Carrefour).

---

## 2. Arquitetura da Rotina

O fluxo de execução do script `scraper/rotina_carga.py` opera nas seguintes camadas:

```
[ Agendador / CLI ]
       │
       ▼
[ LockProcesso (.rotina.lock) ] ── (Garante processo único)
       │
       ├──► Rede 1: Fort Atacadista (Loja 1585 - Mercado ID 1)
       │       ├─► Coleta (API GraphQL) -> JSON Canônico (10 campos)
       │       ├─► Normalização de Medidas e Decimal estrito (BRL)
       │       ├─► Inserção/Atualização na tabela 'preco' (via pipeline.py)
       │       └─► Atualização de Indisponibilidade (disponivel = FALSE)
       │
       ├──► Rede 2: Carrefour Mercado (Storefront Headless - Mercado ID 2)
       │       ├─► Coleta (SSR Stream Controller) -> JSON Canônico (10 campos)
       │       ├─► Normalização de Medidas e Decimal estrito (BRL)
       │       ├─► Inserção/Atualização na tabela 'preco' (via pipeline.py)
       │       └─► Atualização de Indisponibilidade (disponivel = FALSE)
       │
       ▼
[ Relatório Operacional Atômico ] (relatorio_rotina.json)
```

---

## 3. Redes Configuradas

| Parâmetro | Rede 1: Fort Atacadista | Rede 2: Carrefour Mercado |
|---|---|---|
| **Módulo** | `scraper/coleta_fort_atacadista.py` | `scraper/coleta_carrefour.py` |
| **Source** | `fort` | `carrefour` |
| **Store** | `1585` (Kobrasol / SC) | `mercado` (Storefront Headless Food) |
| **Mercado ID** | `1` | `2` |
| **URL Base** | `https://fortatacadista.com.br/` | `https://mercado.carrefour.com.br/` |
| **Fixture Offline** | `fort_valido.json` | `carrefour_valido.json` |

---

## 4. Como Executar

### 4.1. Modo Fixture (Validação Offline / CI)
Permite validar todo o fluxo de ponta a ponta sem disparar requisições web externas:
```bash
python scraper/rotina_carga.py --fixture --output-base scraper/output/rotina_teste
```

### 4.2. Modo One-Shot (Execução Única em Produção)
Ideal para ser acionado por cron do Linux, Kubernetes CronJob ou Agendador de Tarefas do Windows:
```bash
python scraper/rotina_carga.py --intervalo-minutos 0
```

### 4.3. Modo Daemon / Agendamento Contínuo
Mantém o processo em segundo plano executando coletas em intervalos regulares (exemplo: a cada 6 horas = 360 minutos):
```bash
python scraper/rotina_carga.py --intervalo-minutos 360
```

### 4.4. Conexão com o Banco de Dados
Por padrão, a rotina busca a conexão na seguinte ordem:
1. Argumento CLI `--dsn "host=... dbname=... user=... password=..."`
2. Variável de ambiente `SMARTMARKET_DSN`
3. Variável de ambiente `SMARTMARKET_LOCAL_DSN`
4. Padrão local: `host=localhost port=5436 dbname=smartmarket user=smartmarket password=smartmarket123`

---

## 5. Estrutura de Artefatos Gerados

Cada ciclo de coleta e carga gera saídas isoladas e organizadas por timestamp:

```
scraper/output/rotina/
├── .rotina.lock                           <-- Lock de exclusão mútua
├── carrefour/
│   └── carrefour_mercado_YYYYMMDD_HHMMSS/
│       ├── produtos_coletados.json        <-- Lote canônico coletado
│       └── checkpoint_carga.json          <-- Checkpoint com hash de integridade
├── fort/
│   └── fort_1585_YYYYMMDD_HHMMSS/
│       ├── produtos_coletados.json
│       └── checkpoint_carga.json
└── relatorios/
    └── relatorio_rotina.json              <-- Relatório operacional consolidado
```

### Exemplo de `relatorio_rotina.json`:
```json
{
  "executado_em": "2026-10-14T20:49:20Z",
  "duracao_segundos": 1.45,
  "modo": "live",
  "redes": {
    "fort": {
      "source": "fort",
      "store": "1585",
      "status": "concluido",
      "total_coletados": 40,
      "produtos_criados": 0,
      "precos_inseridos": 40,
      "eventos_repetidos": 0,
      "reexecucao": false
    },
    "carrefour": {
      "source": "carrefour",
      "store": "mercado",
      "status": "concluido",
      "total_coletados": 40,
      "produtos_criados": 0,
      "precos_inseridos": 40,
      "eventos_repetidos": 0,
      "reexecucao": false
    }
  },
  "sucesso_geral": true
}
```

---

## 6. Validação e Qualidade (Testes Automatizados)

A suíte completa de testes contém **94 testes unitários e de integração offline**, cobrindo:
1. `test_coleta_carrefour.py`: Extração e parser do stream React Router, extração de preços, marcas, unidades de medida e tratamento de falhas.
2. `test_coleta_fort_atacadista.py`: Extração via GraphQL e tratamento de payload.
3. `test_normalizacao_pipeline.py`: Conversão de medidas, tipagem monetária estrita com `Decimal` e semântica UTC.
4. `test_rotina_carga.py`:
   - Aquisição e liberação do `LockProcesso`.
   - Bloqueio de execuções concorrentes (`ErroIngestao`).
   - Prioridades e fallback de `DSN`.
   - Inicialização e garantia dos registros na tabela `mercado`.
   - Atualização de status para `disponivel = FALSE` de itens ausentes na coleta (Cenário 3.1 BDD).
   - Orquestração de ciclo com fixtures e geração de relatório JSON.
   - Interface de linha de comando (*CLI main*).
5. `test_revisao_adversarial.py` e `test_validacao_regras.py`: Imutabilidade de moedas, rejeição de arredondamentos e idempotência.

Para rodar toda a suíte:
```bash
python -m unittest discover -s scraper/tests -v
```
Resultado: **94 testes executados, 100% de sucesso**.
