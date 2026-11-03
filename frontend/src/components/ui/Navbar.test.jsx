import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from './Navbar'
import { AuthContext } from '../../contexts/AuthContext'

// Catálogo real (src/data.js) tem 32 MB; os testes usam a fixture pequena.
jest.mock('../../data', () => require('../../test/dataFixture'))

// A Navbar lê a sessão com useContext(AuthContext), não com o hook useAuth. A sessão é
// injetada pelo Provider real; `auth = null` representa a Navbar fora de um AuthProvider.
function renderizar(props = {}, { rota = '/', auth = null } = {}) {
  const arvore = (
    <MemoryRouter initialEntries={[rota]}>
      <Navbar {...props} />
    </MemoryRouter>
  )
  return render(auth ? <AuthContext.Provider value={auth}>{arvore}</AuthContext.Provider> : arvore)
}

const navDesktop = (container) => container.querySelector('nav')
const abrirMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
const gaveta = () => screen.getByPlaceholderText('Buscar produtos...').closest('div[class*="slide-in-from-top"]')
const gavetaAberta = () => screen.queryByPlaceholderText('Buscar produtos...') !== null
const campoBuscaDesktop = () => screen.getByPlaceholderText('Buscar produtos, marcas ou categorias...')

describe('Navbar', () => {
  describe('links', () => {
    it('destaca o link da rota atual', () => {
      const { container } = renderizar({}, { rota: '/favorites' })

      const links = within(navDesktop(container))
      expect(links.getByRole('link', { name: 'Favoritos' }).className).toContain('bg-brand-green-light')
      expect(links.getByRole('link', { name: 'Catálogo' }).className).not.toContain('bg-brand-green-light')
    })

    it('mostra o contador da lista apenas quando maior que zero', () => {
      const { container, rerender } = renderizar({ cartCount: 0 })
      const botao = () => screen.getByRole('button', { name: 'Minha Lista de Compras' })
      const linkDaLista = () => within(navDesktop(container)).getByRole('link', { name: /Minha Lista/ })
      expect(botao()).not.toHaveTextContent(/\d/)
      expect(linkDaLista()).toHaveTextContent(/^Minha Lista$/)

      rerender(
        <MemoryRouter>
          <Navbar cartCount={5} />
        </MemoryRouter>
      )
      expect(botao()).toHaveTextContent('5')
      expect(linkDaLista()).toHaveTextContent(/^Minha Lista\s*5$/)
    })
  })

  describe('permissao de administrador', () => {
    it.each([
      ['fora de um AuthProvider', {}, null, false],
      ['usuario comum no contexto', {}, { user: { nome: 'Ana', papel: 'USER' }, isAdmin: false }, false],
      ['usuario comum por prop', { user: { name: 'Ana', papel: 'USER' } }, null, false],
      ['administrador no contexto', {}, { user: { nome: 'Chefe', papel: 'ADMIN' }, isAdmin: true }, true],
      ['administrador por prop', { user: { name: 'Chefe', papel: 'ADMIN' } }, null, true],
    ])('link de administração: %s', (_caso, props, auth, deveAparecer) => {
      const { container } = renderizar(props, { auth })

      const links = within(navDesktop(container))
      if (deveAparecer) {
        expect(links.getByRole('link', { name: 'Administração' })).toHaveAttribute('href', '/admin')
        expect(links.getAllByRole('link')).toHaveLength(5)
      } else {
        expect(links.queryByRole('link', { name: 'Administração' })).not.toBeInTheDocument()
        expect(links.getAllByRole('link')).toHaveLength(4)
      }
    })
  })

  describe('usuario', () => {
    it('sem usuario mostra os botoes Entrar e Cadastrar', () => {
      renderizar()

      expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/auth?mode=login')
      expect(screen.getByRole('link', { name: 'Cadastrar' })).toHaveAttribute('href', '/auth?mode=register')
    })
  })

  describe('busca', () => {
    it('envia o termo digitado ao enviar o formulario', () => {
      const onSearch = jest.fn()
      renderizar({ onSearch })

      fireEvent.change(campoBuscaDesktop(), { target: { value: 'arroz' } })
      fireEvent.submit(campoBuscaDesktop().closest('form'))

      expect(onSearch).toHaveBeenCalledWith('arroz')
    })

    it('nao quebra ao buscar sem onSearch', () => {
      renderizar()

      expect(() => fireEvent.submit(campoBuscaDesktop().closest('form'))).not.toThrow()
    })

    it('limpa o campo pelo botao de limpar', () => {
      renderizar()
      fireEvent.change(campoBuscaDesktop(), { target: { value: 'leite' } })

      fireEvent.click(screen.getByTitle('Limpar campo'))

      expect(campoBuscaDesktop()).toHaveValue('')
    })
  })

  describe('menu mobile', () => {
    it('abre e fecha o menu pelo botao', () => {
      renderizar()
      expect(gavetaAberta()).toBe(false)

      abrirMenu()
      expect(gavetaAberta()).toBe(true)
      expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true')

      fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }))
      expect(gavetaAberta()).toBe(false)
      expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
    })

    it('mostra os links com selo e fecha o menu ao escolher um', () => {
      renderizar({ cartCount: 3 }, { rota: '/catalog' })
      abrirMenu()

      const links = within(gaveta())
      expect(links.getByRole('link', { name: /Minha Lista/ })).toHaveTextContent(/^Minha Lista\s*3$/)
      expect(links.getByRole('link', { name: 'Catálogo' }).className).toContain('bg-brand-green-light')

      fireEvent.click(links.getByRole('link', { name: 'Favoritos' }))
      expect(gavetaAberta()).toBe(false)
    })

    it('envia a busca feita no menu mobile e fecha o menu', () => {
      const onSearch = jest.fn()
      renderizar({ onSearch })
      abrirMenu()

      const campo = screen.getByPlaceholderText('Buscar produtos...')
      fireEvent.change(campo, { target: { value: 'cafe' } })
      fireEvent.submit(campo.closest('form'))

      expect(onSearch).toHaveBeenCalledWith('cafe')
      expect(gavetaAberta()).toBe(false)
    })

    it('sem usuario oferece Entrar e Cadastrar no menu e fecha ao clicar', () => {
      renderizar()
      abrirMenu()

      const entrar = within(gaveta()).getByRole('link', { name: 'Entrar' })
      expect(entrar).toHaveAttribute('href', '/auth?mode=login')
      fireEvent.click(entrar)
      expect(gavetaAberta()).toBe(false)

      abrirMenu()
      const cadastrar = within(gaveta()).getByRole('link', { name: 'Cadastrar' })
      expect(cadastrar).toHaveAttribute('href', '/auth?mode=register')
      fireEvent.click(cadastrar)
      expect(gavetaAberta()).toBe(false)
    })

    it('com usuario nao mostra Entrar e Cadastrar no menu', () => {
      renderizar({ user: { name: 'Ana', email: 'ana@email.com' } })
      abrirMenu()

      expect(within(gaveta()).queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
      expect(within(gaveta()).queryByRole('link', { name: 'Cadastrar' })).not.toBeInTheDocument()
      expect(within(gaveta()).getByRole('button', { name: /Sair da conta/ })).toBeInTheDocument()
    })
  })
})
