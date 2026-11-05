import api from "./api"

// O servidor respondeu com erro (4xx/5xx): quem chamou precisa saber. Só a falta de resposta
// (rede fora do ar) cai no fallback local.
const erroDoServidor = (erro) => Boolean(erro?.response)

// O backend declara mercadoId como Long: ids numéricos vão como número; ids locais
// (ex.: "fort") seguem como texto e o backend os rejeita com 400.
const idParaApi = (id) => (/^\d+$/.test(String(id)) ? Number(id) : String(id))

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
        // GET /favoritos devolve FavoritoResponse { id, mercado: { id, ... }, createdAt }:
        // o id do favorito NÃO é o id do mercado.
        const apiIds = response.data.map((m) => String(m?.mercado?.id ?? m?.mercadoId ?? m?.id ?? m))
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
      const response = await api.post("/favoritos", { mercadoId: idParaApi(idStr) })
      return response.data
    } catch (erro) {
      if (erroDoServidor(erro)) throw erro
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
    } catch (erro) {
      if (erroDoServidor(erro)) throw erro
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

    // IDs do catalogo estatico ("p123") nao sao aceitos pelo backend (Long)
    if (/^\d+$/.test(idStr)) {
      try {
        await api.post(`/favoritos/produtos/${idStr}`)
      } catch (erro) {
        if (erroDoServidor(erro)) throw erro
      }
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

    // IDs do catalogo estatico ("p123") nao sao aceitos pelo backend (Long)
    if (/^\d+$/.test(idStr)) {
      try {
        await api.delete(`/favoritos/produtos/${idStr}`)
      } catch (erro) {
        if (erroDoServidor(erro)) throw erro
      }
    }
  },
}

export default favoritoService
