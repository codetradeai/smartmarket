import { Navigate, useLocation, Outlet, Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button, Card } from "./ui"

export function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, isAdmin, isLoading, user } = useAuth()
  const location = useLocation()

  // 1. Estado de Carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-green/20 text-brand-green flex items-center justify-center animate-spin mb-4">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-brand-navy">Verificando sessão segura...</p>
      </div>
    )
  }

  // 2. Não autenticado -> Redireciona para o login com histórico
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // 3. Autenticado, mas sem a permissão necessária (ex: requer ADMIN e o usuário é USER)
  if (requiredRole === "ADMIN" && !isAdmin) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center text-3xl mx-auto mb-4 border border-rose-100 shadow-xs">
            🛡️
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800">
            Acesso Restrito (403)
          </span>
          <h2 className="text-xl font-bold text-brand-navy mt-3 mb-2">
            Área Exclusiva para Administradores
          </h2>
          <p className="text-xs text-brand-muted leading-relaxed mb-6">
            Olá, <strong className="text-brand-navy">{user?.nome}</strong>. Seu perfil atual é{" "}
            <span className="font-bold text-brand-green">{user?.papel || "USER"}</span>. O Painel
            Administrativo requer credenciais com permissão <strong className="text-brand-navy">ADMIN</strong>.
          </p>

          <div className="flex flex-col gap-2.5">
            <Link to="/catalog" className="w-full">
              <Button variant="primary" className="w-full">
                Voltar para o Catálogo
              </Button>
            </Link>
            <Link to="/auth?mode=login" className="w-full">
              <Button variant="outline" className="w-full">
                Trocar de Conta
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // 4. Autorizado -> Renderiza os filhos ou Outlet
  return children ? children : <Outlet />
}

export default ProtectedRoute
