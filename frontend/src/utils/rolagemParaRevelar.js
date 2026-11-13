/**
 * Quanto rolar uma faixa horizontal, em px (positivo = para a direita), para o item ficar inteiro à
 * vista. 0 se ele já está visível. Recebe os retângulos (getBoundingClientRect) da faixa e do item;
 * `folga` é a margem que sobra do lado revelado. Sem retângulo (ou sem layout), não rola.
 */
export function deslocamentoParaRevelar(faixa, item, folga = 8) {
  if (!faixa || !item) return 0
  if (item.right > faixa.right) return item.right - faixa.right + folga
  if (item.left < faixa.left) return item.left - faixa.left - folga
  return 0
}
