import api from "./api"

// Modo demo: so existe se habilitado explicitamente no build (VITE_ENABLE_DEMO_LOGIN=true).
// Por padrao fica desligado; sem ele, falha de rede vira mensagem de erro, nunca sessao falsa.
function demoHabilitado() {
  return import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true"
}

export const MSG_SEM_SERVIDOR =
  "Não foi possível falar com o servidor. Verifique sua conexão e tente novamente em instantes."

function semRespostaDoServidor(error) {
  return !error.response || error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED"
}

// Converte falha de rede em erro com mensagem clara em PT-BR (lida pelo AuthContext)
function erroSemServidor(error) {
  error.userMessage = MSG_SEM_SERVIDOR
  return error
}

// Usuários mock (somente quando o modo demo estiver habilitado)
const DEMO_USERS = [
  {
    id: 1,
    nome: "Davi Souza",
    email: "davi@smartmarket.com.br",
    papel: "ADMIN",
    senha: "admin123",
  },
  {
    id: 2,
    nome: "Gilbert Lima",
    email: "gilbert@smartmarket.com.br",
    papel: "ADMIN",
    senha: "admin123",
  },
  {
    id: 3,
    nome: "Rudinei Silva",
    email: "rudinei@smartmarket.com.br",
    papel: "ADMIN",
    senha: "admin123",
  },
  {
    id: 4,
    nome: "Maria Santos",
    email: "maria@email.com",
    papel: "USER",
    senha: "user123",
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
      if (!semRespostaDoServidor(error)) throw error

      // Modo demo (opt-in): so aceita usuarios conhecidos com a senha correta
      if (demoHabilitado()) {
        const foundUser = DEMO_USERS.find(
          (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.senha === senha
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
      }
      throw erroSemServidor(error)
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
      if (!semRespostaDoServidor(error)) throw error

      if (demoHabilitado()) {
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
      throw erroSemServidor(error)
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
