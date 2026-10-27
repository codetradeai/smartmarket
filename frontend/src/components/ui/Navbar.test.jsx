import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useAuth } from '../../hooks/useAuth'

jest.mock('../../hooks/useAuth', () => ({ useAuth: jest.fn() }))

function renderizar(props = {}, rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Navbar {...props} />
    </MemoryRouter>
  )
}

const nav = (container) => container.querySelector('nav')
const menuMobile = () => screen.getByPlaceholderText('Buscar produtos...').closest('form').parentElement

describe('Navbar', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null, isAdmin: false })
  })

  describe('marca e links', () => {
    it('mostra a marca padrao e os links principais, sem o link Admin', () => {
      const { container } = renderizar()

      expect(screen.getByText('Compare & Economize')).toBeInTheDocument()
      const links = within(nav(container))
      expect(links.getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalog')
      expect(links.getByRole('link', { name: 'Favoritos' })).toHaveAttribute('href', '/favorites')
      expect(links.getByRole('link', { name: /Minha Lista/ })).toHaveAttribute('href', '/list')
      expect(links.getByRole('link', { name: 'Comparador' })).toHaveAttribute('href', '/compare')
      expect(links.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
    })

    it('mostra o selo com a contagem em "Minha Lista"', () => {
      const { container } = renderizar()

      expect(within(nav(container)).getByRole('link', { name: /Minha Lista/ })).toHaveTextContent('3')
    })

    it('mostra o logo quando logoUrl e informado', () => {
      renderizar({ logoUrl: 'logo.png', brandName: 'MeuMercado' })

      expect(screen.getByRole('img', { name: 'MeuMercado' })).toHaveAttribute('src', 'logo.png')
      expect(screen.queryByText('Compare & Economize')).not.toBeInTheDocument()
    })

    it('usa os links personalizados no lugar dos padrao', () => {
      const { container } = renderizar({ navLinks: [{ label: 'Ofertas', href: '/ofertas' }] })

      const links = within(nav(container))
      expect(links.getByRole('link', { name: 'Ofertas' })).toHaveAttribute('href', '/ofertas')
      expect(links.queryByRole('link', { name: 'Catálogo' })).not.toBeInTheDocument()
    })

    it('destaca o link da rota atual', () => {
      const { container } = renderizar({}, '/favorites')

      const links = within(nav(container))
      expect(links.getByRole('link', { name: 'Favoritos' }).className).toContain('bg-brand-green-light')
      expect(links.getByRole('link', { name: 'Catálogo' }).className).not.toContain('bg-brand-green-light')
    })

    it('mostra o contador do carrinho apenas quando maior que zero', () => {
      const { rerender } = renderizar({ cartCount: 0 })
      const botao = () => screen.getByRole('button', { name: 'Minha Lista de Compras' })
      expect(botao()).not.toHaveTextContent(/\d/)

      rerender(
        <MemoryRouter>
          <Navbar cartCount={5} />
        </MemoryRouter>
      )
      expect(botao()).toHaveTextContent('5')
    })
  })

  describe('permissao de administrador', () => {
    it('mostra o link Admin quando o contexto indica administrador', () => {
      useAuth.mockReturnValue({ user: null, isAdmin: true })
      const { container } = renderizar()

      expect(within(nav(container)).getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
    })

    it('mostra o link Admin quando o usuario informado por prop tem papel ADMIN', () => {
      const { container } = renderizar({ user: { name: 'Chefe', papel: 'ADMIN' } })

      expect(within(nav(container)).getByRole('link', { name: 'Admin' })).toBeInTheDocument()
    })

    it('funciona fora de um AuthProvider (o hook lanca erro)', () => {
      useAuth.mockImplementation(() => {
        throw new Error('fora do provider')
      })
      const { container } = renderizar()

      expect(within(nav(container)).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: 'Entrar' }).length).toBeGreaterThan(0)
    })
  })

  describe('usuario', () => {
    it('sem usuario mostra os botoes Entrar e Cadastrar', () => {
      renderizar()

      expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/auth?mode=login')
      expect(screen.getByRole('link', { name: 'Cadastrar' })).toHaveAttribute('href', '/auth?mode=register')
    })

    it('com usuario por prop mostra a inicial, o nome e o e-mail', () => {
      renderizar({ user: { name: 'ana', email: 'ana@email.com' } })

      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('ana')).toBeInTheDocument()
      expect(screen.getByText('ana@email.com')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    })

    it('usa a inicial "U" quando o usuario nao tem o campo name', () => {
      // O usuario do AuthContext usa "nome", e a Navbar le "name": comportamento atual.
      useAuth.mockReturnValue({ user: { nome: 'Ana', email: 'ana@email.com' }, isAdmin: false })
      renderizar()

      expect(screen.getByText('U')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    })
  })

  describe('busca', () => {
    it('envia o termo digitado ao enviar o formulario', () => {
      const onSearch = jest.fn()
      renderizar({ onSearch })

      const campo = screen.getByPlaceholderText('Buscar produtos, marcas ou categorias...')
      fireEvent.change(campo, { target: { value: 'arroz' } })
      fireEvent.submit(campo.closest('form'))

      expect(onSearch).toHaveBeenCalledWith('arroz')
    })

    it('nao quebra ao buscar sem onSearch', () => {
      renderizar()
      const campo = screen.getByPlaceholderText('Buscar produtos, marcas ou categorias...')

      expect(() => fireEvent.submit(campo.closest('form'))).not.toThrow()
    })

    it('limpa o campo pelo botao de limpar', () => {
      renderizar()
      const campo = screen.getByPlaceholderText('Buscar produtos, marcas ou categorias...')
      fireEvent.change(campo, { target: { value: 'leite' } })

      fireEvent.click(screen.getByTitle('Limpar campo'))

      expect(campo).toHaveValue('')
    })
  })

  describe('menu mobile', () => {
    it('abre e fecha o menu pelo botao', () => {
      renderizar()
      expect(screen.queryByPlaceholderText('Buscar produtos...')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      expect(screen.getByPlaceholderText('Buscar produtos...')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      expect(screen.queryByPlaceholderText('Buscar produtos...')).not.toBeInTheDocument()
    })

    it('mostra os links com selo e fecha o menu ao escolher um', () => {
      renderizar({}, '/catalog')
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

      const menu = menuMobile()
      const links = within(menu)
      expect(links.getByRole('link', { name: /Minha Lista/ })).toHaveTextContent('3')
      expect(links.getByRole('link', { name: 'Catálogo' }).className).toContain('bg-brand-green-light')

      fireEvent.click(links.getByRole('link', { name: 'Favoritos' }))
      expect(screen.queryByPlaceholderText('Buscar produtos...')).not.toBeInTheDocument()
    })

    it('envia a busca feita no menu mobile', () => {
      const onSearch = jest.fn()
      renderizar({ onSearch })
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

      const campo = screen.getByPlaceholderText('Buscar produtos...')
      fireEvent.change(campo, { target: { value: 'cafe' } })
      fireEvent.submit(campo.closest('form'))

      expect(onSearch).toHaveBeenCalledWith('cafe')
    })

    it('sem usuario oferece Entrar e Cadastrar no menu e fecha ao clicar', () => {
      renderizar()
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

      const menu = menuMobile()
      fireEvent.click(within(menu).getByRole('link', { name: 'Entrar' }))
      expect(screen.queryByPlaceholderText('Buscar produtos...')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      fireEvent.click(within(menuMobile()).getByRole('link', { name: 'Cadastrar' }))
      expect(screen.queryByPlaceholderText('Buscar produtos...')).not.toBeInTheDocument()
    })

    it('com usuario nao mostra Entrar e Cadastrar no menu', () => {
      renderizar({ user: { name: 'Ana', email: 'ana@email.com' } })
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

      expect(screen.queryByRole('link', { name: 'Cadastrar' })).not.toBeInTheDocument()
    })
  })
})
