import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'
import { LoginModalProvider } from '../contexts/LoginModalContext'
import LinkEntrar from './LinkEntrar'
import * as carregar from './carregarCartaoLogin'

// A primeira abertura baixa e transforma o chunk lazy, o que demora mais com a cobertura ligada.
jest.setTimeout(20000)

function Local() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <p data-testid="local">{pathname + search}</p>
      <button type="button" onClick={() => navigate('/outra')}>
        ir para outra
      </button>
      <button type="button" onClick={() => navigate('/')}>
        voltar
      </button>
    </>
  )
}

function renderizar({ login = jest.fn(), comProvider = true } = {}) {
  const pagina = (
    <>
      <LinkEntrar>Entrar</LinkEntrar>
      <Local />
    </>
  )
  const rotas = (
    <Routes>
      <Route path="*" element={pagina} />
    </Routes>
  )
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthContext.Provider value={{ login, isLoading: false }}>
        {comProvider ? <LoginModalProvider>{rotas}</LoginModalProvider> : rotas}
      </AuthContext.Provider>
    </MemoryRouter>
  )
  return { login }
}

const abrir = async () => {
  fireEvent.click(screen.getByRole('link', { name: 'Entrar' }))
  // Prazo folgado: na primeira abertura o Jest ainda transforma o chunk lazy (lento com cobertura).
  await screen.findByLabelText('E-mail', {}, { timeout: 8000 })
}
const dialogo = () => screen.queryByRole('dialog')
const preencher = (email, senha) => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } })
}

describe('Login em modal', () => {
  afterEach(() => jest.restoreAllMocks())

  describe('abrir', () => {
    it('abre o card sobre a página atual, sem navegar', async () => {
      renderizar()

      await abrir()

      const card = screen.getByRole('dialog', { name: 'Entrar no SmartMarket' })
      expect(card).toHaveAttribute('aria-modal', 'true')
      expect(screen.getByTestId('local')).toHaveTextContent(/^\/$/)
      expect(screen.getByText('supermercados do RS.')).toBeInTheDocument()
    })

    it('mostra só o que o app faz e marca a loja mais próxima como em breve', async () => {
      renderizar()

      await abrir()

      expect(screen.getByText('Compare entre redes')).toBeInTheDocument()
      expect(screen.getByText('Lista de compras')).toBeInTheDocument()
      const loja = screen.getByText('Loja mais próxima')
      expect(loja.parentElement).toHaveTextContent('Em breve')
      expect(screen.queryByText(/mais de \d/i)).not.toBeInTheDocument()
    })

    it('mantém o link para /auth quando não há provider (uso isolado)', () => {
      renderizar({ comProvider: false })

      const link = screen.getByRole('link', { name: 'Entrar' })
      expect(link).toHaveAttribute('href', '/auth?mode=login')
      fireEvent.click(link)

      expect(dialogo()).not.toBeInTheDocument()
      expect(screen.getByTestId('local')).toHaveTextContent('/auth?mode=login')
    })

    it('não abre o card com Ctrl+clique: deixa o navegador abrir a página', () => {
      renderizar()

      fireEvent.click(screen.getByRole('link', { name: 'Entrar' }), { ctrlKey: true })

      expect(dialogo()).not.toBeInTheDocument()
    })

    it('pré-carrega o corpo do card ao passar o mouse e ao focar no "Entrar"', () => {
      const importar = jest.spyOn(carregar, 'importarCartaoLogin')
      renderizar()
      const link = screen.getByRole('link', { name: 'Entrar' })

      fireEvent.mouseEnter(link)
      fireEvent.focus(link)

      expect(importar).toHaveBeenCalledTimes(2)
      expect(dialogo()).not.toBeInTheDocument()
    })
  })

  describe('fechar', () => {
    it('fecha com ESC', async () => {
      renderizar()
      await abrir()

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(dialogo()).not.toBeInTheDocument()
    })

    it('fecha pelo botão Fechar', async () => {
      renderizar()
      await abrir()

      fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

      expect(dialogo()).not.toBeInTheDocument()
    })

    it('fecha ao clicar fora do card, mas não ao clicar dentro', async () => {
      renderizar()
      await abrir()

      fireEvent.mouseDown(screen.getByLabelText('E-mail'))
      expect(dialogo()).toBeInTheDocument()

      fireEvent.mouseDown(screen.getByRole('dialog'))
      expect(dialogo()).not.toBeInTheDocument()
    })

    it('fecha quando a rota muda', async () => {
      renderizar()
      await abrir()

      // O botão fica atrás do overlay; o clique programático simula a navegação (ex.: botão Voltar).
      fireEvent.click(screen.getByText('ir para outra'))

      await waitFor(() => expect(dialogo()).not.toBeInTheDocument())
      expect(screen.getByTestId('local')).toHaveTextContent('/outra')
    })

    it('não reabre ao voltar para a rota onde o card tinha sido aberto', async () => {
      renderizar()
      await abrir()

      fireEvent.click(screen.getByText('ir para outra'))
      await waitFor(() => expect(dialogo()).not.toBeInTheDocument())
      fireEvent.click(screen.getByText('voltar'))

      expect(screen.getByTestId('local')).toHaveTextContent(/^\/$/)
      expect(dialogo()).not.toBeInTheDocument()
    })

    it('devolve o foco ao "Entrar" depois de fechar', async () => {
      renderizar()
      const link = screen.getByRole('link', { name: 'Entrar' })
      link.focus()
      fireEvent.click(link)
      await screen.findByLabelText('E-mail')

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(link).toHaveFocus()
    })

    it('destrava a rolagem da página ao fechar', async () => {
      renderizar()
      await abrir()
      expect(document.body.style.overflow).toBe('hidden')

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(document.body.style.overflow).not.toBe('hidden')
    })
  })

  describe('foco', () => {
    it('prende o Tab dentro do card', async () => {
      renderizar()
      await abrir()
      const fechar = screen.getByRole('button', { name: 'Fechar' })
      const criarConta = screen.getByRole('link', { name: 'Criar conta grátis' })

      criarConta.focus()
      fireEvent.keyDown(document, { key: 'Tab' })
      expect(fechar).toHaveFocus()

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
      expect(criarConta).toHaveFocus()
    })
  })

  describe('enviar', () => {
    it('envia e-mail e senha pelo login do AuthContext, fecha o card e vai direto para o catálogo', async () => {
      const login = jest.fn().mockResolvedValue({ success: true })
      renderizar({ login })
      await abrir()

      preencher('ana@email.com', 'segredo1')
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

      await waitFor(() => expect(dialogo()).not.toBeInTheDocument())
      expect(login).toHaveBeenCalledWith('ana@email.com', 'segredo1')
      expect(screen.getByTestId('local')).toHaveTextContent(/^\/catalog$/)
    })

    it('não sai da página quando o login falha', async () => {
      const login = jest.fn().mockResolvedValue({ success: false, error: 'Senha incorreta.' })
      renderizar({ login })
      await abrir()

      preencher('ana@email.com', 'errada')
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

      await screen.findByRole('alert')
      expect(screen.getByTestId('local')).toHaveTextContent(/^\/$/)
    })

    it('pede e-mail e senha sem chamar o login quando faltam campos', async () => {
      const login = jest.fn()
      renderizar({ login })
      await abrir()

      preencher('ana@email.com', '')
      fireEvent.submit(screen.getByLabelText('E-mail').closest('form'))

      expect(screen.getByRole('alert')).toHaveTextContent('preencha o e-mail e a senha')
      expect(login).not.toHaveBeenCalled()
      expect(dialogo()).toBeInTheDocument()
    })

    it('mostra o erro do login dentro do card e mantém o que foi digitado', async () => {
      const login = jest.fn().mockResolvedValue({ success: false, error: 'E-mail ou senha incorretos.' })
      renderizar({ login })
      await abrir()

      preencher('ana@email.com', 'errada')
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
      expect(screen.getByLabelText('E-mail')).toHaveValue('ana@email.com')
      expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-describedby', 'login-erro')
      expect(dialogo()).toBeInTheDocument()
    })

    it('usa uma mensagem padrão quando o login falha sem texto', async () => {
      const login = jest.fn().mockResolvedValue({ success: false })
      renderizar({ login })
      await abrir()

      preencher('ana@email.com', 'x')
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas.')
    })

    it('alterna a visibilidade da senha', async () => {
      renderizar()
      await abrir()

      expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
      fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))

      expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text')
    })
  })

  describe('cadastro', () => {
    it('leva ao cadastro em /auth e fecha o card', async () => {
      renderizar()
      await abrir()

      fireEvent.click(screen.getByRole('link', { name: 'Criar conta grátis' }))

      await waitFor(() => expect(dialogo()).not.toBeInTheDocument())
      expect(screen.getByTestId('local')).toHaveTextContent('/auth?mode=register')
    })
  })
})
