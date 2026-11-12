import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AuthPage from './AuthPage'
import { useAuth } from '../hooks/useAuth'
import { MARKETS, REDES_COM_PRODUTOS } from '../catalogoResumo'
import { listarNomes, nomeCurtoRede, redesComProdutos } from '../utils/redesDoCatalogo'

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

function preencherCadastro({ nome = '', email = '', senha = '', confirmar = '', cep = '90010000' }) {
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: nome } })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } })
  fireEvent.change(screen.getByLabelText('Confirmar Senha'), { target: { value: confirmar } })
  fireEvent.change(screen.getByLabelText('CEP'), { target: { value: cep } })
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
  })

  describe('atalhos de acesso rapido (credenciais de demonstracao)', () => {
    afterEach(() => {
      delete process.env.VITE_ENABLE_DEMO_LOGIN
      delete process.env.DEV
    })

    it('ficam ocultos por padrao (build de producao): nem botoes nem titulo na tela de login', () => {
      renderizar()

      expect(screen.queryByText(/Acesso Rápido/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Perfil Admin/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Perfil Usuário/ })).not.toBeInTheDocument()
    })

    it('aparecem em modo de desenvolvimento (import.meta.env.DEV)', () => {
      process.env.DEV = '1'
      renderizar()

      expect(screen.getByRole('button', { name: /Perfil Admin/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Perfil Usuário/ })).toBeInTheDocument()
    })

    it('preenche as credenciais de avaliacao do perfil admin quando o modo demo esta habilitado', async () => {
      process.env.VITE_ENABLE_DEMO_LOGIN = 'true'
      renderizar()

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Perfil Admin/ }))
      })

      expect(screen.getByLabelText('E-mail')).toHaveValue('davi@smartmarket.com.br')
      expect(screen.getByLabelText('Senha')).toHaveValue('admin123')
    })

    it('preenche as credenciais de avaliacao do perfil usuario e volta para a aba de login', async () => {
      process.env.VITE_ENABLE_DEMO_LOGIN = 'true'
      renderizar('/auth?mode=register')

      fireEvent.click(abaEntrar())
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Perfil Usuário/ }))
      })

      expect(screen.getByLabelText('E-mail')).toHaveValue('maria@email.com')
      expect(screen.getByLabelText('Senha')).toHaveValue('user123')
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

    it('diz que a recuperacao por e-mail esta indisponivel, sem prometer envio', () => {
      renderizar()
      fireEvent.click(screen.getByRole('button', { name: 'Esqueceu a senha?' }))

      const dialogo = screen.getByRole('dialog')
      expect(dialogo).toHaveTextContent(/indisponível por enquanto/i)
      expect(dialogo).not.toHaveTextContent(/foram enviadas/i)
      expect(dialogo).not.toHaveTextContent(/enviarmos o link/i)
    })

    it('nao oferece campo de e-mail nem botao de envio, ja que nenhuma chamada seria feita', () => {
      renderizar()
      fireEvent.click(screen.getByRole('button', { name: 'Esqueceu a senha?' }))

      expect(screen.queryByLabelText('E-mail cadastrado')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Enviar Link' })).not.toBeInTheDocument()
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

      expect(register).toHaveBeenCalledWith('Ana', 'ana@email.com', 'segredo1', '90010000')
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

    describe('CEP', () => {
      const enviar = async (container) => {
        await act(async () => {
          fireEvent.submit(formulario(container))
        })
      }
      const dadosOk = { nome: 'Ana', email: 'ana@email.com', senha: 'segredo1', confirmar: 'segredo1' }

      it('mostra o campo com o aviso de finalidade e dos serviços externos', () => {
        abrirCadastro()

        expect(screen.getByLabelText('CEP')).toHaveAttribute('placeholder', '00000-000')
        const aviso = screen.getByText(/identificar a loja mais próxima/)
        expect(aviso).toBeInTheDocument()
        expect(aviso).toHaveTextContent(/BrasilAPI\/ViaCEP/)
        // o aviso diz o que acontece quando a consulta não resolve: a conta é criada mesmo assim
        expect(aviso).toHaveTextContent(/falhar ou o CEP não for encontrado, sua conta é criada/)
        expect(screen.getByLabelText('CEP')).toHaveAttribute('aria-describedby', aviso.id)
      })

      it('aplica a máscara 00000-000 enquanto digita e ignora o que não é número', () => {
        abrirCadastro()
        const campo = screen.getByLabelText('CEP')

        fireEvent.change(campo, { target: { value: '90010' } })
        expect(campo).toHaveValue('90010')

        fireEvent.change(campo, { target: { value: '90010000' } })
        expect(campo).toHaveValue('90010-000')

        fireEvent.change(campo, { target: { value: '9a0b0-1c0d0e0f0' } })
        expect(campo).toHaveValue('90010-000')
      })

      it('exige o CEP e não chama o cadastro', async () => {
        const { container } = abrirCadastro()
        preencherCadastro({ ...dadosOk, cep: '' })

        await enviar(container)

        expect(screen.getByText('Informe o CEP.')).toBeInTheDocument()
        expect(register).not.toHaveBeenCalled()
      })

      it('rejeita CEP com menos de 8 dígitos', async () => {
        const { container } = abrirCadastro()
        preencherCadastro({ ...dadosOk, cep: '90010-00' })

        await enviar(container)

        expect(screen.getByText(/CEP inválido: informe os 8 dígitos/)).toBeInTheDocument()
        expect(register).not.toHaveBeenCalled()
      })

      it('limpa o erro do CEP ao voltar a digitar', async () => {
        const { container } = abrirCadastro()
        preencherCadastro({ ...dadosOk, cep: '123' })
        await enviar(container)
        expect(screen.getByText(/CEP inválido/)).toBeInTheDocument()

        fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '1234' } })

        expect(screen.queryByText(/CEP inválido/)).not.toBeInTheDocument()
      })

      it('envia só os 8 dígitos ao cadastro, sem o hífen', async () => {
        register.mockResolvedValue({ success: false, error: 'x' })
        const { container } = abrirCadastro()
        preencherCadastro({ ...dadosOk, cep: '90010-000' })

        await enviar(container)

        expect(screen.getByLabelText('CEP')).toHaveValue('90010-000')
        expect(register).toHaveBeenCalledWith('Ana', 'ana@email.com', 'segredo1', '90010000')
      })

      it('marca o campo CEP quando o backend rejeita só o CEP, sem perder o digitado', async () => {
        register.mockResolvedValue({
          success: false,
          error: 'CEP não encontrado',
          campos: { cep: 'CEP não encontrado' },
        })
        const { container } = abrirCadastro()
        preencherCadastro({ ...dadosOk, cep: '99999999' })

        await enviar(container)

        expect(screen.getAllByText('CEP não encontrado')).toHaveLength(2)
        expect(screen.getByLabelText('CEP')).toHaveValue('99999-999')
        expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana')
      })

      it('não quebra quando o backend devolve campos sem o CEP', async () => {
        register.mockResolvedValue({ success: false, error: 'E-mail inválido', campos: { email: 'E-mail inválido' } })
        const { container } = abrirCadastro()
        preencherCadastro(dadosOk)

        await enviar(container)

        expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
        expect(screen.queryByText('Informe o CEP.')).not.toBeInTheDocument()
      })
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

  describe('botão de mostrar e ocultar a senha', () => {
    it('no login alterna o campo entre oculto e visível sem enviar o formulário', () => {
      renderizar()
      const campo = screen.getByLabelText('Senha')
      expect(campo).toHaveAttribute('type', 'password')

      fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
      expect(campo).toHaveAttribute('type', 'text')
      expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true')
      expect(login).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }))
      expect(campo).toHaveAttribute('type', 'password')
    })

    it('no cadastro cada campo (senha e confirmação) tem o seu botão, independentes', () => {
      renderizar()
      fireEvent.click(abaCriarConta())
      const senha = screen.getByLabelText('Senha')
      const confirmar = screen.getByLabelText('Confirmar Senha')

      fireEvent.click(screen.getByRole('button', { name: 'Mostrar confirmação de senha' }))
      expect(confirmar).toHaveAttribute('type', 'text')
      expect(senha).toHaveAttribute('type', 'password')

      fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
      expect(senha).toHaveAttribute('type', 'text')
    })
  })

  describe('textos que não prometem o que o sistema não faz', () => {
    it('o campo de senha do cadastro anuncia o mínimo que o código aceita (6), não 8', () => {
      renderizar('/auth?mode=register')

      expect(screen.getByLabelText('Senha')).toHaveAttribute('placeholder', 'Mínimo 6 caracteres')
      expect(screen.queryByPlaceholderText(/Mínimo 8/)).not.toBeInTheDocument()
    })

    it('a lista de redes do benefício "Compare preços" traz só as que têm produtos no catálogo', () => {
      renderizar()

      const texto = screen.getByText(/Veja o total em cada supermercado da sua região/).textContent
      const ativas = redesComProdutos(MARKETS, REDES_COM_PRODUTOS)
      expect(ativas.length).toBeLessThan(MARKETS.length)
      expect(texto).toContain(`(${listarNomes(ativas.map(nomeCurtoRede))})`)
      expect(texto).toMatch(/Fort/)
      expect(texto).not.toMatch(/Carrefour/)
      expect(texto).not.toMatch(/e mais/)
    })
  })
})
