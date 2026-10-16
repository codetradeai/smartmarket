# Entrega da Segunda Rede (Carrefour Mercado) — SmartMarket

**Data de Conclusão**: 14/10/2026  
**Branch**: `feature/scraper-duas-redes`  
**Referência Trello**: `Analisar estrutura HTML e rede de 2 redes` / `[Segunda rede / pipeline 19/10]`

---

## 1. Contexto e Resolução do Bloqueio

Na entrega anterior (`scraper/ENTREGA-JOAO.md`), o projeto possuía apenas o coletor piloto do Fort Atacadista, constando a seguinte pendência crítica impeditiva:

> *"Segundo scraper real bloqueado: falta nome da rede e loja/cidade/URL. Nenhum adaptador fictício é apresentado como real."*

Esta entrega resolve definitivamente esse bloqueio com a validação técnica, implementação e testes do coletor oficial da segunda rede: **Carrefour Mercado** (`https://mercado.carrefour.com.br/`).

---

## 2. Análise Técnica e Engenharia Reversa da Segunda Rede

### 2.1 Plataforma e Arquitetura
* **Rede**: Carrefour Mercado Brasil.
* **URL Base**: `https://mercado.carrefour.com.br/`
* **Arquitetura Web**: Headless Storefront moderna (`navigation-headless-food`) desenvolvida em **React Router / Remix** sobre infraestrutura VTEX (conta `carrefourbrfood`).
* **Proteções de Rede**: Borda com Cloudflare. As APIs VTEX legadas (`/api/catalog_system/pub/...` e `/_v/segment/graphql/v1`) retornam `503 Service Unavailable` para acesso direto. As páginas públicas de catálogo e categoria respondem normalmente com `200 OK`.

### 2.2 Localização dos Dados no DOM / Stream
Ao invés de parsing frágil de HTML com seletores CSS suscetíveis a mudanças de layout, o coletor extrai o estado desidratado embutido no HTML pelo SSR do React Router:
* **Script Alvo**: `window.__reactRouterContext.streamController.enqueue("[...]")`
* **Formato**: Grafo serializado e deduplicado por índices (Seroval / React Router Stream).
* **Mapeamento de Campos**:
  * **Nome do Produto**: Chave `productName`
  * **Marca**: Chave `brand`
  * **ID Origem**: Chave `productId`
  * **Link/Slug**: Chave `link`
  * **Preço Praticado**: `commertialOffer.Price` ou `commertialOffer.spotPrice`
  * **Preço Normal (De/Por)**: `commertialOffer.ListPrice`
  * **Disponibilidade**: `commertialOffer.AvailableQuantity > 0`
  * **Promoção**: `ListPrice > Price`

---

## 3. Conformidade com o Contrato v1

Ambos os coletores (`coleta_fort_atacadista.py` e `coleta_carrefour.py`) geram dados idênticos estruturalmente:

| Campo | Tipo / Regra | Exemplo Carrefour |
|---|---|---|
| `nome_bruto` | String não vazia | `"Arroz Branco Longo-fino Tipo 1 Namorado 5Kg"` |
| `preco` | Float compatível com `Decimal` (> 0) | `20.19` |
| `preco_normal` | Float ou `null` se ausente | `25.19` |
| `em_promocao` | Booleano (`preco_normal > preco`) | `true` |
| `marca` | String ou `null` | `"Namorado"` |
| `categoria` | Chave da configuração | `"Graos_Arrozes_Feijoes"` |
| `slug` | Caminho relativo | `"/arroz-branco-longo-fino-tipo-1-namorado-5kg-443298/p"` |
| `id_produto_origem`| String do identificador externo | `"5852"` |
| `supermercado` | `"Fort Atacadista"` ou `"Carrefour"` | `"Carrefour"` |
| `data_coleta` | ISO 8601 UTC com `+00:00` | `"2026-10-14T19:35:27+00:00"` |

---

## 4. Evidências de Execução e Coleta Real (HTTP Live)

### 4.1 Comandos de Execução
```bash
# Coleta 1: Fort Atacadista
python scraper/coleta_fort_atacadista.py --output-dir scraper/output/fort

# Coleta 2: Carrefour Mercado
python scraper/coleta_carrefour.py --output-dir scraper/output/carrefour
```

### 4.2 Resultados Obtidos
* **Fort Atacadista**:
  * Status: `concluido`
  * Itens aceitos: **40** (20 de Grãos/Arrozes/Feijões + 20 de Leites)
  * Falhas: **0**
* **Carrefour Mercado**:
  * Status: `concluido`
  * Itens aceitos: **40** (20 de Grãos/Arrozes/Feijões + 20 de Leites)
  * Falhas: **0**

---

## 5. Testes Unitários e Qualidade

Foram desenvolvidos testes offline sem dependência de rede:
* Fixtures em `scraper/tests/fixtures/`:
  * `carrefour_valido.json`: Cenário completo com 2 categorias.
  * `carrefour_parcial.json`: Cenário com falha pontual de item e ausência de stream para validar resiliência e geração de `status: "parcial"`.
* Arquivo de teste: `scraper/tests/test_coleta_carrefour.py`
  * Validações de tipos, precisão decimal, moedas estrangeiras rejeitadas, UTC timestamps e escrita atômica.
* **Cobertura da Suite**: **86 testes passando com sucesso** (59 testes de unidade + 27 testes de integração PostgreSQL ignorados sem banco ativo).
