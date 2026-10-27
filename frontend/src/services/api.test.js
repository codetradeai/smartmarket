import api from './api'

const [interceptorRequisicao] = api.interceptors.request.handlers
const [interceptorResposta] = api.interceptors.response.handlers

describe('api (axios)', () => {
  afterEach(() => {
    localStorage.clear()
    jest.restoreAllMocks()
  })

  it('usa a URL base padrao do backend Spring Boot e timeout de 10s', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:8080/api')
    expect(api.defaults.timeout).toBe(10000)
    expect(api.defaults.headers['Content-Type']).toBe('application/json')
  })

  describe('interceptor de requisicao', () => {
    it('injeta o token JWT guardado no localStorage', () => {
      localStorage.setItem('sm_token', 'abc123')

      const config = interceptorRequisicao.fulfilled({ headers: {} })

      expect(config.headers.Authorization).toBe('Bearer abc123')
    })

    it('nao envia Authorization quando nao ha token', () => {
      const config = interceptorRequisicao.fulfilled({ headers: {} })

      expect(config.headers.Authorization).toBeUndefined()
    })

    it('ignora falhas ao ler o localStorage', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('sem localStorage')
      })

      const config = interceptorRequisicao.fulfilled({ headers: {} })

      expect(config.headers.Authorization).toBeUndefined()
    })

    it('repassa o erro de configuracao como rejeicao', async () => {
      const erro = new Error('falha')

      await expect(interceptorRequisicao.rejected(erro)).rejects.toBe(erro)
    })
  })

  describe('interceptor de resposta', () => {
    it('devolve respostas bem sucedidas sem alterar', () => {
      const resposta = { status: 200, data: { ok: true } }

      expect(interceptorResposta.fulfilled(resposta)).toBe(resposta)
    })

    it('em erro 401 limpa a sessao e rejeita o erro', async () => {
      localStorage.setItem('sm_token', 'abc123')
      localStorage.setItem('sm_user', '{"nome":"Ana"}')
      window.history.pushState({}, '', '/auth')
      const erro = { response: { status: 401 } }

      await expect(interceptorResposta.rejected(erro)).rejects.toBe(erro)

      expect(localStorage.getItem('sm_token')).toBeNull()
      expect(localStorage.getItem('sm_user')).toBeNull()
    })

    it('em erro 401 fora da tela de login tenta redirecionar para o login', async () => {
      window.history.pushState({}, '', '/catalog')
      const consoleErro = jest.spyOn(console, 'error').mockImplementation(() => {})

      await expect(interceptorResposta.rejected({ response: { status: 401 } })).rejects.toBeDefined()

      // O jsdom nao implementa navegacao: a tentativa de ir para /auth aparece como aviso.
      expect(consoleErro).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Not implemented: navigation') })
      )
    })

    it('em erro 401 dentro de /auth nao tenta redirecionar', async () => {
      window.history.pushState({}, '', '/auth')
      const consoleErro = jest.spyOn(console, 'error').mockImplementation(() => {})

      await expect(interceptorResposta.rejected({ response: { status: 401 } })).rejects.toBeDefined()

      expect(consoleErro).not.toHaveBeenCalled()
    })

    it('em outros erros mantem a sessao e rejeita o erro', async () => {
      localStorage.setItem('sm_token', 'abc123')
      const erro = { response: { status: 500 } }

      await expect(interceptorResposta.rejected(erro)).rejects.toBe(erro)

      expect(localStorage.getItem('sm_token')).toBe('abc123')
    })

    it('rejeita erros sem resposta (rede) sem quebrar', async () => {
      const erro = new Error('Network Error')

      await expect(interceptorResposta.rejected(erro)).rejects.toBe(erro)
    })

    it('ignora falhas ao limpar o localStorage no 401', async () => {
      window.history.pushState({}, '', '/auth')
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('sem localStorage')
      })

      await expect(interceptorResposta.rejected({ response: { status: 401 } })).rejects.toBeDefined()
    })
  })
})
