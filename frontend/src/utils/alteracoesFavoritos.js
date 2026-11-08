/**
 * Favoritos carregados do servidor chegam depois de uma requisição que pode demorar (a API do
 * Render dorme). Se o usuário favoritar ou desfavoritar algo nesse intervalo, a resposta traz a
 * foto antiga e, aplicada às cegas, desfaz a ação. Este módulo registra o que o usuário fez
 * enquanto esperava e reaplica por cima da resposta.
 */

/** Registro de alterações: id (texto) -> true (favoritou) | false (desfavoritou). */
export function criarRegistroDeAlteracoes() {
  return new Map()
}

/** Anota a última ação do usuário sobre um id. */
export function registrarAlteracao(registro, id, favoritado) {
  registro.set(String(id), Boolean(favoritado))
}

/**
 * Aplica as alterações do usuário sobre a lista de ids devolvida pelo servidor.
 * Sem duplicatas; a ordem do servidor é mantida e os ids favoritados no intervalo vão ao final.
 */
export function aplicarAlteracoes(idsDoServidor, registro) {
  const resultado = Array.from(new Set(idsDoServidor.map(String)))
  registro.forEach((favoritado, id) => {
    const indice = resultado.indexOf(id)
    if (favoritado && indice === -1) resultado.push(id)
    if (!favoritado && indice !== -1) resultado.splice(indice, 1)
  })
  return resultado
}
