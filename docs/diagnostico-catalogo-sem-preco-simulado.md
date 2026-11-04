# Diagnóstico: catálogo estático sem preço simulado

Data: 03/11/2026. Base: `origin/main` (8304760). Nenhum código alterado neste item.

## 1. Preços no `frontend/src/data.js` atual

O arquivo foi gerado em 30/10/2026 (commit 652e5f5), antes da remoção dos fatores de preço (6dc390d).

| | Quantidade |
|---|---|
| Produtos | 9.406 (ids `p1`…, todos únicos) |
| Com preço em cada uma das 8 redes | 9.406 em cada (asun, zaffari, rissul, stok, atacadao, master, fort, carrefour) |
| Com preço em 2 ou mais redes | 9.406 (todos têm as 8) |

Rede de origem (`supermercadoOrigem`, normalizada com a mesma regra do gerador):

| Rede | Produtos |
|---|---|
| Fort | 5.514 |
| Asun | 3.367 |
| Stok | 237 |
| Master | 120 |
| Rissul | 88 |
| Zaffari | 75 |
| Atacadão | 5 |
| Carrefour | 0 |

Como os 7 preços fora da origem foram produzidos:

- Seguem uma das duas tabelas de fatores removidas em 6dc390d: a do gerador (zaffari ×1,05, rissul ×1,02, asun ×0,99, stok ×0,94, atacadao ×0,95, master ×1,03, fort ×0,96, carrefour ×1,04) ou a do sincronizador (asun ×1,04 e carrefour ×1,02 quando a origem não é Asun).
- Em boa parte do catálogo, o preço da origem foi atualizado depois por `sincronizar_catalogo_completo.py`, e os 7 simulados ficaram calculados sobre o preço antigo.
- 113 preços fora da origem, em 111 produtos (fort 87, asun 17, zaffari 5, stok 4), não seguem nenhuma das duas tabelas. Provavelmente são preços coletados que o sincronizador gravou ao casar produtos por `idOrigem` ou por nome exato, sem EAN e sem olhar a rede. Como esse casamento não é confiável, eles também saem na regeneração (só fica a rede de origem). A comparação entre redes passa a depender dos vínculos por EAN (`vinculo_produto`).
- `clubPrices`: 65 produtos, todos na rede de origem.

## 2. O frontend trata preço ausente?

Depois da regeneração, cada produto tem preço em uma rede só.

### Trata

- `components/ui/ProductDetailModal.jsx`: separa redes com preço das sem cotação e mostra "Indisponível".
- `pages/CatalogPage.jsx`: o card filtra preços válidos e mostra "Preço sob consulta" quando não há nenhum; o filtro por rede descarta quem não tem preço nela.
- `components/ui/SearchSuggest.jsx`, `utils/relatedProducts.js`, `pages/AdminPage.jsx`: usam só preços válidos.

### Não trata (supõe preço em várias redes)

1. **`pages/ShoppingListPage.jsx`, `compareMarkets`** (grave): ordena as redes só pelo total. Com preço em uma rede só, a rede com menos itens da lista soma menos e aparece como a mais barata. "Você economiza até R$ X" compara totais de cestas diferentes. O backend (`ComparadorService`) já põe as redes completas primeiro.
2. **`pages/Home.jsx`**: "Comparado em {n} mercados" vira "Comparado em 1 mercados", e o rótulo "Melhor Preço" aparece sem haver comparação.
3. **`pages/FavoritesPage.jsx`**: mesmo "Comparado em {n} mercados", e o seletor de alerta "Somente no {rede}" não avisa quando a rede não tem preço.
4. **`pages/Home.jsx`, contador "Produtos com preço: 9406"** e o texto "Quer comparar todos os 9406 produtos nas 8 redes do RS?": supõem comparação nas 8 redes (item 4).
