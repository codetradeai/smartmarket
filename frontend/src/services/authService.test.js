import api from './api'
import authService, { MSG_SEM_SERVIDOR, atalhosDemoHabilitados, credenciaisDemo } from './authService'

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

    it('com backend offline e demo desligado (padrao) mostra mensagem clara e nao gera token', async () => {
      api.post.mockRejectedValue(erroDeRede())

      const erro = await authService.login('davi@smartmarket.com.br', 'admin123').catch((e) => e)

      expect(erro.userMessage).toBe(MSG_SEM_SERVIDOR)
      expect(MSG_SEM_SERVIDOR).toMatch(/^Não foi possível falar com o servidor/)
    })

    it('considera offline quando o erro nao tem resposta ou o codigo e ECONNREFUSED', async () => {
      api.post.mockRejectedValueOnce(new Error('sem resposta'))
      await expect(authService.login('maria@email.com', 'user123')).rejects.toMatchObject({ userMessage: MSG_SEM_SERVIDOR })

      api.post.mockRejectedValueOnce(Object.assign(new Error('recusado'), { code: 'ECONNREFUSED', response: {} }))
      await expect(authService.login('maria@email.com', 'user123')).rejects.toMatchObject({ userMessage: MSG_SEM_SERVIDOR })
    })

    describe('com VITE_ENABLE_DEMO_LOGIN=true', () => {
      beforeEach(() => {
        process.env.VITE_ENABLE_DEMO_LOGIN = 'true'
      })
      afterEach(() => {
        delete process.env.VITE_ENABLE_DEMO_LOGIN
      })

      it('autentica usuario demo conhecido com a senha certa, sem diferenciar maiusculas no e-mail', async () => {
        api.post.mockRejectedValue(erroDeRede())

        const resultado = await authService.login('MARIA@email.com', 'user123')

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

      it('trata e-mail demo de administrador como ADMIN apenas com a senha certa', async () => {
        api.post.mockRejectedValue(erroDeRede())

        const resultado = await authService.login('davi@smartmarket.com.br', 'admin123')

        expect(resultado).toMatchObject({ id: 1, papel: 'ADMIN', isDemo: true })
      })

      it('rejeita senha errada de usuario demo', async () => {
        api.post.mockRejectedValue(erroDeRede())

        await expect(authService.login('davi@smartmarket.com.br', 'errada')).rejects.toMatchObject({
          userMessage: MSG_SEM_SERVIDOR,
        })
      })

      it('nunca cria usuario nem admin para e-mail desconhecido (ex: contendo "admin")', async () => {
        api.post.mockRejectedValue(erroDeRede())

        await expect(authService.login('meu.admin@teste.com', 'x')).rejects.toMatchObject({
          userMessage: MSG_SEM_SERVIDOR,
        })
        await expect(authService.login('joao.silva@teste.com', 'x')).rejects.toMatchObject({
          userMessage: MSG_SEM_SERVIDOR,
        })
      })

      it('cadastro offline cria um usuario demo USER', async () => {
        api.post.mockRejectedValue(erroDeRede())

        const resultado = await authService.register('Ana', 'ana@email.com', 'x')

        expect(resultado).toMatchObject({ nome: 'Ana', email: 'ana@email.com', papel: 'USER', isDemo: true })
        expect(lerPayload(resultado.token)).toMatchObject({ sub: 'ana@email.com', nome: 'Ana' })
      })
    })
  })

  describe('register', () => {
    it('devolve os dados retornados pelo backend', async () => {
      const dados = { token: 't', nome: 'Ana' }
      api.post.mockResolvedValue({ data: dados })

      const resultado = await authService.register('Ana', 'ana@email.com', 'segredo', '90010000')

      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        nome: 'Ana',
        email: 'ana@email.com',
        senha: 'segredo',
        cep: '90010000',
      })
      expect(resultado).toBe(dados)
    })

    it('envia só os dígitos do CEP, mesmo se chegar com máscara', async () => {
      api.post.mockResolvedValue({ data: {} })

      await authService.register('Ana', 'ana@email.com', 'segredo', '90010-000')

      expect(api.post.mock.calls[0][1].cep).toBe('90010000')
    })

    it('relanca erros do servidor (ex: e-mail ja cadastrado)', async () => {
      const erro = erroDoServidor(409)
      api.post.mockRejectedValue(erro)

      await expect(authService.register('Ana', 'ana@email.com', 'x')).rejects.toBe(erro)
    })

    it('com backend offline e demo desligado mostra mensagem clara e nao gera token', async () => {
      api.post.mockRejectedValue(erroDeRede())

      await expect(authService.register('Ana', 'ana@email.com', 'x')).rejects.toMatchObject({
        userMessage: MSG_SEM_SERVIDOR,
      })
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

  describe('atalhos de demonstracao', () => {
    afterEach(() => {
      delete process.env.VITE_ENABLE_DEMO_LOGIN
      delete process.env.DEV
    })

    it('ficam desligados por padrao (build de producao) e nao entregam credenciais', async () => {
      expect(atalhosDemoHabilitados()).toBe(false)
      await expect(credenciaisDemo('admin')).resolves.toBeNull()
      await expect(credenciaisDemo('user')).resolves.toBeNull()
    })

    it('ligam em desenvolvimento (import.meta.env.DEV)', async () => {
      process.env.DEV = '1'

      expect(atalhosDemoHabilitados()).toBe(true)
      await expect(credenciaisDemo('admin')).resolves.toEqual({
        email: 'davi@smartmarket.com.br',
        senha: 'admin123',
      })
    })

    it('ligam com VITE_ENABLE_DEMO_LOGIN=true e devolvem o perfil comum para "user"', async () => {
      process.env.VITE_ENABLE_DEMO_LOGIN = 'true'

      expect(atalhosDemoHabilitados()).toBe(true)
      await expect(credenciaisDemo('user')).resolves.toEqual({ email: 'maria@email.com', senha: 'user123' })
    })

    it('qualquer outro valor da flag mantem desligado', () => {
      process.env.VITE_ENABLE_DEMO_LOGIN = '1'

      expect(atalhosDemoHabilitados()).toBe(false)
    })

    it('o DEV sozinho nao liga o fallback de login offline (continua opt-in pela flag)', async () => {
      process.env.DEV = '1'
      api.post.mockRejectedValue(erroDeRede())

      await expect(authService.login('davi@smartmarket.com.br', 'admin123')).rejects.toMatchObject({
        userMessage: MSG_SEM_SERVIDOR,
      })
    })
  })
})
