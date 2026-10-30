import api from "./api"

export const favoritoService = {
  /**
   * Lista os mercados favoritados pelo usuário
   */
  async listarMercados() {
    let localFavs = []
    try {
      localFavs = JSON.parse(localStorage.getItem("sm_fav_markets") || "[]")
      if (!Array.isArray(localFavs)) localFavs = []
    } catch {
      localFavs = []
    }

    try {
      const response = await api.get("/favoritos")
      if (Array.isArray(response.data) && response.data.length > 0) {
        const apiIds = response.data.map((m) => String(m.mercadoId || m.id || m))
        const merged = Array.from(new Set([...localFavs.map(String), ...apiIds]))
        localStorage.setItem("sm_fav_markets", JSON.stringify(merged))
        return merged
      }
    } catch {
      // Usa persistência local
    }
    return localFavs
  },

  /**
   * Favorita um mercado
   */
  async favoritarMercado(mercadoId) {
    const idStr = String(mercadoId)
    try {
      const favs = JSON.parse(localStorage.getItem("sm_fav_markets") || "[]")
      const lista = Array.isArray(favs) ? favs.map(String) : []
      if (!lista.includes(idStr)) {
        lista.push(idStr)
        localStorage.setItem("sm_fav_markets", JSON.stringify(lista))
      }
    } catch {
      localStorage.setItem("sm_fav_markets", JSON.stringify([idStr]))
    }

    try {
      const response = await api.post("/favoritos", { mercadoId: idStr })
      return response.data
    } catch {
      return { mercadoId: idStr }
    }
  },

  /**
   * Desfavorita um mercado
   */
  async desfavoritarMercado(mercadoId) {
    const idStr = String(mercadoId)
    try {
      const favs = JSON.parse(localStorage.getItem("sm_fav_markets") || "[]")
      const lista = (Array.isArray(favs) ? favs : []).map(String).filter((id) => id !== idStr)
      localStorage.setItem("sm_fav_markets", JSON.stringify(lista))
    } catch {
      // fallback
    }

    try {
      await api.delete(`/favoritos/mercados/${idStr}`)
    } catch {
      // fallback
    }
  },

  /**
   * Lista os produtos favoritados pelo usuário (sempre sincronizado com sm_fav_products)
   */
  async listarProdutos() {
    let localFavs = []
    try {
      localFavs = JSON.parse(localStorage.getItem("sm_fav_products") || "[]")
      if (!Array.isArray(localFavs)) localFavs = []
    } catch {
      localFavs = []
    }

    try {
      const response = await api.get("/favoritos/produtos")
      if (Array.isArray(response.data) && response.data.length > 0) {
        const apiIds = response.data.map((f) => String(f.produtoId || f.id || f))
        const merged = Array.from(new Set([...localFavs.map(String), ...apiIds]))
        localStorage.setItem("sm_fav_products", JSON.stringify(merged))
        return merged
      }
    } catch {
      // Usa persistência local de produtos favoritos
    }
    return localFavs
  },

  /**
   * Favorita um produto (persiste sempre localmente para garantir funcionamento imediato)
   */
  async favoritarProduto(produtoId) {
    const idStr = String(produtoId)
    try {
      const favs = JSON.parse(localStorage.getItem("sm_fav_products") || "[]")
      const lista = Array.isArray(favs) ? favs.map(String) : []
      if (!lista.includes(idStr)) {
        lista.push(idStr)
        localStorage.setItem("sm_fav_products", JSON.stringify(lista))
      }
    } catch {
      localStorage.setItem("sm_fav_products", JSON.stringify([idStr]))
    }

    try {
      await api.post(`/favoritos/produtos/${idStr}`)
    } catch {
      // Ignora erro 404/403 caso backend não possua rota de produto favorito
    }
  },

  /**
   * Desfavorita um produto (remove sempre da persistência local)
   */
  async desfavoritarProduto(produtoId) {
    const idStr = String(produtoId)
    try {
      const favs = JSON.parse(localStorage.getItem("sm_fav_products") || "[]")
      const lista = (Array.isArray(favs) ? favs : []).map(String).filter((id) => id !== idStr)
      localStorage.setItem("sm_fav_products", JSON.stringify(lista))
    } catch {
      // fallback
    }

    try {
      await api.delete(`/favoritos/produtos/${idStr}`)
    } catch {
      // Ignora erro 404/403 caso backend não possua rota de produto favorito
    }
  },
}

export default favoritoService
