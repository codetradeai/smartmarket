import api from "./api"

// Usuários mock para fallback caso o backend Spring Boot esteja offline
const DEMO_USERS = [
  {
    id: 1,
    nome: "Davi Souza",
    email: "davi@smartmarket.com.br",
    papel: "ADMIN",
    senha: "admin",
  },
  {
    id: 2,
    nome: "Gilbert Lima",
    email: "gilbert@smartmarket.com.br",
    papel: "ADMIN",
    senha: "admin",
  },
  {
    id: 3,
    nome: "Rudinei Silva",
    email: "rudinei@smartmarket.com.br",
    papel: "ADMIN",
    senha: "admin",
  },
  {
    id: 4,
    nome: "Maria Santos",
    email: "maria@email.com",
    papel: "USER",
    senha: "user",
  },
]

// Gera um mock JWT payload para o fallback
function generateDemoToken(user) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = btoa(
    JSON.stringify({
      sub: user.email,
      id: user.id,
      nome: user.nome,
      papel: user.papel,
      exp: Math.floor(Date.now() / 1000) + 86400, // 24h
    })
  )
  return `${header}.${payload}.demo_signature_smartmarket`
}

export const authService = {
  /**
   * Realiza o login do usuário
   */
  async login(email, senha) {
    try {
      const response = await api.post("/auth/login", { email, senha })
      return response.data
    } catch (error) {
      // Se for erro de conexão (backend offline), utiliza a autenticação demo
      if (!error.response || error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
        const foundUser = DEMO_USERS.find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        )
        if (foundUser) {
          return {
            token: generateDemoToken(foundUser),
            tipo: "Bearer",
            id: foundUser.id,
            nome: foundUser.nome,
            email: foundUser.email,
            papel: foundUser.papel,
            isDemo: true,
          }
        }
        // Se não encontrar, cria um usuário demo padrão com base no email
        const isDemoAdmin = email.toLowerCase().includes("admin") || email.toLowerCase().includes("davi")
        const dynamicUser = {
          id: Date.now(),
          nome: email.split("@")[0].replace(".", " "),
          email,
          papel: isDemoAdmin ? "ADMIN" : "USER",
        }
        return {
          token: generateDemoToken(dynamicUser),
          tipo: "Bearer",
          id: dynamicUser.id,
          nome: dynamicUser.nome,
          email: dynamicUser.email,
          papel: dynamicUser.papel,
          isDemo: true,
        }
      }
      throw error
    }
  },

  /**
   * Realiza o cadastro de um novo usuário
   */
  async register(nome, email, senha) {
    try {
      const response = await api.post("/auth/register", { nome, email, senha })
      return response.data
    } catch (error) {
      // Fallback demo caso backend esteja offline
      if (!error.response || error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
        const newUser = {
          id: Date.now(),
          nome,
          email,
          papel: "USER",
        }
        return {
          token: generateDemoToken(newUser),
          tipo: "Bearer",
          id: newUser.id,
          nome: newUser.nome,
          email: newUser.email,
          papel: newUser.papel,
          isDemo: true,
        }
      }
      throw error
    }
  },

  /**
   * Obtém o perfil do usuário autenticado atual
   */
  async getProfile() {
    const response = await api.get("/auth/me")
    return response.data
  },
}

export default authService
