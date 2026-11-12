import api from "./api"

export const lojaService = {
  /**
   * Lojas próximas do CEP cadastrado pelo usuário
   */
  async lojasProximas() {
    const response = await api.get("/lojas/proximas")
    return Array.isArray(response.data) ? response.data : []
  },

  /**
   * Localização (CEP) guardada na conta do usuário
   */
  async obterLocalizacao() {
    const response = await api.get("/usuarios/me/localizacao")
    return response.data
  },

  /**
   * Troca o CEP da conta. O backend resolve cidade/UF e devolve a nova localização
   */
  async trocarCep(cep) {
    try {
      const response = await api.put("/usuarios/me/localizacao", { cep })
      return response.data
    } catch (erro) {
      // 400 de validação: o backend diz o que há de errado com o CEP; mensagemDeErro prioriza userMessage
      const mensagemDoCep = erro?.response?.data?.campos?.cep
      if (erro?.response?.status === 400 && typeof mensagemDoCep === "string") {
        erro.userMessage = mensagemDoCep
      }
      throw erro
    }
  },

  /**
   * Apaga a localização (CEP) guardada na conta (LGPD)
   */
  async excluirLocalizacao() {
    await api.delete("/usuarios/me/localizacao")
  },

  /**
   * Define a loja preferida do usuário; lojaId null remove a preferência
   */
  async definirLojaPreferida(lojaId) {
    await api.put("/usuarios/me/loja-preferida", { lojaId })
  },
}

export default lojaService
