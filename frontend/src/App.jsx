import { Routes, Route, Navigate } from "react-router-dom"
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
    <Routes>
      {/* Landing Page pública */}
      <Route path="/" element={<Home />} />
      <Route path="/sobre" element={<Sobre />} />

      {/* Autenticação */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* Aplicação interna com Sidebar e Layout */}
      <Route element={<Layout />}>
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/favoritos" element={<FavoritesPage />} />
        <Route path="/list" element={<ShoppingListPage />} />
        <Route path="/compare" element={<ShoppingListPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Redirecionamento de rotas inexistentes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App