import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Home from "./pages/Home"
import Sobre from "./pages/Sobre"
import AuthPage from "./pages/AuthPage"
import CatalogPage from "./pages/CatalogPage"
import FavoritesPage from "./pages/FavoritesPage"
import ShoppingListPage from "./pages/ShoppingListPage"
import AdminPage from "./pages/AdminPage"
import Layout from "./components/Layout"

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/sobre" element={<Sobre />} />

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
    </AuthProvider>
  )
}

export default App