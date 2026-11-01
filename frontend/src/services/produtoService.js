import api from "./api"
import { PRODUCTS } from "../data"

export const produtoService = {
  /**
   * Busca catálogo enriquecido com preços de todos os mercados.
   * Fallback gracioso para dados locais se a API estiver offline.
   */
  async buscarCatalogoComPrecos() {
    try {
      const response = await api.get("/precos/catalogo")
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data.map((p) => ({
          id: p.id,
          name: p.nome,
          brand: p.marca || "",
          category: p.categoria || "todos",
          unit: `${p.quantidade || ""} ${p.unidade || ""}`.trim(),
          image: p.imagemUrl || "🏪",
          prices: p.precos || {},
          menorPreco: p.menorPreco,
          mercadoMenorPreco: p.mercadoMenorPreco,
          promo: Boolean(p.promo ?? p.emPromocao ?? false),
          valorOriginal: p.valorOriginal ?? null,
          unitStandard: p.unidadePadrao || "",
          qtyStandard: p.quantidadePadrao || null,
          pricesPerUnit: p.precosPorUnidadePadrao || {},
        }))
      }
      return PRODUCTS
    } catch {
      return PRODUCTS
    }
  },

  /**
   * Lista produtos paginados com filtros opcionais
   */
  async listar({ nome = "", categoria = "", page = 0, size = 50, sort = "nome,asc" } = {}) {
    try {
      const params = { page, size, sort }
      if (nome) params.nome = nome
      if (categoria && categoria !== "todos") params.categoria = categoria

      const response = await api.get("/produtos", { params })
      return response.data
    } catch (error) {
      if (!error.response) {
        // Fallback local
        let filtrados = [...PRODUCTS]
        if (nome) {
          filtrados = filtrados.filter((p) =>
            p.name.toLowerCase().includes(nome.toLowerCase())
          )
        }
        if (categoria && categoria !== "todos") {
          filtrados = filtrados.filter((p) => p.category === categoria)
        }
        return {
          content: filtrados,
          totalElements: filtrados.length,
          totalPages: 1,
        }
      }
      throw error
    }
  },

  /**
   * Cria um novo produto (apenas ADMIN)
   */
  async criar(produtoData) {
    const response = await api.post("/produtos", produtoData)
    return response.data
  },

  /**
   * Atualiza um produto existente (apenas ADMIN)
   */
  async atualizar(id, produtoData) {
    const response = await api.put(`/produtos/${id}`, produtoData)
    return response.data
  },

  /**
   * Remove um produto (apenas ADMIN)
   */
  async remover(id) {
    await api.delete(`/produtos/${id}`)
  },
}

export default produtoService
