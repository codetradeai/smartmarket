import axios from "axios"
import { guardarDadosPrivados } from "./storageKeys"
import { urlPublica } from "../utils/urlPublica"

// A tela de autenticação também responde em /login e /register, então o caminho da página
// não distingue "senha errada" de "sessão expirada": olha-se a chamada que falhou.
const ehChamadaDeAutenticacao = (error) => /\/auth\/(login|register)\/?(\?|$)/.test(String(error?.config?.url ?? ""))

// Base URL da API:
// 1. VITE_API_URL, quando definida no build (backend em outro dominio).
// 2. Em producao, "/api" relativo: a Vercel faz o proxy de /api/* para o
//    backend (ver vercel.json), sem CORS e sem URL do backend no bundle.
// 3. Em desenvolvimento, o Spring Boot local.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:8080/api")

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
})

// Request Interceptor: Injeta automaticamente o token JWT
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("sm_token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // Ignora falhas em ambientes sem localStorage
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Trata expiração de sessão e erros de permissão
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    // 401 de /auth/login ou /auth/register é credencial errada, não sessão expirada: não
    // encerra nada, não apaga nada e não redireciona (o erro é mostrado na própria tela).
    if (status === 401 && !ehChamadaDeAutenticacao(error)) {
      // Sessão expirada ou inválida: só invalida a sessão. Os dados locais (favoritos,
      // alertas, lista) são GUARDADOS no namespace do dono, não apagados, e voltam no
      // próximo login da mesma conta. Guardar vem antes de remover o usuário (descobre o dono).
      guardarDadosPrivados()
      try {
        localStorage.removeItem("sm_token")
        localStorage.removeItem("sm_user")
      } catch {
        // fallback
      }

      // Redireciona para o login apenas se não estiver já na página de autenticação
      if (typeof window !== "undefined" && !window.location.pathname.startsWith(urlPublica("/auth"))) {
        window.location.href = urlPublica("/auth?mode=login&expired=true")
      }
    }

    if (status === 403) {
      // Sem permissao para o recurso: a sessao continua valida, entao nao desloga.
      // A mensagem fica disponivel para quem exibir o erro.
      error.userMessage = "Você não tem permissão para acessar este recurso."
    }

    return Promise.reject(error)
  }
)

export default api
