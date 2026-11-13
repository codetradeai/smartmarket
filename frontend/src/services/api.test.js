import api, { TEMPO_LIMITE_MS } from './api'
import { ATRASO_AVISO_MS, servidorAcordando } from '../utils/servidorAcordando'

const [interceptorRequisicao] = api.interceptors.request.handlers
const [interceptorResposta] = api.interceptors.response.handlers

describe('api (axios)', () => {
  // Relógio falso em todos os testes: o interceptor de requisição agora arma um temporizador de 8 s
  // (aviso "servidor acordando"), e os testes que não o encerram não podem deixá-lo vivo.
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    localStorage.clear()
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it('usa a URL base padrao do backend Spring Boot e espera ate 200s (cold start do Render)', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:8080/api')
    expect(TEMPO_LIMITE_MS).toBe(200000)
    expect(api.defaults.timeout).toBe(TEMPO_LIMITE_MS)
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

    it('em erro 401 GUARDA os dados privados no namespace do dono em vez de apagar', async () => {
      localStorage.setItem('sm_token', 'abc123')
      localStorage.setItem('sm_user', '{"nome":"Ana","email":"ana@email.com"}')
      localStorage.setItem('sm_owner', 'ana@email.com')
      localStorage.setItem('sm_fav_products', '["p1","p2"]')
      localStorage.setItem('sm_fav_markets', '["3"]')
      localStorage.setItem('sm_price_alerts', '{"p1":10}')
      sessionStorage.setItem('sm_list', '{"itens":[]}')
      window.history.pushState({}, '', '/auth')
      const erro = { response: { status: 401 } }

      await expect(interceptorResposta.rejected(erro)).rejects.toBe(erro)

      // chaves ativas vazias (privacidade) ...
      expect(localStorage.getItem('sm_fav_products')).toBeNull()
      expect(localStorage.getItem('sm_price_alerts')).toBeNull()
      expect(sessionStorage.getItem('sm_list')).toBeNull()
      // ... mas nada foi destruido
      expect(localStorage.getItem('sm_fav_products:ana@email.com')).toBe('["p1","p2"]')
      expect(localStorage.getItem('sm_fav_markets:ana@email.com')).toBe('["3"]')
      expect(localStorage.getItem('sm_price_alerts:ana@email.com')).toBe('{"p1":10}')
      expect(sessionStorage.getItem('sm_list:ana@email.com')).toBe('{"itens":[]}')
    })

    it('senha errada em /auth/login (401) nao apaga sessao nem dados e nao redireciona', async () => {
      window.history.pushState({}, '', '/login')
      localStorage.setItem('sm_token', 'abc123')
      localStorage.setItem('sm_user', '{"nome":"Ana","email":"ana@email.com"}')
      localStorage.setItem('sm_owner', 'ana@email.com')
      localStorage.setItem('sm_fav_products', '["p1"]')
      const consoleErro = jest.spyOn(console, 'error').mockImplementation(() => {})
      const erro = { response: { status: 401 }, config: { url: '/auth/login' } }

      await expect(interceptorResposta.rejected(erro)).rejects.toBe(erro)

      expect(localStorage.getItem('sm_token')).toBe('abc123')
      expect(localStorage.getItem('sm_fav_products')).toBe('["p1"]')
      expect(localStorage.getItem('sm_owner')).toBe('ana@email.com')
      expect(consoleErro).not.toHaveBeenCalled()
    })

    it('401 em /auth/register tambem nao e tratado como sessao expirada', async () => {
      window.history.pushState({}, '', '/register')
      localStorage.setItem('sm_fav_products', '["p1"]')
      localStorage.setItem('sm_owner', 'ana@email.com')
      const consoleErro = jest.spyOn(console, 'error').mockImplementation(() => {})
      const erro = { response: { status: 401 }, config: { url: '/auth/register' } }

      await expect(interceptorResposta.rejected(erro)).rejects.toBe(erro)

      expect(localStorage.getItem('sm_fav_products')).toBe('["p1"]')
      expect(consoleErro).not.toHaveBeenCalled()
    })

    it('401 de outra chamada, estando em /login, continua sendo sessao expirada', async () => {
      window.history.pushState({}, '', '/login')
      localStorage.setItem('sm_token', 'abc123')
      const consoleErro = jest.spyOn(console, 'error').mockImplementation(() => {})
      const erro = { response: { status: 401 }, config: { url: '/favoritos' } }

      await expect(interceptorResposta.rejected(erro)).rejects.toBe(erro)

      expect(localStorage.getItem('sm_token')).toBeNull()
      expect(consoleErro).toHaveBeenCalled()
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

    it('em erro 403 mantem a sessao, nao redireciona e anexa mensagem de permissao', async () => {
      window.history.pushState({}, '', '/admin')
      localStorage.setItem('sm_token', 'abc123')
      localStorage.setItem('sm_user', '{"nome":"Ana"}')
      const consoleErro = jest.spyOn(console, 'error').mockImplementation(() => {})
      const erro = { response: { status: 403 } }

      await expect(interceptorResposta.rejected(erro)).rejects.toBe(erro)

      expect(erro.userMessage).toBe('Você não tem permissão para acessar este recurso.')
      expect(localStorage.getItem('sm_token')).toBe('abc123')
      expect(localStorage.getItem('sm_user')).toBe('{"nome":"Ana"}')
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

  describe('aviso de servidor acordando (chamada que passa de 8 s sem resposta)', () => {
    // Configs das chamadas abertas pelo teste; o afterEach as encerra (encerrar é idempotente)
    // para o estado de módulo do aviso não vazar para o teste seguinte.
    let configs

    const novaRequisicao = () => {
      const config = interceptorRequisicao.fulfilled({ headers: {} })
      configs.push(config)
      return config
    }

    beforeEach(() => {
      configs = []
    })

    afterEach(() => {
      configs.forEach((config) => config.encerrarAvisoDeServidor?.())
    })

    it('o interceptor de requisicao comeca a contar e o aviso fica desligado ate 8 s', () => {
      const config = novaRequisicao()

      jest.advanceTimersByTime(ATRASO_AVISO_MS - 1)

      expect(typeof config.encerrarAvisoDeServidor).toBe('function')
      expect(servidorAcordando()).toBe(false)
    })

    it('liga o aviso apos 8 s sem resposta e a resposta bem sucedida o desliga', () => {
      const config = novaRequisicao()
      jest.advanceTimersByTime(ATRASO_AVISO_MS)
      expect(servidorAcordando()).toBe(true)

      const resposta = { status: 200, data: {}, config }
      expect(interceptorResposta.fulfilled(resposta)).toBe(resposta)

      expect(servidorAcordando()).toBe(false)
    })

    it('uma resposta rapida nunca liga o aviso', () => {
      const config = novaRequisicao()
      jest.advanceTimersByTime(2000)

      interceptorResposta.fulfilled({ status: 200, data: {}, config })
      jest.advanceTimersByTime(ATRASO_AVISO_MS * 2)

      expect(servidorAcordando()).toBe(false)
    })

    it('um erro HTTP (500) tambem desliga o aviso e continua rejeitando o erro', async () => {
      const config = novaRequisicao()
      jest.advanceTimersByTime(ATRASO_AVISO_MS)
      expect(servidorAcordando()).toBe(true)
      const erro = { response: { status: 500 }, config }

      await expect(interceptorResposta.rejected(erro)).rejects.toBe(erro)

      expect(servidorAcordando()).toBe(false)
    })

    it('um erro sem resposta (rede, timeout ou cancelamento) tambem desliga o aviso', async () => {
      const config = novaRequisicao()
      jest.advanceTimersByTime(ATRASO_AVISO_MS)
      const erro = Object.assign(new Error('timeout of 200000ms exceeded'), { code: 'ECONNABORTED', config })

      await expect(interceptorResposta.rejected(erro)).rejects.toBe(erro)

      expect(servidorAcordando()).toBe(false)
    })

    it('resposta ou erro sem config (ex.: falha de configuracao) nao quebram nem mexem no aviso', async () => {
      novaRequisicao()
      jest.advanceTimersByTime(ATRASO_AVISO_MS)
      expect(servidorAcordando()).toBe(true)

      expect(interceptorResposta.fulfilled({ status: 200 })).toEqual({ status: 200 })
      await expect(interceptorResposta.rejected(new Error('falha'))).rejects.toThrow('falha')

      expect(servidorAcordando()).toBe(true)
    })

    it('de ponta a ponta, uma chamada real do axios liga o aviso aos 8 s e o desliga ao receber a resposta', async () => {
      let responder
      const adapter = (config) => {
        configs.push(config)
        return new Promise((resolve) => {
          responder = () => resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config })
        })
      }

      const chamada = api.get('/lento', { adapter })
      await jest.advanceTimersByTimeAsync(ATRASO_AVISO_MS - 1)
      expect(servidorAcordando()).toBe(false)
      await jest.advanceTimersByTimeAsync(1)
      expect(servidorAcordando()).toBe(true)

      responder()

      await expect(chamada).resolves.toMatchObject({ data: { ok: true } })
      expect(servidorAcordando()).toBe(false)
    })

    it('de ponta a ponta, uma chamada real do axios que falha tambem desliga o aviso', async () => {
      let falhar
      const adapter = (config) => {
        configs.push(config)
        return new Promise((_, rejeitar) => {
          falhar = () => rejeitar(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', config }))
        })
      }

      const chamada = api.get('/lento', { adapter })
      const rejeitada = expect(chamada).rejects.toThrow('Network Error')
      await jest.advanceTimersByTimeAsync(ATRASO_AVISO_MS)
      expect(servidorAcordando()).toBe(true)

      falhar()

      await rejeitada
      expect(servidorAcordando()).toBe(false)
    })
  })
})
