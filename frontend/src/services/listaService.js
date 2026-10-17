import api from "./api"

export const listaService = {
  /**
   * Lista as listas de compras do usuário logado
   */
  async listarMinhas() {
    try {
      const response = await api.get("/listas")
      return response.data
    } catch (error) {
      if (!error.response) {
        // Fallback para sessionStorage
        try {
          const localList = JSON.parse(sessionStorage.getItem("sm_list") || "{}")
          return [
            {
              id: "local_temp",
              nome: "Minha Lista Padrão",
              itens: Object.entries(localList).map(([pid, qty]) => ({
                produtoId: pid,
                quantidade: qty,
              })),
            },
          ]
        } catch {
          return []
        }
      }
      throw error
    }
  },

  /**
   * Busca uma lista de compras pelo ID
   */
  async buscarPorId(id) {
    const response = await api.get(`/listas/${id}`)
    return response.data
  },

  /**
   * Cria uma nova lista de compras
   */
  async criar(nome, itens = []) {
    const response = await api.post("/listas", { nome, itens })
    return response.data
  },

  /**
   * Adiciona ou atualiza um item na lista de compras
   */
  async adicionarItem(listaId, produtoId, quantidade) {
    const response = await api.post(`/listas/${listaId}/itens`, {
      produtoId,
      quantidade,
    })
    return response.data
  },

  /**
   * Remove um item da lista
   */
  async removerItem(listaId, produtoId) {
    const response = await api.delete(`/listas/${listaId}/itens/${produtoId}`)
    return response.data
  },

  /**
   * Remove uma lista de compras
   */
  async removerLista(listaId) {
    await api.delete(`/listas/${listaId}`)
  },

  /**
   * Executa a comparação de cestas entre os mercados no servidor
   */
  async compararCesta(listaId) {
    const response = await api.get(`/listas/${listaId}/comparar`)
    return response.data
  },
}

export default listaService
