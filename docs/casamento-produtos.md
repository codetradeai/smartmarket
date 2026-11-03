# Casamento de produtos entre redes

> Gerado por `scraper/relatorio_casamento.py` em 2026-11-03. Amostra de coletas reais com no máximo 20 produtos por rede, feitas com 2 s por host e User-Agent identificável. **Os números descrevem a amostra, não o catálogo inteiro.**

## 1. Produtos por rede e EAN válido

| Rede | Produtos | Com EAN válido | Taxa |
|---|---|---|---|
| Zaffari | 16 | 16 | 100% |
| Rissul | 16 | 12 | 75% |
| Asun | 20 | 0 | 0% |
| Stok | 12 | 12 | 100% |
| Atacadão | 15 | 10 | 67% |
| Master | 12 | 10 | 83% |
| Fort | 20 | 0 | 0% |
| Carrefour | 20 | 19 | 95% |
| **Total** | **131** | **79** | **60%** |

Asun e Fort não expõem EAN. Itens sem EAN válido incluem granel/pesáveis (códigos internos descartados).

## 2. EANs em 2 ou mais redes

- **Dentro dos dados coletados:** 4 EANs aparecem em 2 ou mais redes (de 75 EANs distintos).
- **Com consulta por EAN em Atacadão, Master e Stok:** 47 de 75 EANs aparecem em 2 ou mais redes (piso: Zaffari, Rissul e Carrefour não têm busca por EAN permitida).

## 3. Matriz de sobreposição (EANs em comum)

### 3.1 Só o que foi coletado

| | Zaffari | Rissul | Asun | Stok | Atacadão | Master | Fort | Carrefour |
|---|---|---|---|---|---|---|---|---|
| **Zaffari** | — | 2 | 0 | 1 | 0 | 0 | 0 | 0 |
| **Rissul** | 2 | — | 0 | 1 | 0 | 0 | 0 | 0 |
| **Asun** | 0 | 0 | — | 0 | 0 | 0 | 0 | 0 |
| **Stok** | 1 | 1 | 0 | — | 0 | 0 | 0 | 0 |
| **Atacadão** | 0 | 0 | 0 | 0 | — | 0 | 0 | 0 |
| **Master** | 0 | 0 | 0 | 0 | 0 | — | 0 | 0 |
| **Fort** | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 |
| **Carrefour** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |

### 3.2 Com consulta cruzada por EAN

Pares entre Zaffari, Rissul e Carrefour não são mensuráveis (sem busca por EAN); aparecem apenas se coletados diretamente.

| | Zaffari | Rissul | Asun | Stok | Atacadão | Master | Fort | Carrefour |
|---|---|---|---|---|---|---|---|---|
| **Zaffari** | — | 2 | 0 | 3 | 6 | 4 | 0 | 0 |
| **Rissul** | 2 | — | 0 | 6 | 8 | 5 | 0 | 0 |
| **Asun** | 0 | 0 | — | 0 | 0 | 0 | 0 | 0 |
| **Stok** | 3 | 6 | 0 | — | 24 | 23 | 0 | 7 |
| **Atacadão** | 6 | 8 | 0 | 24 | — | 27 | 0 | 13 |
| **Master** | 4 | 5 | 0 | 23 | 27 | — | 0 | 10 |
| **Fort** | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 |
| **Carrefour** | 0 | 0 | 0 | 7 | 13 | 10 | 0 | — |

## 4. Casamento

- Produtos canônicos com 2+ redes: **4** (de 75 agrupamentos).
- Vínculos por origem: **ean = 79**, **nome = 0** (chave idêntica marca+nome+unidade; sem chave tolerante).
- Ambíguos (chave igual para EANs diferentes, não vinculados): 0.
- Sem vínculo: 52.

## 5. Pares com o mesmo EAN e nomes muito diferentes (revisão humana)

Critério: mesmo EAN em redes diferentes e similaridade de palavras (Jaccard, sem medidas) < 0,5. Listados 20 (máx. 20). **Não verifiquei qual nome está certo.**

| # | EAN | Rede A — nome | Rede B — nome | Similaridade |
|---|---|---|---|---|
| 1 | 7891022868036 | Atacadão — Lã de Aço Bombril 45g | Master — Esponja Aço Bombril Eco Com 6 Unidade | 0.22 |
| 2 | 7891022868036 | Atacadão — Lã de Aço Bombril 45g | Stok — Esponja Bombril Aço Eco 45g Com 6 Unidades | 0.22 |
| 3 | 7898080640628 | Atacadão — Leite Longa Vida Italac Semidesnatado Com tampa 1L | Master — Leite Italac Semi Desnatado 1l | 0.22 |
| 4 | 7898080640628 | Carrefour — Leite Semidesnatado UHT Goiasminas Italac 1 Litro | Master — Leite Italac Semi Desnatado 1l | 0.22 |
| 5 | 7898215151760 | Atacadão — Leite Longa Vida Piracanjuba Com tampa Semidesnatado 1L | Master — Leite Piracanjuba Semi Desnatado 1l | 0.22 |
| 6 | 7898080640628 | Atacadão — Leite Longa Vida Italac Semidesnatado Com tampa 1L | Carrefour — Leite Semidesnatado UHT Goiasminas Italac 1 Litro | 0.27 |
| 7 | 7892840813444 | Atacadão — Refrigerante Pepsi Cola Zero 2L | Stok — Refrigerante Pepsi Black Sem Açúcar 2l | 0.29 |
| 8 | 7898215151760 | Carrefour — Leite Semidesnatado Piracanjuba 1 Litro | Master — Leite Piracanjuba Semi Desnatado 1l | 0.29 |
| 9 | 7892840813444 | Master — Refrigerante Pepsi Zero Black Pet 2 Litros | Stok — Refrigerante Pepsi Black Sem Açúcar 2l | 0.33 |
| 10 | 7897122601252 | Atacadão — Carne Curada Desfiada Vapza 400g | Master — Carne Seca Vapza Desfiado 400g | 0.33 |
| 11 | 7898080640628 | Master — Leite Italac Semi Desnatado 1l | Stok — Leite Italac Uht Semidesnatado 1l | 0.33 |
| 12 | 7898215151708 | Atacadão — Leite Longa Vida Piracanjuba Com tampa Integral 1L | Carrefour — Leite Integral Piracanjuba 1 Litro | 0.33 |
| 13 | 7898215151760 | Atacadão — Leite Longa Vida Piracanjuba Com tampa Semidesnatado 1L | Carrefour — Leite Semidesnatado Piracanjuba 1 Litro | 0.33 |
| 14 | 7898215157427 | Master — Leite Ninho Levinho Semi Desnatado 1l | Stok — Leite Nestlé Ninho Forti+ Uht Semidesnatado Levinho 1l | 0.33 |
| 15 | 7892840813444 | Atacadão — Refrigerante Pepsi Cola Zero 2L | Master — Refrigerante Pepsi Zero Black Pet 2 Litros | 0.38 |
| 16 | 7896011906874 | Atacadão — Arroz Blue Ville Agulhinha Tipo 1 5kg | Master — Arroz Bco Blue Ville Tp1 5kg | 0.38 |
| 17 | 7896011906874 | Master — Arroz Bco Blue Ville Tp1 5kg | Stok — Arroz Blue Ville Branco Tipo 1 5kg | 0.38 |
| 18 | 7896011906881 | Atacadão — Arroz Blue Ville Agulhinha Tipo 1 1kg | Master — Arroz Bco Blue Ville Tp1 1kg | 0.38 |
| 19 | 7896011906881 | Master — Arroz Bco Blue Ville Tp1 1kg | Stok — Arroz Blue Ville Branco Tipo 1 1kg | 0.38 |
| 20 | 7896283800801 | Atacadão — Leite Longa Vida Jussara Com tampa Integral 1L | Carrefour — Leite UHT Integral Jussara 1L | 0.38 |

