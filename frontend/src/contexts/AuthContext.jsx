import { createContext, useState, useMemo, useCallback } from "react"
import authService from "../services/authService"

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

const TOKEN_KEY = "sm_token"
const USER_KEY = "sm_user"

/**
 * Decodifica o payload de um token JWT sem bibliotecas externas
 */
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Verifica se um token JWT ainda está dentro da validade
 */
function isTokenValid(token) {
  if (!token) return false
  const payload = parseJwt(token)
  if (!payload || !payload.exp) return true
  return payload.exp * 1000 > Date.now()
}

function getStoredToken() {
  try {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (storedToken && isTokenValid(storedToken)) {
      return storedToken
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return null
  } catch {
    return null
  }
}

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem(USER_KEY)
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken)
  const [user, setUser] = useState(getStoredUser)
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Realiza login
   */
  const login = useCallback(async (email, password) => {
    setIsLoading(true)
    try {
      const data = await authService.login(email, password)
      const userObj = {
        id: data.id,
        nome: data.nome,
        email: data.email,
        papel: data.papel || "USER",
      }

      setToken(data.token)
      setUser(userObj)

      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(userObj))

      return { success: true, user: userObj, isDemo: data.isDemo }
    } catch (error) {
      let message = "Falha ao realizar login. Verifique seu e-mail e senha."
      if (error.response?.data) {
        const data = error.response.data
        if (typeof data.erro === "string") {
          message = data.erro
        } else if (data.campos && typeof data.campos === "object") {
          message = Object.values(data.campos).join(". ")
        } else if (data.mensagem || data.message) {
          message = data.mensagem || data.message
        }
      }
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Realiza cadastro
   */
  const register = useCallback(async (name, email, password) => {
    setIsLoading(true)
    try {
      const data = await authService.register(name, email, password)
      const userObj = {
        id: data.id,
        nome: data.nome,
        email: data.email,
        papel: data.papel || "USER",
      }

      setToken(data.token)
      setUser(userObj)

      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(userObj))

      return { success: true, user: userObj, isDemo: data.isDemo }
    } catch (error) {
      let message = "Falha ao cadastrar. Tente novamente com outro e-mail."
      if (error.response?.data) {
        const data = error.response.data
        if (typeof data.erro === "string") {
          message = data.erro
        } else if (data.campos && typeof data.campos === "object") {
          message = Object.values(data.campos).join(". ")
        } else if (data.mensagem || data.message) {
          message = data.mensagem || data.message
        }
      }
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Realiza logout
   */
  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch {
      // fallback
    }
    setToken(null)
    setUser(null)
  }, [])

  const isAuthenticated = Boolean(token && user)
  const isAdmin = Boolean(user?.papel === "ADMIN")

  const contextValue = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isAdmin,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, token, isAuthenticated, isAdmin, isLoading, login, register, logout]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export default AuthProvider
