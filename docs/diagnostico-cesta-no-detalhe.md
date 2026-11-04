# Cesta de demonstração no detalhe do produto: diagnóstico e proposta

Data: 04/11/2026. Base: saída `scraper/saida/cesta_20261104T013717Z.json` (83 produtos com par `confirmado`). Nenhum código foi alterado e não houve coleta para este documento.

## 1. Os 83 produtos estão no banco?

**Banco de dev (`smartmarket-db`, porta 5436):** está sem schema; as tabelas `produto`, `mercado` e `vinculo_produto` não existem. Não há tabela `produto` populada para consultar.

A comparação usa o que seria carregado nela, a carga SQL `backend/database/carga_completa_530_produtos.sql`:

| Critério | Resultado |
|---|---|
| Por `codigo_barras` | **0**: a carga não grava essa coluna (o `INSERT` tem `id, nome, nome_normalizado, marca, quantidade, unidade, categoria, imagem_url, descricao`) |
| Produto de origem, por id e nome | **83 de 83**. Os ids batem: `pN` no `data.js` é o id `N` na carga (530 de 530 com o mesmo nome) |
| Produto parceiro (o mesmo EAN na outra rede), por nome exato | **12 de 83**. Os outros 71 não existem como produto |
| Seed `data.sql` | 1 `INSERT` de produto, sem EAN. Não ajuda |

## 2. O que falta para a cesta aparecer em `GET /api/precos/produto/{id}/vinculados`

O endpoint (`VinculoProdutoService.precosVinculados`) lê os vínculos `confirmado` do produto em `vinculo_produto`, os dois produtos ligados e os seus `preco` com `disponivel = true`. Para os 83 produtos, faltam:

1. **Banco com schema:** DDL e migrações (`migration_add_vinculo_produto.sql`, `migration_promocao_data_fim_opcional.sql`) aplicados, e a carga dos 530 produtos.
2. **Produtos parceiros:** cada vínculo liga duas linhas de `produto`. São 83 parceiros, 71 sem linha nenhuma. Mesmo os 12 que batem por nome deveriam entrar como produto próprio da rede, porque casar por nome não é confiável.
3. **Preços dos parceiros:** 83 linhas em `preco`, no mercado parceiro, com o `coletado_em` da coleta.
4. **`codigo_barras`** dos dois lados. O endpoint não exige, mas sem ele a origem do vínculo não pode ser auditada.
5. **Vínculos:** `vinculos.py` traduz `(rede, id externo)` em `produto_id` por `smartmarket_ingest.source_product`, que a carga SQL não preenche. Do jeito que está hoje, os 83 pares sairiam como "não resolvidos". É preciso carregar a cesta pelo pipeline, que preenche `source_product`, ou fazer um carregador próprio.
6. **Frontend:** não chama o endpoint (busca por `vinculad` em `frontend/src`: 0). O detalhe do produto usa o `data.js`, com ids `pN`; o endpoint usa ids numéricos. A conversão `pN → N` só vale para os ids até 530, e os produtos parceiros não estão no `data.js`.
7. **Backend no ar** na demonstração. O deploy que aparece no CI (Vercel) é só do frontend.

## 3. De qual região são os preços?

- **Atacadão:** a API usada (`/api/catalog_system/pub/products/search`) devolve o catálogo **nacional**, sem região, loja ou CEP. O coletor não define `sc`, `regionId` nem CEP. O preço do Atacadão varia por loja e CEP, então **não dá para afirmar que é preço do RS** (já registrado em `docs/diagnostico-scraper.md:84`).
- **Master** (org 193) e **Stok** (org 130): a API VipCommerce é consultada em `filial/1/centro_distribuicao/1`, a filial padrão de cada loja online. **Não verifiquei qual cidade é essa filial.** O Master atende Erechim e Porto Alegre e o Stok, Passo Fundo e atacarejos do RS, mas qual loja corresponde à filial 1 não foi conferido; isso exige uma consulta à API de filiais, que não fiz nesta rodada.
- Consequência: 77 dos 83 pares confirmados são Stok × Master, duas redes do RS, mas de filiais não verificadas. Nos 6 pares com o Atacadão, a comparação mistura um preço do RS com um preço de região indefinida.

## 4. Como mostrar a cesta no detalhe do produto (proposta, sem implementar)

### (a) Postgres + `vinculos.py` + endpoint

Carregar no banco os produtos e preços da cesta (origem e parceiros, com `codigo_barras` e `source_product`), gravar os vínculos com `vinculos.py` e fazer o detalhe do produto chamar `/vinculados`.

- **Esforço:** alto, cerca de 2 a 3 dias. Inclui aplicar o schema e as migrações no banco de dev, criar um carregador da cesta (ou adaptá-la ao Contrato v1 para passar pelo pipeline), rodar `vinculos.py`, mapear os ids `pN` para os ids do banco no frontend, chamar e testar o endpoint no `ProductDetailModal` e garantir o backend no ar na apresentação.
- **Riscos:**
  - muitas peças em sequência: schema, carga, ingestão, vínculos, API e frontend;
  - o banco de dev está vazio e as migrações não foram aplicadas;
  - `validar_dsn` aceita só banco local, o que impede (de propósito) carregar num banco remoto de demonstração;
  - a demonstração passa a depender do backend no ar;
  - os ids `pN` e os ids do banco são mapeados de forma frágil.
- **Ganho:** é a arquitetura certa. Guarda histórico, reaproveita o endpoint já testado, os vínculos `revisar` ficam de fora automaticamente e serve para as próximas coletas.

### (b) Arquivo estático gerado da saída bruta

Um script gera, por exemplo, `frontend/src/cesta.js` (ou um JSON em `public/`) com, para cada um dos 83 ids `pN`, os preços confirmados por rede: preço, nome na rede, EAN e `coletado_em`. O `ProductDetailModal` mostra essas redes quando o produto está na cesta. O `data.js` não é tocado.

- **Esforço:** baixo, cerca de meio dia a 1 dia: o script gerador, a leitura no modal, os testes de componente e um aviso de data e região na tela.
- **Riscos:**
  - é uma foto de 04/11/2026; precisa dizer na tela "coletado em 04/11/2026" para não parecer preço do dia;
  - cria uma segunda fonte de dados no frontend, fora do banco;
  - repete a regra confirmado/revisar fora do backend (o script precisa filtrar só `confirmado`);
  - os preços do Atacadão continuam sem região definida.
- **Ganho:** funciona no deploy estático (Vercel), sem backend nem banco, e é rápido e fácil de reverter.

### Recomendação

**(b) para a demonstração e (a) no roadmap.** A opção (b) mostra 83 produtos com preço real em 2+ redes sem depender do backend, desde que exiba a data da coleta e, nos pares com o Atacadão, a ressalva de região (ou deixe esses 6 pares de fora). A opção (a) deve vir depois, junto com a aplicação das migrações e o agendamento de `vinculos.py`.
