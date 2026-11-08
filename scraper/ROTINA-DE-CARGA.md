# SmartMarket - Rotina Automática de Coleta e Carga na Tabela Preço

> **Status da Entrega**: Concluída e Validada  
> **Autores**: Equipe de Dados / Engenharia SmartMarket  
> **Complemento ao PR**: Resolvendo pendências do PR #10 (Commit `0efd7b4`)

---

## 1. Contexto e Objetivos

Esta entrega soluciona as pendências levantadas na entrega parcial da carga (PR #10 / commit `0efd7b4`):
1. **Redes integradas**: a entrega original ligou o **Carrefour Mercado** (`mercado.carrefour.com.br`) ao lado do **Fort Atacadista** (`fortatacadista.com.br`). Hoje `REDES_CONFIG` tem as **8 redes** (Fort, Carrefour, Asun, Atacadão, Master, Zaffari, Rissul, Stok), mas Zaffari e Rissul estão **suspensas** (`REDES_SUSPENSAS`: o `robots.txt` delas proíbe `/api/`): a rotina as pula e registra `status: suspensa` no relatório. Na prática **6 redes** coletam e carregam por dia; os preços de Zaffari e Rissul no banco são históricos.
2. **Rotina de Carga Automática e Contínua**: Orquestrador unificado (`scraper/rotina_carga.py`) que executa a extração, normalização estrita (Contrato v1), persistência com histórico e idempotência na tabela `preco`.
3. **Agendamento e Multiplataforma**: Suporte nativo a execução em lote (*one-shot*) ou modo contínuo (*daemon* agendado), com controle de concorrência via arquivo de lock multiplataforma (sem dependência do `fcntl` exclusivo de Unix/Linux).
4. **Regras de Negócio na Tabela `preco`**:
   - **Preservação de Histórico**: Cada coleta bem-sucedida armazena uma nova observação na tabela `preco` com `coletado_em` em UTC, permitindo gráficos de evolução temporal.
   - **Idempotência por Hash**: Replays idênticos dentro da mesma rodada ou mesmo timestamp não duplicam registros na tabela `preco`.
   - **Atualização de Indisponibilidade (Cenário 3.1 BDD)**: Produtos vinculados à loja que deixam de constar na coleta mais recente têm seu status atualizado para `disponivel = FALSE`. Isso só acontece quando a coleta foi **completa** (status 0, sem falhas) **e exaustiva** (`coleta_exaustiva: True` na entrada da rede em `REDES_CONFIG`). Coleta parcial (status 2) ou por amostra (top-N por categoria, o caso de todos os coletores hoje) carrega os preços, mas **não** marca ninguém como indisponível; o resumo da rede traz `indisponibilidade` = `atualizada`, `ignorada_coleta_parcial` ou `ignorada_coleta_amostral`.
   - **Quarentena de registros inválidos**: um registro inválido (sem `id_produto_origem`, preço fora do intervalo, data sem fuso, cadastro de origem alterado que exige revisão, etc.) **não** derruba mais a carga da rede. Os válidos são carregados e os rejeitados são gravados em `quarentena.json` na pasta da execução, com índice, id, nome e **motivo**; o ciclo da rede fica `parcial`. O lote só falha (nada é gravado) quando a fração rejeitada passa de 20% (`LIMITE_REJEICAO_PADRAO` em `pipeline.py`) ou quando nenhum registro é válido. Os coletores já descartam na origem os itens sem id. Itens com `cadastro_origem_alterado_exige_revisao` (renomeados/mudança de embalagem na origem) ficam sem preço novo até a revisão, em vez de receber o preço de um produto possivelmente diferente.
   - **Preço com mais de 2 casas** (ex.: 12,345 por kg): arredondado para centavos com `ROUND_HALF_UP` (12,35). Mais de 4 casas decimais, ou um valor que arredonda para zero, vai para a quarentena.
   - **Lock órfão**: se o processo dono do `.rotina.lock` morreu (kill -9, OOM, queda de energia), a próxima execução detecta o pid inexistente, remove o lock e segue. Lock sem pid legível só é recuperado depois de 60 s.
   - **`SMARTMARKET_CONTATO` (obrigatória na coleta real)**: contato que identifica o SmartMarketBot no User-Agent (`identificacao.py`). Sem ela, Fort, Master e Stok terminam com `ErroConfiguracao` antes de requisitar. `cron_coleta_diaria.sh` e `smartmarket-scraper.service` já definem um valor padrão (URL do repositório); para outro contato, exporte a variável antes do script ou use `systemctl edit smartmarket-scraper`. O modo `--fixture` não precisa dela. O workflow `coleta_diaria.yml` só roda testes e arquivos, sem coleta HTTP.
   - **Inicialização Automática de Mercados**: Garante a integridade referencial inserindo as redes na tabela `mercado` (`id=1` Fort, `2` Carrefour, `3` Asun, `4` Atacadão, `5` Master, `6` Zaffari, `7` Rissul, `8` Stok), ids iguais aos de `backend/deploy/02_mercados.sql`.

---

## 2. Arquitetura da Rotina

O fluxo de execução do script `scraper/rotina_carga.py` opera nas seguintes camadas:

```
[ Agendador / CLI ]
       │
       ▼
[ LockProcesso (.rotina.lock) ] ── (Garante processo único)
       │
       ├──► Para cada rede de REDES_CONFIG (Zaffari e Rissul: puladas, status 'suspensa')
       │       ├─► Coleta (Fort/Asun: Sense/OSuper; Carrefour: stream SSR; Atacadão: VTEX;
       │       │   Master/Stok: VipCommerce) -> JSON Canônico (10 campos)
       │       ├─► Normalização de Medidas e Decimal estrito (BRL)
       │       ├─► Inserção/Atualização na tabela 'preco' (via pipeline.py); inválidos -> quarentena.json
       │       └─► Indisponibilidade (disponivel = FALSE) só se a coleta for completa e exaustiva
       │
       ├──► Casamento entre redes e gravação de vínculos (vinculo_produto)
       │
       ▼
[ Relatório Operacional Atômico ] (relatorio_rotina.json)
```

---

## 3. Redes Configuradas

| Mercado ID | Source | Módulo | Store | API | Fixture offline | Na rotina |
|:---:|---|---|---|---|---|---|
| 1 | `fort` | `coleta_fort_atacadista.py` | `1585` | Sense / OSuper | `fort_valido.json` | sim |
| 2 | `carrefour` | `coleta_carrefour.py` | `mercado` | stream SSR (headless) | `carrefour_valido.json` | sim |
| 3 | `asun` | `coleta_asun.py` | `1560` | Sense / OSuper | `asun_valido.json` | sim |
| 4 | `atacadao` | `coleta_atacadao.py` | `online` | VTEX | `atacadao_valido.json` | sim |
| 5 | `master` | `coleta_master.py` | `filial_1` | VipCommerce | `master_valido.json` | sim |
| 6 | `zaffari` | `coleta_zaffari.py` | `online` | VTEX | `zaffari_valido.json` | **suspensa** |
| 7 | `rissul` | `coleta_rissul.py` | `online` | VTEX | `rissul_valido.json` | **suspensa** |
| 8 | `stok` | `coleta_stok.py` | `filial_1` | VipCommerce | `stok_valido.json` | sim |

Fonte da verdade: `REDES_CONFIG` e `REDES_SUSPENSAS` em `scraper/rotina_carga.py`. Nenhuma rede real declara `coleta_exaustiva` hoje (todos os coletores amostram), então a rotina não marca produto algum como indisponível.

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
4. Sem nenhuma das anteriores: encerra com mensagem de erro pedindo que `SMARTMARKET_DSN` seja definido (sem fallback de senha desde fix/segredos-config).

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
│       ├── quarentena.json                <-- só existe se algum registro foi rejeitado
│       └── checkpoint_carga.json
├── (asun/, atacadao/, master/, stok/ no mesmo formato; zaffari/ e rissul/ não são gerados)
└── relatorios/
    └── relatorio_rotina.json              <-- Relatório operacional consolidado
```

### Exemplo de `relatorio_rotina.json` (reduzido a duas redes; o real traz uma entrada por rede de `REDES_CONFIG`, com `status: suspensa` e `motivo` para Zaffari e Rissul):
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

A suíte completa do scraper tem hoje **367 testes** (32 pulados sem Postgres de teste ou sem rede); os principais grupos são:
1. `test_coleta_carrefour.py`: Extração e parser do stream React Router, extração de preços, marcas, unidades de medida e tratamento de falhas.
2. `test_coleta_fort_atacadista.py`: Extração via Sense/OSuper e tratamento de payload. Há um `test_coleta_<rede>.py` para cada uma das outras redes.
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
Resultado esperado: `OK`, com os testes que exigem `SMARTMARKET_TEST_DSN` pulados quando a variável não existe.
