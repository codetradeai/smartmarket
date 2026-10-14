# Coleta SmartMarket — Adaptadores Fort Atacadista e Carrefour Mercado

Módulo de extração periódica de preços de supermercados para o projeto **SmartMarket** (Grupo 40 — Trilha Dev Full Stack 2026).

Contém os adaptadores para as duas redes oficiais da aplicação:
1. **Fort Atacadista** (`coleta_fort_atacadista.py`): API REST VIP Commerce / OSuper.
2. **Carrefour Mercado** (`coleta_carrefour.py`): Stream React Router SSR em arquitetura Headless Storefront.

Ambos os coletores cumprem estritamente o **Contrato de Extração v1**, possuem gravação atômica, validação com `Decimal`, garantia de moeda `BRL`, controle de falhas parciais e testes offline com fixtures.

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
> * `2`: Sucesso parcial (itens válidos salvos, mas houve falhas pontuais registradas no relatório).
> * `1`: Falha total ou fixture inválida (saída anterior preservada, sem sobrescrita).

---

## 2. Coleta em Tempo Real (HTTP Live)

Para executar a coleta real acessando os servidores:

```bash
# Instalação das dependências
pip install -r scraper/requirements.txt

# Execução Fort Atacadista
python scraper/coleta_fort_atacadista.py --output-dir scraper/output/fort

# Execução Carrefour Mercado
python scraper/coleta_carrefour.py --output-dir scraper/output/carrefour
```

---

## 3. Contrato de Extração v1

Ambos os coletores exportam arquivos `.json` e `.csv` com colunas idênticas:

| Campo | Tipo / Contrato |
|---|---|
| `nome_bruto` | String não vazia, preservada como recebida da fonte |
| `preco` | Número finito estritamente positivo (promocional se presente, senão preço normal) |
| `preco_normal` | Número finito positivo, ou `null` se não informado |
| `em_promocao` | Booleano indicando se o produto possui desconto ativo |
| `marca` | Marca do produto ou `null` quando ausente |
| `categoria` | Chave amigável da configuração (`Graos_Arrozes_Feijoes`, `Leites`) |
| `slug` | Caminho relativo do link do produto ou `null` |
| `id_produto_origem` | ID original no supermercado de origem |
| `supermercado` | Nome da rede (`"Fort Atacadista"` ou `"Carrefour"`) |
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

Para executar a orquestração completa das duas redes (Fort Atacadista e Carrefour Mercado) com persistência contínua, histórico de preços, idempotência e atualização de disponibilidade:

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

## 6. Documentos Complementares

* [`ENTREGA-PILOTO-FORT-NORMALIZACAO.md`](ENTREGA-PILOTO-FORT-NORMALIZACAO.md): Evidências e validação completa da extração do Supermercado 1 (Fort Atacadista) e normalização com a tabela `produto`.
* [`ROTINA-DE-CARGA.md`](ROTINA-DE-CARGA.md): Orquestração unificada, histórico e atualização contínua na tabela `preco`.
* [`ENTREGA-SEGUNDA-REDE.md`](ENTREGA-SEGUNDA-REDE.md): Detalhamento da análise e implementação do coletor do Carrefour Mercado.
* [`ENTREGA-JOAO.md`](ENTREGA-JOAO.md): Detalhamento do pipeline PostgreSQL, idempotência e revisão técnica v2.
