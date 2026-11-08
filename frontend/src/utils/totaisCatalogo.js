// Totais do catálogo usados pela Home. Fonte única: o gerador (scripts/gerar-catalogo-resumo.mjs) e
// os testes (test/resumoDe.js) chamam estas funções, então o número exibido e o testado não divergem.
//
// Vocabulário (a auditoria do catálogo mostrou que misturar os três induz a erro):
//   - id de catálogo ("p123"): uma linha do data.js;
//   - anúncio: uma listagem de UMA rede, identificada por (rede, id de origem). É o que o catálogo mede;
//   - produto em 2+ redes: o MESMO produto vendido por redes diferentes. O data.js sozinho não diz isso
//     (cada anúncio tem preço de uma rede só); quem diz é src/data/equivalentes.json, e só os grupos
//     "confirmado" contam. Sem esse arquivo, o número é 0.

/** Chave de um anúncio: rede + id de origem; sem esses campos, o id do catálogo (nunca junta itens diferentes). */
export function chaveDeAnuncio(produto) {
  const { supermercadoOrigem: rede, idOrigem } = produto
  return rede && idOrigem != null && idOrigem !== '' ? `${rede}|${idOrigem}` : `catalogo|${produto.id}`
}

const redesComPreco = (produto) =>
  Object.values(produto.prices || {}).filter((valor) => typeof valor === 'number' && valor > 0).length

/** Grupos "confirmado" (2+ itens) de um equivalentes.json; 0 se o arquivo não existe ou não tem o formato esperado. */
export function contarGruposConfirmados(equivalentes) {
  const grupos = equivalentes && Array.isArray(equivalentes.grupos) ? equivalentes.grupos : []
  return grupos.filter((g) => g && g.confianca === 'confirmado' && Array.isArray(g.itens) && g.itens.length >= 2).length
}

export function calcularTotais(produtos, equivalentes = null) {
  const anuncios = (filtro = () => true) => new Set(produtos.filter(filtro).map(chaveDeAnuncio)).size
  return {
    idsDeCatalogo: produtos.length,
    anuncios: anuncios(),
    anunciosComPreco: anuncios((p) => redesComPreco(p) > 0),
    produtosEm2Redes: contarGruposConfirmados(equivalentes),
  }
}

/** Anúncios com preço, por rede: [{ id, anuncios }]. Quem tem 0 não pode aparecer em textos como "compare em ...". */
export function anunciosPorRede(produtos, redes) {
  return redes.map((rede) => ({
    id: rede.id,
    anuncios: new Set(
      produtos.filter((p) => typeof p.prices?.[rede.id] === 'number' && p.prices[rede.id] > 0).map(chaveDeAnuncio),
    ).size,
  }))
}
