import axios from "axios"

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

    if (status === 401) {
      // Sessão expirada ou inválida
      try {
        localStorage.removeItem("sm_token")
        localStorage.removeItem("sm_user")
      } catch {
        // fallback
      }

      // Redireciona para o login apenas se não estiver já na página de autenticação
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth?mode=login&expired=true"
      }
    }

    return Promise.reject(error)
  }
)

export default api
