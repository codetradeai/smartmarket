import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Layout from './Layout'
import { useAuth } from '../hooks/useAuth'

jest.mock('../hooks/useAuth', () => ({ useAuth: jest.fn() }))

function renderizar(rota = '/catalog') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/" element={<p>Pagina inicial</p>} />
        <Route element={<Layout />}>
          <Route path="/catalog" element={<p>Conteudo do catalogo</p>} />
          <Route path="/favorites" element={<p>Conteudo dos favoritos</p>} />
          <Route path="/admin" element={<p>Conteudo do admin</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('Layout', () => {
  let logout

  beforeEach(() => {
    logout = jest.fn()
    useAuth.mockReturnValue({
      user: { nome: 'ana', papel: 'USER' },
      isAdmin: false,
      logout,
    })
  })

  it('renderiza o conteudo da rota filha dentro do layout', () => {
    renderizar()

    expect(screen.getByText('Conteudo do catalogo')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'SmartMarket' })).toBeInTheDocument()
  })

  it('mostra os links de usuario comum, sem o Admin', () => {
    renderizar()

    expect(screen.getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalog')
    expect(screen.getByRole('link', { name: 'Favoritos' })).toHaveAttribute('href', '/favorites')
    expect(screen.getByRole('link', { name: 'Minha Lista' })).toHaveAttribute('href', '/list')
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('mostra o link Admin para administradores', () => {
    useAuth.mockReturnValue({ user: { nome: 'Chefe', papel: 'ADMIN' }, isAdmin: true, logout })
    renderizar('/admin')

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })

  it('mostra nome, papel e inicial do usuario', () => {
    renderizar()

    expect(screen.getByText('ana')).toBeInTheDocument()
    expect(screen.getByText('USER')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('usa valores padrao quando nao ha usuario', () => {
    useAuth.mockReturnValue({ user: null, isAdmin: false, logout })
    renderizar()

    expect(screen.getByText('Usuário')).toBeInTheDocument()
    expect(screen.getByText('USER')).toBeInTheDocument()
    expect(screen.getByText('U')).toBeInTheDocument()
  })

  it('destaca o link da rota atual', () => {
    renderizar('/favorites')

    expect(screen.getByRole('link', { name: 'Favoritos' })).toHaveStyle({ fontWeight: 700 })
    expect(screen.getByRole('link', { name: 'Catálogo' })).toHaveStyle({ fontWeight: 500 })
  })

  it('encerra a sessao e volta para a pagina inicial ao sair', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: /Sair da conta/ }))

    expect(logout).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Pagina inicial')).toBeInTheDocument()
  })
})
