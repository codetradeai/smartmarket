# Produtos equivalentes entre redes

Cada anúncio do `frontend/src/data.js` tem preço de **uma rede só** (o Fort não devolve EAN e o Asun tampouco). Para comparar o mesmo produto em redes diferentes, o projeto liga anúncios equivalentes em `frontend/src/data/equivalentes.json`, gerado por `scraper/gerar_equivalentes.py`.

## Formato do arquivo

```json
{"versao": "bfb9449320af", "grupos": [
  {"id": "g3", "confianca": "confirmado", "camada": "T2", "itens": ["p12", "p3456"]}
]}
```

- `itens` são ids do catálogo (`p<N>`), de **redes diferentes** (no máximo uma linha por rede) e cada id está em um único grupo.
- `versao` é o início do sha256 dos grupos; o arquivo é determinístico (mesma entrada, mesmos bytes).

## Camadas e confiança

| Camada | Regra | Precisão medida | Confiança |
|---|---|---|---|
| T1 | chave idêntica do `casamento.py` (marca + nome sem medida + quantidade) e mesma embalagem | 100% (40 pares) | confirmado |
| T2 | marca, embalagem e todos os tokens de conteúdo, embalagem e tipo iguais, mesmo em outra ordem ("Iogurte Natural Nestlé Desnatado 160g" × "Iogurte Nestlé Natural Desnatado 160g") | 97,5% | confirmado |
| T3 | como T2, mas um lado omite palavra de embalagem ou tipo ("Creme de Leite 200g" × "… Tetra Pak 200g") | 82,5% | provável |
| T4 | como T2/T3, mas a marca de um lado foi recuperada do nome (campo vazio ou placeholder como "Geral") | 85% | provável |
| T0 | **mesma foto** (mesmo arquivo no CDN, ignorando assinatura e tamanho), com todas as guardas | 90% estrita, 1 "não" em 40 | provável |

Todas as camadas exigem redes diferentes, mesma marca canônica, mesma embalagem e mesmas variantes duras. T5 (diferença de uma palavra com evidência) foi medida em 77,5% de precisão e **não entra** no arquivo (a Coca-Cola "sem açúcar" × "zero açúcar" é rebaixada de T2 para T3 por precaução).

A política de uso vem da medição de precisão (amostras julgadas por dois avaliadores independentes):

- **confirmado** entra no ranking, no "Melhor Preço do RS" e na economia do modal;
- **provável** aparece à parte, com o selo "Provável mesmo produto", e **nunca** conta para o menor preço. A foto idêntica acertou 90%, mas com um "não" (sabonetes Lux de fragrâncias diferentes têm a mesma foto): a regra de confirmado exige 90% e nenhum erro, então T0 é só provável;
- em dúvida, não liga. Um grupo herda a confiança do elo mais fraco, e um item só entra num grupo se casar com **todos** os membros.

As guardas (167 dos 396 pares com a mesma foto foram barrados por elas) tiram pares que parecem iguais e não são: sabor, zero/diet/light, integral × desnatado, sem lactose, tipo (1 × 2), quantidade (350 ml × 2 l, 6×350 ml × 350 ml, leve 3 pague 2), lata × vidro, kit e categoria.

## Regenerar

O arquivo depende do `data.js`; quando o catálogo mudar, rode na ordem:

```bash
python scraper/limpar_catalogo.py            # só se o data.js veio de uma coleta nova (ver docs/LIMPEZA-DO-CATALOGO.md)
python scraper/gerar_equivalentes.py         # regrava frontend/src/data/equivalentes.json
cd frontend && node scripts/gerar-catalogo-resumo.mjs   # atualiza os totais da Home (produtos em 2+ redes)
```

`python scraper/gerar_equivalentes.py --verificar` sai com 1 se o arquivo versionado estiver desatualizado; os testes do scraper (`test_gerar_equivalentes.py`) e do front (`catalogoResumo.test.js`) falham pelo mesmo motivo, então o CI barra um `equivalentes.json` ou um resumo velho.

## Limites conhecidos

- Cobertura baixa de propósito: ~12% dos anúncios têm ao menos um equivalente. Pares descartados por conflito dentro do grupo ficam de fora.
- O cartão do catálogo e as telas Home/Favoritos continuam mostrando o melhor preço do **próprio** item; só o modal considera equivalentes confirmados. A lista de compras e o comparador ainda não usam os grupos.
- Ids removidos pela limpeza deixam buracos na numeração `p<N>`; favoritos antigos que apontem para eles deixam de achar o item.
