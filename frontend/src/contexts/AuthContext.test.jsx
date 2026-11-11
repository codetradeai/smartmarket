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

    it('token expirado so invalida a sessao: favoritos e alertas ficam guardados para o dono', () => {
      localStorage.setItem(TOKEN_KEY, jwtExpirado)
      localStorage.setItem(USER_KEY, JSON.stringify(usuarioSalvo))
      localStorage.setItem('sm_owner', 'ana@email.com')
      localStorage.setItem('sm_fav_products', '["p1","p2"]')
      localStorage.setItem('sm_price_alerts', '{"p1":10}')

      renderizar()

      expect(localStorage.getItem('sm_fav_products')).toBeNull()
      expect(localStorage.getItem('sm_fav_products:ana@email.com')).toBe('["p1","p2"]')
      expect(localStorage.getItem('sm_price_alerts:ana@email.com')).toBe('{"p1":10}')
    })

    it('descarta token sem data de expiracao ou fora do formato JWT', () => {
      localStorage.setItem(TOKEN_KEY, criarJwt({ sub: 'ana' }))
      localStorage.setItem(USER_KEY, JSON.stringify(usuarioSalvo))
      const { unmount } = renderizar()
      expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
      unmount()

      localStorage.setItem(TOKEN_KEY, 'token-sem-pontos')
      localStorage.setItem(USER_KEY, JSON.stringify(usuarioSalvo))
      renderizar()
      expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
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

    it('usa a mensagem de falta de conexao (userMessage) no login e no cadastro', async () => {
      const msg = 'Não foi possível falar com o servidor. Tente novamente.'
      authService.login.mockRejectedValue(Object.assign(new Error('rede'), { userMessage: msg }))
      authService.register.mockRejectedValue(Object.assign(new Error('rede'), { userMessage: msg }))
      renderizar()

      let login
      let cadastro
      await act(async () => {
        login = await capturado.atual.login('a@a.com', 'x')
        cadastro = await capturado.atual.register('A', 'a@a.com', 'x')
      })

      expect(login).toEqual({ success: false, error: msg })
      expect(cadastro).toEqual({ success: false, error: msg })
    })

    it('grava sm_owner com o email do usuario apos login bem-sucedido', async () => {
      authService.login.mockResolvedValue({
        token: jwtValido, id: 2, nome: 'Chefe', email: 'chefe@email.com', papel: 'USER',
      })
      renderizar()

      await act(async () => {
        await capturado.atual.login('chefe@email.com', 'senha')
      })

      expect(localStorage.getItem('sm_owner')).toBe('chefe@email.com')
    })

    it('login de B depois de A sem logout nao leva dados de A, que ficam guardados para A', async () => {
      localStorage.setItem('sm_owner', 'a@email.com')
      localStorage.setItem('sm_fav_products', '["10","11"]')
      localStorage.setItem('sm_fav_markets', '["3"]')
      localStorage.setItem('sm_price_alerts', '{"10":5}')
      sessionStorage.setItem('sm_list', '{"itens":[]}')

      authService.login.mockResolvedValue({
        token: jwtValido, id: 99, nome: 'B', email: 'b@email.com', papel: 'USER',
      })
      renderizar()

      await act(async () => {
        await capturado.atual.login('b@email.com', 'senha')
      })

      expect(localStorage.getItem('sm_fav_products')).toBeNull()
      expect(localStorage.getItem('sm_fav_markets')).toBeNull()
      expect(localStorage.getItem('sm_price_alerts')).toBeNull()
      expect(sessionStorage.getItem('sm_list')).toBeNull()
      expect(localStorage.getItem('sm_owner')).toBe('b@email.com')
      expect(localStorage.getItem('sm_fav_products:a@email.com')).toBe('["10","11"]')
      expect(localStorage.getItem('sm_price_alerts:a@email.com')).toBe('{"10":5}')
    })

    it('A favorita, sai, B entra e ve vazio, A volta e ve os dados dele (login e logout reais)', async () => {
      authService.login.mockImplementation(async (email) => ({
        token: jwtValido, id: email === 'a@email.com' ? 1 : 2, nome: email, email, papel: 'USER',
      }))
      renderizar()

      await act(async () => {
        await capturado.atual.login('a@email.com', 'senha')
      })
      localStorage.setItem('sm_fav_products', '["p1","p2"]')
      localStorage.setItem('sm_price_alerts', '{"p1":9.9}')
      sessionStorage.setItem('sm_list', '{"itens":["leite"]}')

      act(() => {
        capturado.atual.logout()
      })
      await act(async () => {
        await capturado.atual.login('b@email.com', 'senha')
      })

      expect(localStorage.getItem('sm_fav_products')).toBeNull()
      expect(localStorage.getItem('sm_price_alerts')).toBeNull()
      expect(sessionStorage.getItem('sm_list')).toBeNull()

      act(() => {
        capturado.atual.logout()
      })
      await act(async () => {
        await capturado.atual.login('a@email.com', 'senha')
      })

      expect(JSON.parse(localStorage.getItem('sm_fav_products'))).toEqual(['p1', 'p2'])
      expect(JSON.parse(localStorage.getItem('sm_price_alerts'))).toEqual({ p1: 9.9 })
      expect(sessionStorage.getItem('sm_list')).toBe('{"itens":["leite"]}')
    })

    it('cadastro de outro usuario por cima de uma conta tambem isola os dados', async () => {
      localStorage.setItem('sm_owner', 'a@email.com')
      localStorage.setItem('sm_fav_products', '["10"]')
      authService.register.mockResolvedValue({
        token: jwtValido, id: 7, nome: 'Novo', email: 'novo@email.com', papel: 'USER',
      })
      renderizar()

      await act(async () => {
        await capturado.atual.register('Novo', 'novo@email.com', 'senha')
      })

      expect(localStorage.getItem('sm_fav_products')).toBeNull()
      expect(localStorage.getItem('sm_fav_products:a@email.com')).toBe('["10"]')
      expect(localStorage.getItem('sm_owner')).toBe('novo@email.com')
    })

    it('login do mesmo usuario nao limpa os dados locais', async () => {
      localStorage.setItem('sm_owner', 'ana@email.com')
      localStorage.setItem('sm_fav_products', '["10","11"]')

      authService.login.mockResolvedValue({
        token: jwtValido, id: 1, nome: 'Ana', email: 'ana@email.com', papel: 'USER',
      })
      renderizar()

      await act(async () => {
        await capturado.atual.login('ana@email.com', 'senha')
      })

      expect(JSON.parse(localStorage.getItem('sm_fav_products'))).toEqual(['10', '11'])
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

      expect(authService.register).toHaveBeenCalledWith('Caio', 'caio@email.com', 'senha', undefined)
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

    it('devolve a mensagem e os campos inválidos quando o backend valida por campo', async () => {
      const campos = { nome: 'Nome obrigatorio', cep: 'CEP inválido' }
      authService.register.mockRejectedValue({ response: { status: 400, data: { campos } } })
      renderizar()

      let resultado
      await act(async () => {
        resultado = await capturado.atual.register('', 'a@a.com', 'x', '123')
      })

      expect(resultado).toEqual({ success: false, error: 'Nome obrigatorio. CEP inválido', campos })
    })

    it('repassa o CEP ao serviço de cadastro', async () => {
      authService.register.mockResolvedValue({
        token: jwtValido, id: 5, nome: 'Caio', email: 'caio@email.com', papel: 'USER',
      })
      renderizar()

      await act(async () => {
        await capturado.atual.register('Caio', 'caio@email.com', 'senha', '90010000')
      })

      expect(authService.register).toHaveBeenCalledWith('Caio', 'caio@email.com', 'senha', '90010000')
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

    it('logout NAO apaga: esvazia as chaves ativas, guarda no namespace do dono e remove sm_owner', () => {
      localStorage.setItem(TOKEN_KEY, jwtValido)
      localStorage.setItem(USER_KEY, JSON.stringify(usuarioSalvo))
      localStorage.setItem('sm_owner', 'ana@email.com')
      localStorage.setItem('sm_fav_products', '["1","2"]')
      localStorage.setItem('sm_fav_markets', '["3"]')
      localStorage.setItem('sm_price_alerts', '{"1":10}')
      sessionStorage.setItem('sm_list', '{"itens":[]}')
      renderizar()

      act(() => {
        capturado.atual.logout()
      })

      expect(localStorage.getItem('sm_fav_products')).toBeNull()
      expect(localStorage.getItem('sm_fav_markets')).toBeNull()
      expect(localStorage.getItem('sm_price_alerts')).toBeNull()
      expect(sessionStorage.getItem('sm_list')).toBeNull()
      expect(localStorage.getItem('sm_owner')).toBeNull()
      expect(localStorage.getItem('sm_fav_products:ana@email.com')).toBe('["1","2"]')
      expect(localStorage.getItem('sm_fav_markets:ana@email.com')).toBe('["3"]')
      expect(localStorage.getItem('sm_price_alerts:ana@email.com')).toBe('{"1":10}')
      expect(sessionStorage.getItem('sm_list:ana@email.com')).toBe('{"itens":[]}')
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
