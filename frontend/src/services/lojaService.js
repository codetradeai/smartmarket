import api from "./api"

// Teto da lista pública de filiais: bem menor que o do restante da API (que cobre o cold start do Render).
const TEMPO_LIMITE_FILIAIS_MS = 15000

export const lojaService = {
  /**
   * Lojas que atendem o usuário a partir do CEP cadastrado: vem uma loja por rede
   * (a preferida, a filial mais próxima ou a loja padrão), da mais perto à mais longe
   */
  async lojasProximas() {
    const response = await api.get("/lojas/proximas")
    return Array.isArray(response.data) ? response.data : []
  },

  /**
   * Filiais por rede com coordenadas (público, sem login), para calcular a distância no navegador a partir
   * da posição do usuário sem enviá-la a lugar nenhum. A chamada não leva parâmetro nem corpo, tem teto
   * próprio de 15 s e não tenta de novo: quem chama decide o que fazer com a falha (429, 5xx, rede, tempo).
   * Itens sem rede ou sem as duas coordenadas numéricas são descartados.
   */
  async filiaisPublicas() {
    const response = await api.get("/lojas/filiais", { timeout: TEMPO_LIMITE_FILIAIS_MS })
    if (!Array.isArray(response.data)) return []
    return response.data.filter(
      (filial) =>
        filial != null &&
        filial.mercadoId != null &&
        typeof filial.latitude === "number" &&
        Number.isFinite(filial.latitude) &&
        typeof filial.longitude === "number" &&
        Number.isFinite(filial.longitude),
    )
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
   * Define a loja preferida do usuário; lojaId null remove a preferência.
   * Devolve a localização atualizada (LocalizacaoResponse)
   */
  async definirLojaPreferida(lojaId) {
    const response = await api.put("/usuarios/me/loja-preferida", { lojaId })
    return response.data
  },
}

export default lojaService
