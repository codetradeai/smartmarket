import api from "./api"

export const favoritoService = {
  /**
   * Lista os mercados favoritados pelo usuário
   */
  async listarMercados() {
    try {
      const response = await api.get("/favoritos")
      return response.data
    } catch {
      try {
        return JSON.parse(localStorage.getItem("sm_fav_markets") || "[]")
      } catch {
        return []
      }
    }
  },

  /**
   * Favorita um mercado
   */
  async favoritarMercado(mercadoId) {
    try {
      const response = await api.post("/favoritos", { mercadoId })
      return response.data
    } catch (error) {
      if (!error.response) {
        // Fallback local
        const favs = JSON.parse(localStorage.getItem("sm_fav_markets") || "[]")
        if (!favs.includes(mercadoId)) favs.push(mercadoId)
        localStorage.setItem("sm_fav_markets", JSON.stringify(favs))
        return { mercadoId }
      }
      throw error
    }
  },

  /**
   * Desfavorita um mercado
   */
  async desfavoritarMercado(mercadoId) {
    try {
      await api.delete(`/favoritos/mercados/${mercadoId}`)
    } catch (error) {
      if (!error.response) {
        let favs = JSON.parse(localStorage.getItem("sm_fav_markets") || "[]")
        favs = favs.filter((id) => id !== mercadoId)
        localStorage.setItem("sm_fav_markets", JSON.stringify(favs))
        return
      }
      throw error
    }
  },

  /**
   * Lista os produtos favoritados pelo usuário
   */
  async listarProdutos() {
    try {
      const response = await api.get("/favoritos/produtos")
      return response.data
    } catch {
      try {
        return JSON.parse(localStorage.getItem("sm_fav_products") || "[]")
      } catch {
        return []
      }
    }
  },

  /**
   * Favorita um produto
   */
  async favoritarProduto(produtoId) {
    try {
      await api.post(`/favoritos/produtos/${produtoId}`)
    } catch (error) {
      if (!error.response) {
        const favs = JSON.parse(localStorage.getItem("sm_fav_products") || "[]")
        if (!favs.includes(produtoId)) favs.push(produtoId)
        localStorage.setItem("sm_fav_products", JSON.stringify(favs))
        return
      }
      throw error
    }
  },

  /**
   * Desfavorita um produto
   */
  async desfavoritarProduto(produtoId) {
    try {
      await api.delete(`/favoritos/produtos/${produtoId}`)
    } catch (error) {
      if (!error.response) {
        let favs = JSON.parse(localStorage.getItem("sm_fav_products") || "[]")
        favs = favs.filter((id) => id !== produtoId)
        localStorage.setItem("sm_fav_products", JSON.stringify(favs))
        return
      }
      throw error
    }
  },
}

export default favoritoService
