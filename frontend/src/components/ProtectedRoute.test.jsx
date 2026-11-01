import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuth } from '../hooks/useAuth'

jest.mock('../hooks/useAuth', () => ({ useAuth: jest.fn() }))

function PaginaLogin() {
  const { state } = useLocation()
  return <p>Login (veio de {state?.from?.pathname})</p>
}

function renderizar({ auth, requiredRole, children }) {
  useAuth.mockReturnValue(auth)
  return render(
    <MemoryRouter initialEntries={['/privado']}>
      <Routes>
        <Route path="/auth" element={<PaginaLogin />} />
        <Route
          path="/privado"
          element={<ProtectedRoute requiredRole={requiredRole}>{children}</ProtectedRoute>}
        >
          <Route index element={<p>Conteudo via Outlet</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('mostra o aviso de verificacao enquanto a sessao carrega', () => {
    renderizar({ auth: { isLoading: true }, children: <p>Segredo</p> })

    expect(screen.getByText('Verificando sessão segura...')).toBeInTheDocument()
    expect(screen.queryByText('Segredo')).not.toBeInTheDocument()
  })

  it('redireciona para o login guardando a rota de origem quando nao autenticado', () => {
    renderizar({ auth: { isLoading: false, isAuthenticated: false }, children: <p>Segredo</p> })

    expect(screen.getByText('Login (veio de /privado)')).toBeInTheDocument()
    expect(screen.queryByText('Segredo')).not.toBeInTheDocument()
  })

  it('renderiza os filhos quando autenticado', () => {
    renderizar({ auth: { isLoading: false, isAuthenticated: true }, children: <p>Segredo</p> })

    expect(screen.getByText('Segredo')).toBeInTheDocument()
  })

  it('renderiza o Outlet quando autenticado e sem filhos diretos', () => {
    renderizar({ auth: { isLoading: false, isAuthenticated: true } })

    expect(screen.getByText('Conteudo via Outlet')).toBeInTheDocument()
  })

  it('bloqueia com 403 quem nao e ADMIN em rota que exige ADMIN', () => {
    renderizar({
      auth: { isLoading: false, isAuthenticated: true, isAdmin: false, user: { nome: 'Ana', papel: 'USER' } },
      requiredRole: 'ADMIN',
      children: <p>Segredo</p>,
    })

    expect(screen.getByText('Acesso Restrito (403)')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.queryByText('Segredo')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para o Catálogo' })).toHaveAttribute('href', '/catalog')
    expect(screen.getByRole('link', { name: 'Trocar de Conta' })).toHaveAttribute('href', '/auth?mode=login')
  })

  it('assume o papel USER na mensagem quando o usuario nao informa papel', () => {
    renderizar({
      auth: { isLoading: false, isAuthenticated: true, isAdmin: false, user: { nome: 'Ana' } },
      requiredRole: 'ADMIN',
      children: <p>Segredo</p>,
    })

    expect(screen.getByText('USER')).toBeInTheDocument()
  })

  it('libera o conteudo para ADMIN em rota que exige ADMIN', () => {
    renderizar({
      auth: { isLoading: false, isAuthenticated: true, isAdmin: true, user: { nome: 'Chefe' } },
      requiredRole: 'ADMIN',
      children: <p>Segredo</p>,
    })

    expect(screen.getByText('Segredo')).toBeInTheDocument()
  })
})
