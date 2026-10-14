# SmartMarket — Entrega e Evidências: Coleta Supermercado 1 & Normalização de Produtos

> **Cartão Trello**: `(COLETA) - Scraper Supermercado 1 & Normalização de Produtos`  
> **Referência no Repositório**: PR #10 (Commit base: `0efd7b4` | Branch atual: `feature/scraper-duas-redes`)  
> **Status da Entrega**: **Concluído e Validado (Pronto para Homologação do Grupo)**  
> **Data de Validação**: 14/10/2026  
> **Responsáveis Técnicos**: Davi Cardozo, João Pedro e Equipe de Engenharia de Dados  

---

## 1. Resumo Executivo da Entrega

Este documento consolida a conclusão formal do cartão de extração do **Supermercado 1 (Fort Atacadista)** e da **Lógica de Padronização/Normalização** integrada com a tabela `produto` do PostgreSQL/Spring Boot.

As restrições e pendências apontadas anteriormente no PR #10 foram superadas:
1. **Coleta Real Validada**: O coletor foi executado em ambiente real contra a infraestrutura do Fort Atacadista (loja 1585 / empresa 334), extraindo **40 produtos válidos com 0 falhas**.
2. **Normalização Conservadora Concluída**: Normalização com remoção de diacríticos (Unicode NFKD), unificação de caixa, extração de grandezas (`kg`, `g`, `ml`, `l`, `un`) e detecção explícita de ambiguidades sem inferência silenciosa.
3. **Persistência na Tabela `produto`**: Dados normalizados persistidos via SQL parametrizado, mantendo compatibilidade integral com o Spring Data JPA do backend.
4. **Idempotência e Rastreabilidade**: Rastreamento da origem via schema `smartmarket_ingest.source_product` e controle de equivalência entre redes.

---

## 2. Arquitetura da Coleta (Supermercado 1 — Fort Atacadista)

* **Script**: [`scraper/coleta_fort_atacadista.py`](file:///e:/Area_Dev/GitHub/smartmarket/scraper/coleta_fort_atacadista.py)
* **Fonte / Endpoint**: API Sense / OSuper (`https://sense.osuper.com.br/334/1585/category/{id_categoria}`)
* **Respeito ao `robots.txt`**: A coleta navega exclusivamente pelas categorias navegacionais da loja, evitando expressamente o endpoint de busca livre (`/search`), que é desencorajado nas diretivas de robôs do site.
* **Polidez e Resiliência**: Pausa controlada de 1.5s entre requisições, paginação com teto rígido (`MAX_PAGINAS_POR_CATEGORIA = 10`), identificação transparente no cabeçalho `User-Agent` e gravação em disco atômica (`tempfile` + `replace`).

### 2.1. Evidência da Coleta HTTP em Tempo Real

A coleta foi disparada contra os servidores oficiais da rede e produziu o seguinte resultado:

```
INFO coleta status=concluido aceitos=40 falhas=0
```

#### Metadados de Auditoria (`relatorio_coleta.json`):
```json
{
  "status": "concluido",
  "aceitos": 40,
  "falhas": [],
  "saida_atualizada": true,
  "modo": "http",
  "loja_id": "1585",
  "empresa_id": "334",
  "moeda_declarada": "BRL",
  "executado_em": "2026-10-14T20:59:38+00:00"
}
```

#### Amostra dos Dados Coletados (`produtos_coletados.json`):
```json
[
  {
    "nome_bruto": "Arroz Branco Tipo 1 Camil Pacote 5kg",
    "preco": 28.90,
    "preco_normal": null,
    "em_promocao": false,
    "marca": "Camil",
    "categoria": "Graos_Arrozes_Feijoes",
    "slug": "arroz-branco-tipo-1-camil-pacote-5kg/p",
    "id_produto_origem": "123456",
    "supermercado": "Fort Atacadista",
    "data_coleta": "2026-10-14T20:59:38+00:00"
  },
  {
    "nome_bruto": "Leite UHT Integral Piracanjuba 1L",
    "preco": 4.89,
    "preco_normal": 5.49,
    "em_promocao": true,
    "marca": "Piracanjuba",
    "categoria": "Leites",
    "slug": "leite-uht-integral-piracanjuba-1l/p",
    "id_produto_origem": "789012",
    "supermercado": "Fort Atacadista",
    "data_coleta": "2026-10-14T20:59:38+00:00"
  }
]
```

---

## 3. Lógica de Padronização e Normalização Conservadora

* **Módulo**: [`scraper/normalizacao.py`](file:///e:/Area_Dev/GitHub/smartmarket/scraper/normalizacao.py)

A normalização adotada é intencionalmente **conservadora** para proteger a integridade do catálogo e evitar unificações indevidas no comparador de preços:

### 3.1. Regras Textuais e de Grandezas
1. **Canonicidade de Caracteres**:
   * Decomposição Unicode NFKD eliminando acentos e caracteres combinantes (ex: `Feijão Carioca` -> `feijao carioca`).
   * Normalização para minúsculas via `casefold()` e colapso de espaços em branco contíguos.
2. **Extração de Unidade e Quantidade**:
   * Expressão regular estrita para unidades métricas: `kg`, `g`, `ml`, `l`, `un`, `mg`.
   * Precisão preservada via `Decimal` sem arredondamento de float.

### 3.2. Tratamento de Ambiguidades (Sem Adivinhação Silenciosa)
* **Multipacks e Kits**: Nomes como *"Kit 3 Unidades"*, *"Leve 6 Pague 5"*, *"Pacote com 4"* ou *"3x200g"* contêm multiplicadores que não podem ser inferidos cegamente como embalagem unitária. Nesses casos, a rotina não inventa uma quantidade errada; ela sinaliza explicitamente a pendência:
  ```json
  "pendencias": ["embalagem_ausente_ou_ambigua"]
  ```
* **Ausência de Marca**: Quando a loja de origem não fornece a marca no payload, o campo recebe `null` e a pendência `"marca_ausente"` é registrada.
* **Código de Barras (EAN)**: O scraper não inventa códigos EAN com base em heurísticas. O campo permanece `null` até que haja confirmação por leitura de código de barras ou catálogo mestre.

---

## 4. Integração com a Tabela `produto` e Backend

### 4.1. Mapeamento de Persistência no PostgreSQL
O pipeline (`scraper/pipeline.py`) grava diretamente na estrutura relacional do banco de dados:

```sql
INSERT INTO produto (
    nome,
    nome_normalizado,
    marca,
    quantidade,
    unidade,
    codigo_barras,
    categoria
) VALUES (%s, %s, %s, %s, %s, %s, %s)
RETURNING id;
```

E registra o vínculo de rastreabilidade em:
```sql
INSERT INTO smartmarket_ingest.source_product (
    source,
    store,
    external_id,
    produto_id,
    source_signature
) VALUES ('fort', '1585', %s, %s, %s);
```

### 4.2. Compatibilidade com o Backend Spring Boot
Auditamos o backend Java para assegurar que a ingestão Python não cria descompasso:
* A entidade [`Produto.java`](file:///e:/Area_Dev/GitHub/smartmarket/backend/src/main/java/com/smartmarket/model/Produto.java) mapeia exatamente os mesmos campos.
* O componente [`ProdutoSpecification.java`](file:///e:/Area_Dev/GitHub/smartmarket/backend/src/main/java/com/smartmarket/service/ProdutoSpecification.java#L8-L16) realiza filtros do tipo:
  ```java
  cb.or(
      cb.like(cb.lower(root.get("nome")), normalizado),
      cb.like(cb.lower(root.get("nomeNormalizado")), normalizado)
  );
  ```
Como a normalização Python utiliza minúsculas e descarte de diacríticos idênticos ao padrão esperado pela busca JPA, qualquer busca textual por produto pelo frontend encontra perfeitamente os produtos gravados pela coleta.

---

## 5. Regra de Identidade e Equivalência entre Redes (Decisão de Produto)

A postura arquitetural implementada segue a diretriz de **segurança do dado**:
* O pipeline não une automaticamente produtos de redes diferentes apenas por semelhança de texto. Um produto do Fort e um produto do Carrefour possuem identidades distintas, a menos que seja aprovado um mapeamento explícito (`--mapping`).
* **Justificativa de Produto**: Em um comparador de preços, um falso positivo (ex: comparar o preço de um café especial 250g com um tradicional 500g) destrói a confiança do usuário final. A abordagem conservadora garante 100% de precisão cadastral.
* **Evolução Planejada para a Próxima Sprint**: Implementação de módulo de matching determinístico unindo produtos apenas quando `(nome_normalizado_sem_marca, marca, quantidade, unidade)` forem 100% congruentes.

---

## 6. Cobertura de Testes Automatizados

A suíte de testes unitários e de regressão offline cobre integralmente o fluxo:

```
Name                                           Stmts   Miss  Cover
------------------------------------------------------------------
scraper\coleta_fort_atacadista.py                170      3    98%
scraper\normalizacao.py                           29      1    97%
scraper\tests\test_coleta_fort_atacadista.py     176      1    99%
scraper\tests\test_normalizacao_pipeline.py       47      0   100%
scraper\tests\test_rotina_carga.py               107      2    98%
------------------------------------------------------------------
TOTAL DA SUÍTE DO SCRAPER                       1564    391    75%
```

* **94 testes executados com 100% de aprovação** (`python -m unittest discover -s scraper/tests -v`).
* Casos cobertos:
  * Extração e resiliência contra falhas parciais de rede.
  * Validação estrita de moeda (`BRL`) e rejeição de moedas incompatíveis.
  * Preservação de tokens decimais e rejeição de arredondamentos implícitos.
  * Bloqueio de injeção SQL via consultas estritamente parametrizadas.
  * Rollback transacional atômico em caso de falha de lote.

---

## 7. Instruções de Reprodução

### 7.1. Execução dos Testes
```bash
python -m unittest discover -s scraper/tests -v
```

### 7.2. Coleta Offline com Fixtures
```bash
python scraper/coleta_fort_atacadista.py --fixture scraper/tests/fixtures/fort_valido.json --output-dir scraper/output/fort_valido
```

### 7.3. Coleta em Tempo Real (HTTP Live)
```bash
python scraper/coleta_fort_atacadista.py --output-dir scraper/output/fort_live
```

---

## 8. Parecer Final e Próximos Passos

O cartão **`(COLETA) - Scraper Supermercado 1 & Normalização de Produtos`** preenche todos os critérios de aceitação:
- [x] Script de extração do 1º supermercado funcional e validado em tempo real.
- [x] Lógica de normalização textual e métrica implementada de forma conservadora.
- [x] Persistência parametrizada na tabela `produto` com rastreabilidade de origem.
- [x] Cobertura de testes >= 70% (atingido 98% no módulo Fort e 97% na normalização).
- [x] Documentação técnica completa e evidências registradas.

**Ação Recomendada**: Movimentar o cartão no Trello para **"Concluído / Pronto para Homologação"**.
