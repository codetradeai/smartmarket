import { useEffect } from 'react'
import { act, render, screen } from '@testing-library/react'
import { AuthProvider } from './AuthContext'
import { useAuth } from '../hooks/useAuth'
import authService from '../services/authService'

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: { login: jest.fn(), register: jest.fn() },
}))

const TOKEN_KEY = 'sm_token'
const USER_KEY = 'sm_user'

function criarJwt(payload) {
  const corpo = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `cabecalho.${corpo}.assinatura`
}

const jwtValido = criarJwt({ exp: Math.floor(Date.now() / 1000) + 3600 })
const jwtExpirado = criarJwt({ exp: Math.floor(Date.now() / 1000) - 3600 })
const usuarioSalvo = { id: 1, nome: 'Ana', email: 'ana@email.com', papel: 'USER' }

const capturado = { atual: null }
function Espiao() {
  const contexto = useAuth()
  useEffect(() => {
    capturado.atual = contexto
  })
  return (
    <div>
      <span data-testid="autenticado">{String(contexto.isAuthenticated)}</span>
      <span data-testid="admin">{String(contexto.isAdmin)}</span>
      <span data-testid="carregando">{String(contexto.isLoading)}</span>
      <span data-testid="nome">{contexto.user?.nome ?? ''}</span>
    </div>
  )
}

function renderizar() {
  return render(
    <AuthProvider>
      <Espiao />
    </AuthProvider>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    localStorage.clear()
  })

  describe('sessao guardada', () => {
    it('comeca deslogado quando nao ha nada guardado', () => {
      renderizar()

      expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
      expect(screen.getByTestId('admin')).toHaveTextContent('false')
    })

    it('restaura a sessao com token valido e usuario guardados', () => {
      localStorage.setItem(TOKEN_KEY, jwtValido)
      localStorage.setItem(USER_KEY, JSON.stringify(usuarioSalvo))

      renderizar()

      expect(screen.getByTestId('autenticado')).toHaveTextContent('true')
      expect(screen.getByTestId('nome')).toHaveTextContent('Ana')
    })

    it('descarta token expirado e limpa o que estava guardado', () => {
      localStorage.setItem(TOKEN_KEY, jwtExpirado)
      localStorage.setItem(USER_KEY, JSON.stringify(usuarioSalvo))

      renderizar()

      expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
      expect(localStorage.getItem(USER_KEY)).toBeNull()
    })

    it('aceita token sem data de expiracao ou fora do formato JWT', () => {
      localStorage.setItem(TOKEN_KEY, criarJwt({ sub: 'ana' }))
      localStorage.setItem(USER_KEY, JSON.stringify(usuarioSalvo))
      const { unmount } = renderizar()
      expect(screen.getByTestId('autenticado')).toHaveTextContent('true')
      unmount()

      localStorage.setItem(TOKEN_KEY, 'token-sem-pontos')
      renderizar()
      expect(screen.getByTestId('autenticado')).toHaveTextContent('true')
    })

    it('ignora usuario guardado com JSON corrompido', () => {
      localStorage.setItem(TOKEN_KEY, jwtValido)
      localStorage.setItem(USER_KEY, '{nao-e-json')

      renderizar()

      expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
    })

    it('segue deslogado quando o localStorage lanca erro', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('sem localStorage')
      })

      renderizar()

      expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
      jest.restoreAllMocks()
    })
  })

  describe('login', () => {
    it('autentica, guarda a sessao e informa se e conta demo', async () => {
      authService.login.mockResolvedValue({
        token: jwtValido, id: 2, nome: 'Chefe', email: 'chefe@email.com', papel: 'ADMIN', isDemo: true,
      })
      renderizar()

      let resultado
      await act(async () => {
        resultado = await capturado.atual.login('chefe@email.com', 'senha')
      })

      expect(authService.login).toHaveBeenCalledWith('chefe@email.com', 'senha')
      expect(resultado).toMatchObject({ success: true, isDemo: true, user: { nome: 'Chefe', papel: 'ADMIN' } })
      expect(screen.getByTestId('autenticado')).toHaveTextContent('true')
      expect(screen.getByTestId('admin')).toHaveTextContent('true')
      expect(localStorage.getItem(TOKEN_KEY)).toBe(jwtValido)
      expect(JSON.parse(localStorage.getItem(USER_KEY))).toMatchObject({ nome: 'Chefe' })
    })

    it('assume o papel USER quando o backend nao informa o papel', async () => {
      authService.login.mockResolvedValue({ token: jwtValido, id: 3, nome: 'Bia', email: 'bia@email.com' })
      renderizar()

      await act(async () => {
        await capturado.atual.login('bia@email.com', 'senha')
      })

      expect(capturado.atual.user.papel).toBe('USER')
      expect(screen.getByTestId('admin')).toHaveTextContent('false')
    })

    it('mostra isLoading durante a chamada e volta ao normal depois', async () => {
      let concluir
      authService.login.mockReturnValue(new Promise((resolve) => { concluir = resolve }))
      renderizar()

      let promessa
      act(() => {
        promessa = capturado.atual.login('a@a.com', 'x')
      })
      expect(screen.getByTestId('carregando')).toHaveTextContent('true')

      await act(async () => {
        concluir({ token: jwtValido, id: 1, nome: 'Ana', email: 'a@a.com' })
        await promessa
      })
      expect(screen.getByTestId('carregando')).toHaveTextContent('false')
    })

    it.each([
      ['erro textual', { erro: 'Credenciais invalidas' }, 'Credenciais invalidas'],
      ['erros por campo', { campos: { email: 'Email invalido', senha: 'Senha curta' } }, 'Email invalido. Senha curta'],
      ['campo mensagem', { mensagem: 'Usuario bloqueado' }, 'Usuario bloqueado'],
      ['campo message', { message: 'Blocked' }, 'Blocked'],
      ['resposta sem mensagem conhecida', { outro: 1 }, 'Falha ao realizar login. Verifique seu e-mail e senha.'],
    ])('devolve a mensagem correta para %s', async (_nome, data, esperada) => {
      authService.login.mockRejectedValue({ response: { data } })
      renderizar()

      let resultado
      await act(async () => {
        resultado = await capturado.atual.login('a@a.com', 'x')
      })

      expect(resultado).toEqual({ success: false, error: esperada })
      expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
      expect(screen.getByTestId('carregando')).toHaveTextContent('false')
    })

    it('devolve a mensagem padrao quando nao ha resposta do servidor', async () => {
      authService.login.mockRejectedValue(new Error('rede'))
      renderizar()

      let resultado
      await act(async () => {
        resultado = await capturado.atual.login('a@a.com', 'x')
      })

      expect(resultado.error).toBe('Falha ao realizar login. Verifique seu e-mail e senha.')
    })
  })

  describe('register', () => {
    it('cadastra, autentica e guarda a sessao', async () => {
      authService.register.mockResolvedValue({
        token: jwtValido, id: 5, nome: 'Caio', email: 'caio@email.com', papel: 'USER',
      })
      renderizar()

      let resultado
      await act(async () => {
        resultado = await capturado.atual.register('Caio', 'caio@email.com', 'senha')
      })

      expect(authService.register).toHaveBeenCalledWith('Caio', 'caio@email.com', 'senha')
      expect(resultado).toMatchObject({ success: true, user: { nome: 'Caio' } })
      expect(screen.getByTestId('autenticado')).toHaveTextContent('true')
      expect(localStorage.getItem(TOKEN_KEY)).toBe(jwtValido)
    })

    it('assume o papel USER quando o backend nao informa o papel', async () => {
      authService.register.mockResolvedValue({ token: jwtValido, id: 6, nome: 'Duda', email: 'd@d.com' })
      renderizar()

      await act(async () => {
        await capturado.atual.register('Duda', 'd@d.com', 'senha')
      })

      expect(capturado.atual.user.papel).toBe('USER')
    })

    it.each([
      ['erro textual', { erro: 'E-mail ja cadastrado' }, 'E-mail ja cadastrado'],
      ['erros por campo', { campos: { nome: 'Nome obrigatorio' } }, 'Nome obrigatorio'],
      ['campo message', { message: 'Conflito' }, 'Conflito'],
      ['resposta sem mensagem conhecida', {}, 'Falha ao cadastrar. Tente novamente com outro e-mail.'],
    ])('devolve a mensagem correta para %s', async (_nome, data, esperada) => {
      authService.register.mockRejectedValue({ response: { data } })
      renderizar()

      let resultado
      await act(async () => {
        resultado = await capturado.atual.register('Ana', 'a@a.com', 'x')
      })

      expect(resultado).toEqual({ success: false, error: esperada })
    })

    it('devolve a mensagem padrao quando nao ha resposta do servidor', async () => {
      authService.register.mockRejectedValue(new Error('rede'))
      renderizar()

      let resultado
      await act(async () => {
        resultado = await capturado.atual.register('Ana', 'a@a.com', 'x')
      })

      expect(resultado.error).toBe('Falha ao cadastrar. Tente novamente com outro e-mail.')
    })
  })

  describe('logout', () => {
    it('encerra a sessao e limpa o armazenamento', () => {
      localStorage.setItem(TOKEN_KEY, jwtValido)
      localStorage.setItem(USER_KEY, JSON.stringify(usuarioSalvo))
      renderizar()
      expect(screen.getByTestId('autenticado')).toHaveTextContent('true')

      act(() => {
        capturado.atual.logout()
      })

      expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
      expect(localStorage.getItem(USER_KEY)).toBeNull()
    })

    it('encerra a sessao mesmo se o localStorage lancar erro', () => {
      localStorage.setItem(TOKEN_KEY, jwtValido)
      localStorage.setItem(USER_KEY, JSON.stringify(usuarioSalvo))
      renderizar()
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('sem localStorage')
      })

      act(() => {
        capturado.atual.logout()
      })

      expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
      jest.restoreAllMocks()
    })
  })
})
