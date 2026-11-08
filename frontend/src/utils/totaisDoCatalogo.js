import { GRUPOS_EQUIVALENTES, contarGruposConfirmados } from "./equivalentes"

/**
 * Números do catálogo sem inflar. Cada item tem preço de uma rede só, então o que o resumo conta é
 * "anúncio" (rede + id de origem), não "produto". Produto em 2+ redes é o que tem preço em duas redes
 * ou foi ligado a outras redes por um grupo de equivalentes confirmado.
 *
 * O resumo (catalogoResumo.TOTAIS) está trocando `produtosDistintos` por `anuncios`; este leitor aceita os dois.
 */
export function totaisHonestos(totais, grupos = GRUPOS_EQUIVALENTES) {
  const t = totais || {}
  return {
    anuncios: Number(t.anuncios ?? t.produtosDistintos ?? 0),
    anunciosComPreco: Number(t.anunciosComPreco ?? t.produtosComPreco ?? 0),
    produtosEm2Redes: Number(t.produtosEm2Redes ?? 0) + contarGruposConfirmados(grupos),
  }
}
