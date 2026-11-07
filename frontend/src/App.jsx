import { lazy, Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Home from "./pages/Home"
import CarregandoPagina from "./components/CarregandoPagina"

// A Home é a página de entrada e fica no pacote inicial. As demais rotas viram chunks próprios,
// baixados só quando o visitante as abre (menos JS para avaliar no primeiro carregamento).
const AuthPage = lazy(() => import("./pages/AuthPage"))
const CatalogPage = lazy(() => import("./pages/CatalogPage"))
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"))
const ShoppingListPage = lazy(() => import("./pages/ShoppingListPage"))
const AdminPage = lazy(() => import("./pages/AdminPage"))
const Layout = lazy(() => import("./components/Layout"))

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<CarregandoPagina />}>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/sobre" element={<Navigate to="/#sobre" replace />} />
  
          {/* Autenticação (Login e Cadastro) */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
  
          {/* Rotas Protegidas dentro do Shell com Sidebar */}
          <Route element={<Layout />}>
            {/* Rotas de Usuário Autenticado (USER ou ADMIN) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/favoritos" element={<FavoritesPage />} />
              <Route path="/list" element={<ShoppingListPage />} />
              <Route path="/compare" element={<ShoppingListPage />} />
            </Route>
  
            {/* Rota Protegida Restrita para Administradores (ADMIN) */}
            <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
  
          {/* Redirecionamento de rotas inexistentes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App