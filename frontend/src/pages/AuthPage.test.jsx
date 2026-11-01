import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AuthPage from './AuthPage'
import { useAuth } from '../hooks/useAuth'

jest.mock('../hooks/useAuth', () => ({ useAuth: jest.fn() }))

function renderizar(entrada = '/auth') {
  const container = render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/catalog" element={<p>Pagina do catalogo</p>} />
        <Route path="/lista" element={<p>Pagina da lista</p>} />
        <Route path="/" element={<p>Pagina inicial</p>} />
      </Routes>
    </MemoryRouter>
  )
  return container
}

const abaEntrar = () => screen.getAllByRole('button', { name: 'Entrar' })[0]
const abaCriarConta = () => screen.getAllByRole('button', { name: 'Criar conta' })[0]
const formulario = (container) => container.querySelector('form')

function preencherLogin(email, senha) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } })
}

function preencherCadastro({ nome = '', email = '', senha = '', confirmar = '' }) {
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: nome } })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } })
  fireEvent.change(screen.getByLabelText('Confirmar Senha'), { target: { value: confirmar } })
}

describe('AuthPage', () => {
  let login
  let register

  beforeEach(() => {
    login = jest.fn()
    register = jest.fn()
    useAuth.mockReturnValue({ login, register, isLoading: false })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('abas e mensagens iniciais', () => {
    it('abre na aba de login por padrao', () => {
      renderizar()

      expect(screen.getByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument()
      expect(screen.getByText('Bem-vindo de volta')).toBeInTheDocument()
    })

    it('abre na aba de cadastro com ?mode=register', () => {
      renderizar('/auth?mode=register')

      expect(screen.getByRole('heading', { name: 'Comece a economizar' })).toBeInTheDocument()
      expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    })

    it('avisa que a sessao expirou com ?expired=true', () => {
      renderizar('/auth?mode=login&expired=true')

      expect(screen.getByText('Sua sessão expirou. Por favor, autentique-se novamente.')).toBeInTheDocument()
    })

    it('alterna entre as abas e limpa a mensagem de erro', () => {
      const { container } = renderizar('/auth?expired=true')
      expect(screen.getByText(/Sua sessão expirou/)).toBeInTheDocument()

      fireEvent.click(abaCriarConta())
      expect(screen.getByRole('heading', { name: 'Comece a economizar' })).toBeInTheDocument()
      expect(screen.queryByText(/Sua sessão expirou/)).not.toBeInTheDocument()

      fireEvent.click(abaEntrar())
      expect(screen.getByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument()
      expect(formulario(container)).toBeInTheDocument()
    })

    it('alterna pelos links de texto "Criar conta gratis" e "Entrar"', () => {
      renderizar()

      fireEvent.click(screen.getByRole('button', { name: 'Criar conta grátis' }))
      expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()

      fireEvent.click(screen.getAllByRole('button', { name: 'Entrar' }).at(-1))
      expect(screen.getByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument()
    })
  })

  describe('login', () => {
    it('exige e-mail e senha', async () => {
      const { container } = renderizar()

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(screen.getByText('Por favor, preencha o e-mail e a senha.')).toBeInTheDocument()
      expect(login).not.toHaveBeenCalled()
    })

    it('autentica e vai para o catalogo por padrao', async () => {
      login.mockResolvedValue({ success: true })
      const { container } = renderizar()
      preencherLogin('ana@email.com', 'segredo')

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(login).toHaveBeenCalledWith('ana@email.com', 'segredo')
      expect(screen.getByText('Pagina do catalogo')).toBeInTheDocument()
    })

    it('volta para a pagina de onde o usuario veio', async () => {
      login.mockResolvedValue({ success: true })
      const { container } = renderizar({ pathname: '/auth', state: { from: { pathname: '/lista' } } })
      preencherLogin('ana@email.com', 'segredo')

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(screen.getByText('Pagina da lista')).toBeInTheDocument()
    })

    it('mostra o erro devolvido pelo login', async () => {
      login.mockResolvedValue({ success: false, error: 'Senha incorreta' })
      const { container } = renderizar()
      preencherLogin('ana@email.com', 'errada')

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(screen.getByText('E-mail ou senha inválidos')).toBeInTheDocument()
      expect(screen.getByText('Senha incorreta')).toBeInTheDocument()
      expect(screen.queryByText('Pagina do catalogo')).not.toBeInTheDocument()
    })

    it('usa uma mensagem padrao quando o login falha sem detalhe', async () => {
      login.mockResolvedValue({ success: false })
      const { container } = renderizar()
      preencherLogin('ana@email.com', 'errada')

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(screen.getByText('Credenciais inválidas.')).toBeInTheDocument()
    })

    it('desabilita o botao e mostra "Carregando..." enquanto autentica', () => {
      useAuth.mockReturnValue({ login, register, isLoading: true })
      renderizar()

      const botao = screen.getByRole('button', { name: 'Carregando...' })
      expect(botao).toBeDisabled()
    })

    it('preenche as credenciais de avaliacao do perfil admin', () => {
      renderizar()

      fireEvent.click(screen.getByRole('button', { name: /Perfil Admin/ }))

      expect(screen.getByLabelText('E-mail')).toHaveValue('davi@smartmarket.com.br')
      expect(screen.getByLabelText('Senha')).toHaveValue('admin')
    })

    it('preenche as credenciais de avaliacao do perfil usuario e volta para a aba de login', () => {
      renderizar('/auth?mode=register')

      fireEvent.click(abaEntrar())
      fireEvent.click(screen.getByRole('button', { name: /Perfil Usuário/ }))

      expect(screen.getByLabelText('E-mail')).toHaveValue('maria@email.com')
      expect(screen.getByLabelText('Senha')).toHaveValue('user')
    })
  })

  describe('esqueceu a senha', () => {
    it('abre e fecha o modal de recuperacao', () => {
      renderizar()

      fireEvent.click(screen.getByRole('button', { name: 'Esqueceu a senha?' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Recuperar Senha' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('confirma o envio das instrucoes e fecha o modal sozinho', () => {
      jest.useFakeTimers()
      renderizar()
      fireEvent.click(screen.getByRole('button', { name: 'Esqueceu a senha?' }))

      fireEvent.change(screen.getByLabelText('E-mail cadastrado'), { target: { value: 'ana@email.com' } })
      fireEvent.click(screen.getByRole('button', { name: 'Enviar Link' }))

      expect(screen.getByText('Instruções de redefinição foram enviadas para ana@email.com!')).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(2500)
      })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('nao envia quando o e-mail esta vazio', () => {
      renderizar()
      fireEvent.click(screen.getByRole('button', { name: 'Esqueceu a senha?' }))

      fireEvent.submit(screen.getByRole('dialog').querySelector('form'))

      expect(screen.queryByText(/Instruções de redefinição/)).not.toBeInTheDocument()
    })
  })

  describe('cadastro', () => {
    const abrirCadastro = () => renderizar('/auth?mode=register')

    it('exige todos os campos', async () => {
      const { container } = abrirCadastro()

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(screen.getByText('Por favor, preencha todos os campos obrigatórios.')).toBeInTheDocument()
      expect(register).not.toHaveBeenCalled()
    })

    it('rejeita senhas diferentes', async () => {
      const { container } = abrirCadastro()
      preencherCadastro({ nome: 'Ana', email: 'ana@email.com', senha: 'segredo1', confirmar: 'segredo2' })

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(screen.getByText('As senhas informadas não coincidem.')).toBeInTheDocument()
      expect(register).not.toHaveBeenCalled()
    })

    it('rejeita senha com menos de 6 caracteres', async () => {
      const { container } = abrirCadastro()
      preencherCadastro({ nome: 'Ana', email: 'ana@email.com', senha: '12345', confirmar: '12345' })

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(screen.getByText('A senha deve ter no mínimo 6 caracteres.')).toBeInTheDocument()
      expect(register).not.toHaveBeenCalled()
    })

    it('cria a conta, mostra o sucesso e redireciona apos o intervalo', async () => {
      jest.useFakeTimers()
      register.mockResolvedValue({ success: true })
      const { container } = abrirCadastro()
      preencherCadastro({ nome: 'Ana', email: 'ana@email.com', senha: 'segredo1', confirmar: 'segredo1' })

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(register).toHaveBeenCalledWith('Ana', 'ana@email.com', 'segredo1')
      expect(screen.getByText('Conta criada com sucesso! Redirecionando...')).toBeInTheDocument()
      expect(screen.queryByText('Pagina do catalogo')).not.toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(1200)
      })
      expect(screen.getByText('Pagina do catalogo')).toBeInTheDocument()
    })

    it('mostra o erro devolvido pelo cadastro', async () => {
      register.mockResolvedValue({ success: false, error: 'E-mail ja cadastrado' })
      const { container } = abrirCadastro()
      preencherCadastro({ nome: 'Ana', email: 'ana@email.com', senha: 'segredo1', confirmar: 'segredo1' })

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(screen.getByText('E-mail ja cadastrado')).toBeInTheDocument()
    })

    it('usa uma mensagem padrao quando o cadastro falha sem detalhe', async () => {
      register.mockResolvedValue({ success: false })
      const { container } = abrirCadastro()
      preencherCadastro({ nome: 'Ana', email: 'ana@email.com', senha: 'segredo1', confirmar: 'segredo1' })

      await act(async () => {
        fireEvent.submit(formulario(container))
      })

      expect(screen.getByText('Falha ao criar conta.')).toBeInTheDocument()
    })
  })

  describe('indicador de forca da senha', () => {
    it('so aparece depois que a senha comeca a ser digitada', () => {
      renderizar('/auth?mode=register')
      expect(screen.queryByText(/Segurança da Senha/)).not.toBeInTheDocument()

      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'a' } })

      expect(screen.getByText(/Segurança da Senha/)).toBeInTheDocument()
    })

    it.each([
      ['abc', 'Muito fraca'],
      ['abcdefgh', 'Fraca'],
      ['Abcdefgh', 'Média'],
      ['Abcdefg1', 'Forte'],
      ['Abcdef1!', 'Muito forte'],
    ])('classifica "%s" como %s', (senha, nivel) => {
      renderizar('/auth?mode=register')

      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } })

      expect(screen.getByText(`Segurança da Senha: ${nivel}`)).toBeInTheDocument()
    })
  })
})
