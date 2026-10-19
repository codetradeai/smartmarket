import api from "./api"

export const adminService = {
  /**
   * Obtém as métricas consolidadas do painel admin
   */
  async obterPainel() {
    const response = await api.get("/admin/painel")
    return response.data
  },

  /**
   * Lista usuários cadastrados com paginação
   */
  async listarUsuarios(page = 0, size = 20) {
    const response = await api.get("/admin/usuarios", {
      params: { page, size },
    })
    return response.data
  },

  /**
   * Altera o papel (permissão) de um usuário
   */
  async alterarPapel(usuarioId, papel) {
    const response = await api.patch(`/admin/usuarios/${usuarioId}/papel`, {
      papel,
    })
    return response.data
  },
}

export default adminService
