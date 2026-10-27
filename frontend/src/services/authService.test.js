import api from './api'
import authService from './authService'

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}))

const erroDeRede = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' })
const erroDoServidor = (status) => Object.assign(new Error('falha'), { response: { status } })

function lerPayload(token) {
  return JSON.parse(atob(token.split('.')[1]))
}

describe('authService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('login', () => {
    it('devolve os dados retornados pelo backend', async () => {
      const dados = { token: 't', nome: 'Ana', papel: 'USER' }
      api.post.mockResolvedValue({ data: dados })

      const resultado = await authService.login('ana@email.com', 'segredo')

      expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'ana@email.com', senha: 'segredo' })
      expect(resultado).toBe(dados)
    })

    it('relanca erros do servidor (ex: credenciais invalidas)', async () => {
      const erro = erroDoServidor(401)
      api.post.mockRejectedValue(erro)

      await expect(authService.login('ana@email.com', 'errada')).rejects.toBe(erro)
    })

    it('com backend offline autentica usuario demo conhecido, sem diferenciar maiusculas', async () => {
      api.post.mockRejectedValue(erroDeRede())

      const resultado = await authService.login('MARIA@email.com', 'qualquer')

      expect(resultado).toMatchObject({
        id: 4,
        nome: 'Maria Santos',
        email: 'maria@email.com',
        papel: 'USER',
        tipo: 'Bearer',
        isDemo: true,
      })
      expect(lerPayload(resultado.token)).toMatchObject({ sub: 'maria@email.com', papel: 'USER' })
    })

    it('com backend offline trata e-mail demo de administrador como ADMIN', async () => {
      api.post.mockRejectedValue(erroDeRede())

      const resultado = await authService.login('davi@smartmarket.com.br', 'x')

      expect(resultado).toMatchObject({ id: 1, papel: 'ADMIN', isDemo: true })
    })

    it('com backend offline cria usuario demo USER para e-mail desconhecido', async () => {
      api.post.mockRejectedValue(erroDeRede())

      const resultado = await authService.login('joao.silva@teste.com', 'x')

      expect(resultado).toMatchObject({ nome: 'joao silva', papel: 'USER', isDemo: true })
    })

    it('com backend offline cria usuario demo ADMIN quando o e-mail contem "admin"', async () => {
      api.post.mockRejectedValue(erroDeRede())

      const resultado = await authService.login('meu.admin@teste.com', 'x')

      expect(resultado.papel).toBe('ADMIN')
    })

    it('considera offline quando o erro nao tem resposta do servidor', async () => {
      api.post.mockRejectedValue(new Error('sem resposta'))

      const resultado = await authService.login('maria@email.com', 'x')

      expect(resultado.isDemo).toBe(true)
    })

    it('considera offline quando o codigo do erro e ECONNREFUSED', async () => {
      const erro = Object.assign(new Error('recusado'), { code: 'ECONNREFUSED', response: {} })
      api.post.mockRejectedValue(erro)

      const resultado = await authService.login('maria@email.com', 'x')

      expect(resultado.isDemo).toBe(true)
    })
  })

  describe('register', () => {
    it('devolve os dados retornados pelo backend', async () => {
      const dados = { token: 't', nome: 'Ana' }
      api.post.mockResolvedValue({ data: dados })

      const resultado = await authService.register('Ana', 'ana@email.com', 'segredo')

      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        nome: 'Ana',
        email: 'ana@email.com',
        senha: 'segredo',
      })
      expect(resultado).toBe(dados)
    })

    it('relanca erros do servidor (ex: e-mail ja cadastrado)', async () => {
      const erro = erroDoServidor(409)
      api.post.mockRejectedValue(erro)

      await expect(authService.register('Ana', 'ana@email.com', 'x')).rejects.toBe(erro)
    })

    it('com backend offline cria um usuario demo USER', async () => {
      api.post.mockRejectedValue(erroDeRede())

      const resultado = await authService.register('Ana', 'ana@email.com', 'x')

      expect(resultado).toMatchObject({ nome: 'Ana', email: 'ana@email.com', papel: 'USER', isDemo: true })
      expect(lerPayload(resultado.token)).toMatchObject({ sub: 'ana@email.com', nome: 'Ana' })
    })
  })

  describe('getProfile', () => {
    it('busca o perfil do usuario autenticado', async () => {
      api.get.mockResolvedValue({ data: { nome: 'Ana' } })

      const perfil = await authService.getProfile()

      expect(api.get).toHaveBeenCalledWith('/auth/me')
      expect(perfil).toEqual({ nome: 'Ana' })
    })
  })
})
