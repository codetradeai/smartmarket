import api from "./api"

// Credenciais de demonstração (DEMO_USERS, atalhos da tela de login) ficam em demoLogin.js e só são
// carregadas por import dinâmico. A condição de cada import fica escrita DIRETAMENTE no `if`: em
// produção o Vite troca import.meta.env.DEV por `false` e a flag por `undefined`, o `if` vira
// constante e o bundler descarta o import() junto com o chunk das senhas. Se a condição ficasse
// dentro de uma função auxiliar, o bundler não a inlinaria e o chunk com as senhas seria publicado.
// Conferir após mudar: `npm run build && grep -r "admin123\|user123" dist` deve dar zero.

// Fallback de login/cadastro com backend offline: só existe se habilitado explicitamente no build
// (VITE_ENABLE_DEMO_LOGIN=true). Sem ele, falha de rede vira mensagem de erro, nunca sessão falsa.
async function carregarDemoDoFallback() {
  if (import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true") return import("./demoLogin")
  return null
}

// Botões de "Acesso Rápido" da tela de login: desenvolvimento local ou modo demo explícito.
export function atalhosDemoHabilitados() {
  return Boolean(import.meta.env.DEV) || import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true"
}

async function carregarDemoDosAtalhos() {
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true") return import("./demoLogin")
  return null
}

// Credenciais dos atalhos, ou null quando os atalhos estão desligados.
export async function credenciaisDemo(tipo) {
  const demo = await carregarDemoDosAtalhos()
  if (!demo) return null
  return demo.CREDENCIAIS_ATALHO[tipo === "admin" ? "admin" : "user"]
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
      const demo = await carregarDemoDoFallback()
      if (demo) {
        const { DEMO_USERS, gerarTokenDemo } = demo
        const foundUser = DEMO_USERS.find(
          (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.senha === senha
        )
        if (foundUser) {
          return {
            token: gerarTokenDemo(foundUser),
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

      const demo = await carregarDemoDoFallback()
      if (demo) {
        const { gerarTokenDemo } = demo
        const newUser = {
          id: Date.now(),
          nome,
          email,
          papel: "USER",
        }
        return {
          token: gerarTokenDemo(newUser),
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
