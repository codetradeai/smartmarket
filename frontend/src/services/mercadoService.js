import api from "./api"
import { MARKETS } from "../data"

export const mercadoService = {
  /**
   * Retorna os mercados ativos disponíveis na plataforma
   */
  async listar() {
    try {
      const response = await api.get("/mercados")
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data.map((m) => ({
          id: m.id,
          name: m.nome,
          address: m.endereco || "",
          logoUrl: m.logoUrl || "",
          color: m.nome.toLowerCase().includes("fort")
            ? "#E63312"
            : m.nome.toLowerCase().includes("carrefour")
            ? "#1A63B9"
            : "#F5A623",
          active: m.ativo,
        }))
      }
      return MARKETS
    } catch {
      return MARKETS
    }
  },

  /**
   * Cria um novo mercado (apenas ADMIN)
   */
  async criar(mercadoData) {
    const response = await api.post("/mercados", mercadoData)
    return response.data
  },

  /**
   * Atualiza um mercado (apenas ADMIN)
   */
  async atualizar(id, mercadoData) {
    const response = await api.put(`/mercados/${id}`, mercadoData)
    return response.data
  },

  /**
   * Remove um mercado (apenas ADMIN)
   */
  async remover(id) {
    await api.delete(`/mercados/${id}`)
  },
}

export default mercadoService
