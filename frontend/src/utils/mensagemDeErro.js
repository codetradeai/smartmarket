/**
 * Texto de erro para mostrar ao usuário a partir de um erro do axios.
 * Ordem: userMessage (definida pelo interceptor, ex.: 403) > corpo da resposta do backend
 * ({ erro, campos } do GlobalExceptionHandler, ou texto puro) > status HTTP > falta de resposta.
 */
export function mensagemDeErro(err, padrao = "Erro inesperado.") {
  if (!err) return padrao
  if (err.userMessage) return err.userMessage

  const dados = err.response?.data
  if (typeof dados === "string" && dados.trim()) return dados.trim()
  if (dados && typeof dados === "object") {
    const erro = typeof dados.erro === "string" ? dados.erro : ""
    if (dados.campos && typeof dados.campos === "object") {
      const detalhes = Object.values(dados.campos).join(". ")
      if (detalhes) return erro ? `${erro}: ${detalhes}` : detalhes
    }
    if (erro) return erro
    const outra = dados.mensagem || dados.message
    if (typeof outra === "string" && outra) return outra
  }

  if (err.response?.status) return `Erro ${err.response.status} do servidor.`
  return "Sem resposta do servidor. Verifique sua conexão e tente novamente."
}
