# Coleta SmartMarket — Coletores das redes do RS

Módulo de extração periódica de preços de supermercados para o projeto **SmartMarket** (Grupo 40 — Trilha Dev Full Stack 2026).

Há um coletor por rede (`coleta_<rede>.py`):

| Rede | Módulo | API / técnica |
|---|---|---|
| Fort Atacadista | `coleta_fort_atacadista.py` | Sense / OSuper (`sense.osuper.com.br`) |
| Carrefour Mercado | `coleta_carrefour.py` | Stream React Router SSR (headless storefront) |
| Asun Supermercados | `coleta_asun.py` | Sense / OSuper (`sense.osuper.com.br`) |
| Atacadão | `coleta_atacadao.py` | VTEX Catalog System |
| Master Supermercados | `coleta_master.py` | VipCommerce |
| Stok Center | `coleta_stok.py` | VipCommerce |
| Zaffari / Bourbon | `coleta_zaffari.py` | VTEX Catalog System (**suspenso na rotina**) |
| Rissul | `coleta_rissul.py` | VTEX Catalog System (**suspenso na rotina**) |

Zaffari e Rissul coletam por `/api/catalog_system/...`, que o `robots.txt` das duas redes proíbe; por isso `rotina_carga.py` as pula (`REDES_SUSPENSAS`) e os módulos ficam no repositório só até haver autorização. Na prática a rotina diária coleta **6 redes**.

Todos os coletores cumprem o **Contrato de Extração v1**, possuem gravação atômica, validação com `Decimal`, garantia de moeda `BRL`, controle de falhas parciais e testes offline com fixtures.

---

## 1. Testes e Demonstração Offline (Sem Rede)

Requer Python 3.10+ (validado com Python 3.11 e 3.14). Na raiz do projeto:

```bash
# Executa todos os testes unitários do scraper
python -m unittest discover -s scraper/tests -v

# Demonstração offline Fort Atacadista
python scraper/coleta_fort_atacadista.py --fixture scraper/tests/fixtures/fort_valido.json --output-dir scraper/output/fort_valido
python scraper/coleta_fort_atacadista.py --fixture scraper/tests/fixtures/fort_parcial.json --output-dir scraper/output/fort_parcial

# Demonstração offline Carrefour Mercado
python scraper/coleta_carrefour.py --fixture scraper/tests/fixtures/carrefour_valido.json --output-dir scraper/output/carrefour_valido
python scraper/coleta_carrefour.py --fixture scraper/tests/fixtures/carrefour_parcial.json --output-dir scraper/output/carrefour_parcial
```

> **Nota sobre códigos de retorno:**
> * `0`: Sucesso total (concluído sem falhas de item ou página).
> * `2`: Sucesso parcial (itens válidos salvos, mas houve falhas pontuais registradas no relatório). **Só Fort, Carrefour, Asun e Atacadão devolvem 2**; Master, Stok, Zaffari e Rissul devolvem apenas `0` ou `1`.
> * `1`: Falha total ou fixture inválida (saída anterior preservada, sem sobrescrita).

---

## 2. Coleta em Tempo Real (HTTP Live)

Para executar a coleta real acessando os servidores:

```bash
# Instalação das dependências
pip install -r scraper/requirements.txt

# Contato que identifica o SmartMarketBot no User-Agent (obrigatório na coleta real;
# o modo offline com --fixture não precisa). Ex.: a URL do repositório.
export SMARTMARKET_CONTATO="https://github.com/smartmarket-team/smartmarket"

# Execução Fort Atacadista
python scraper/coleta_fort_atacadista.py --output-dir scraper/output/fort

# Execução Carrefour Mercado
python scraper/coleta_carrefour.py --output-dir scraper/output/carrefour
```

Os demais coletores seguem o mesmo padrão (`--fixture` para o modo offline, `--output-dir` para a saída).

---

## 3. Contrato de Extração v1

Todos os coletores exportam arquivos `.json` e `.csv` com colunas idênticas:

| Campo | Tipo / Contrato |
|---|---|
| `nome_bruto` | String não vazia, preservada como recebida da fonte |
| `preco` | Número finito estritamente positivo (promocional se presente, senão preço normal) |
| `preco_normal` | Número finito positivo, ou `null` se não informado |
| `em_promocao` | Booleano indicando se o produto possui desconto ativo |
| `marca` | Marca do produto ou `null` quando ausente |
| `categoria` | Chave amigável da configuração de cada coletor (por exemplo `Graos_Arrozes_Feijoes`, `Leites`) |
| `slug` | Caminho relativo do link do produto ou `null` |
| `id_produto_origem` | ID original no supermercado de origem |
| `supermercado` | Nome da rede (por exemplo `"Fort Atacadista"`, `"Carrefour"`) |
| `data_coleta` | Timestamp ISO 8601 UTC com sufixo `+00:00` |

---

## 4. Saídas e Relatórios de Auditoria

Cada execução em um diretório de saída gera:
* `produtos_coletados.json`: Lista de produtos aceitos e validados.
* `produtos_coletados.csv`: Versão tabular com cabeçalho canônico.
* `relatorio_coleta.json`: Metadados da execução contendo `status`, `aceitos`, `falhas`, `saida_atualizada`, `modo`, `supermercado` e `executado_em`.

---

---

## 5. Rotina Automática de Inserção/Atualização na Tabela Preço

Para executar a orquestração completa das redes (as 8 de `REDES_CONFIG`, menos as suspensas) com persistência contínua, histórico de preços, idempotência e atualização de disponibilidade:

```bash
# Execução one-shot com fixtures (offline)
python scraper/rotina_carga.py --fixture --output-base scraper/output/rotina_teste

# Execução one-shot em produção
python scraper/rotina_carga.py --intervalo-minutos 0

# Execução contínua agendada (ex: a cada 6 horas = 360 minutos)
python scraper/rotina_carga.py --intervalo-minutos 360
```

Para detalhes completos de arquitetura, parâmetros de linha de comando e regras de negócio na tabela `preco`, consulte [`ROTINA-DE-CARGA.md`](ROTINA-DE-CARGA.md).

---

## 5.1 Limpeza do catálogo do frontend (`frontend/src/data.js`)

O `data.js` é editado por mais de um script e acumulou cópias, categorias por substring e unidades erradas. `limpar_catalogo.py` corrige isso de forma determinística e idempotente (cópias exatas por rede + idOrigem, linhas híbridas com preço simulado, categoria por palavra inteira com prioridade por tipo, unidade g/ml 1000x errada e nomes com encoding quebrado). Nunca renumera ids, só usa categorias que já existem e apenas lista (não remove) itens fora de supermercado.

```bash
python scraper/limpar_catalogo.py --verificar   # não grava; sai com 1 se houver o que limpar (use no CI/antes do PR)
python scraper/limpar_catalogo.py                # limpa o data.js
cd frontend && node scripts/gerar-catalogo-resumo.mjs   # atualiza os totais da Home
```

Registro da primeira limpeza, com cada id alterado (antes/depois): [`../docs/LIMPEZA-DO-CATALOGO.md`](../docs/LIMPEZA-DO-CATALOGO.md).

---

## 6. Documentos Complementares

* [`ROTINA-DE-CARGA.md`](ROTINA-DE-CARGA.md): Orquestração unificada, histórico e atualização contínua na tabela `preco`.
* [`../docs/diagnostico-scraper.md`](../docs/diagnostico-scraper.md): Diagnóstico das 8 redes (API, robots.txt, o que cada coletor captura).
* [`ENTREGA-SEGUNDA-REDE.md`](ENTREGA-SEGUNDA-REDE.md): Detalhamento da análise e implementação do coletor do Carrefour Mercado.
* [`ENTREGA-JOAO.md`](ENTREGA-JOAO.md): Detalhamento do pipeline PostgreSQL, idempotência e revisão técnica v2.
