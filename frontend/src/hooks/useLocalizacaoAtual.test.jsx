import { act, renderHook } from '@testing-library/react'
import { useLocalizacaoAtual, reiniciarFiliaisDaSessao } from './useLocalizacaoAtual'
import { useAuth } from './useAuth'
import lojaService from '../services/lojaService'

jest.mock('./useAuth', () => ({ useAuth: jest.fn() }))
jest.mock('../services/lojaService', () => ({
  __esModule: true,
  default: { filiaisPublicas: jest.fn() },
}))

const FILIAIS = [
  { mercadoId: 1, mercadoNome: 'Fort Atacadista', lojaId: 11, lojaNome: 'Fort Cachoeirinha', latitude: -29.95, longitude: -51.09 },
]
const PORTO_ALEGRE = { latitude: -30.0346, longitude: -51.2177 }
const SAO_PAULO = { latitude: -23.5505, longitude: -46.6333 }

const MSG_NEGADA = 'Sem permissão de localização. Usando seu CEP.'
const MSG_INDISPONIVEL = 'Não deu para obter sua localização. Usando seu CEP.'
const MSG_FORA_DO_RS = 'Você parece estar fora do RS. Usando seu CEP.'
const MSG_FILIAIS = 'Não foi possível usar sua localização agora. Usando seu CEP.'

const adiada = () => {
  let resolver
  const promessa = new Promise((resolve) => (resolver = resolve))
  return { promessa, resolver }
}

// O navegador de mentira: cada teste decide o que getCurrentPosition devolve.
let getCurrentPosition
const posicaoOk = (coords) => (aoDar) => aoDar({ coords: { ...coords, accuracy: 20 } })
const posicaoComErro = (code) => (_aoDar, aoFalhar) => aoFalhar({ code, message: 'erro de geolocalização' })

const logado = (email = 'ana@email.com') => useAuth.mockReturnValue({ isAuthenticated: true, user: { email } })

beforeEach(() => {
  jest.resetAllMocks()
  reiniciarFiliaisDaSessao()
  getCurrentPosition = jest.fn(posicaoOk(PORTO_ALEGRE))
  Object.defineProperty(global.navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  })
  lojaService.filiaisPublicas.mockResolvedValue(FILIAIS)
  logado()
})

afterEach(() => {
  delete global.navigator.geolocation
})

const clicar = async (result) => {
  await act(async () => {
    await result.current.usar()
  })
}

describe('useLocalizacaoAtual', () => {
  describe('suporte do navegador', () => {
    it('com navigator.geolocation, é suportado e começa ocioso, sem posição nem mensagem', () => {
      const { result } = renderHook(() => useLocalizacaoAtual())

      expect(result.current).toMatchObject({
        suportado: true,
        buscando: false,
        mensagem: null,
        botaoOculto: false,
        posicao: null,
        origem: 'cep',
      })
      expect(getCurrentPosition).not.toHaveBeenCalled()
      expect(lojaService.filiaisPublicas).not.toHaveBeenCalled()
    })

    it('sem navigator.geolocation, não é suportado', () => {
      delete global.navigator.geolocation

      const { result } = renderHook(() => useLocalizacaoAtual())

      expect(result.current.suportado).toBe(false)
    })
  })

  describe('sucesso', () => {
    it('pede a posição com teto de 10 s e sem alta precisão, e guarda a posição e as filiais', async () => {
      const { result } = renderHook(() => useLocalizacaoAtual())

      await clicar(result)

      expect(getCurrentPosition).toHaveBeenCalledTimes(1)
      expect(getCurrentPosition.mock.calls[0][2]).toEqual({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 })
      expect(result.current).toMatchObject({
        posicao: PORTO_ALEGRE,
        filiais: FILIAIS,
        origem: 'navegador',
        buscando: false,
        mensagem: null,
        botaoOculto: false,
      })
      expect(lojaService.filiaisPublicas).toHaveBeenCalledTimes(1)
    })

    it('guarda só latitude e longitude (nada de precisão nem outros campos do navegador)', async () => {
      const { result } = renderHook(() => useLocalizacaoAtual())

      await clicar(result)

      expect(Object.keys(result.current.posicao).sort()).toEqual(['latitude', 'longitude'])
    })

    it('enquanto busca, buscando fica ligado, e um segundo clique é ignorado', async () => {
      const espera = adiada()
      lojaService.filiaisPublicas.mockReturnValue(espera.promessa)
      const { result } = renderHook(() => useLocalizacaoAtual())

      let primeira
      act(() => {
        primeira = result.current.usar()
      })
      expect(result.current.buscando).toBe(true)
      await act(async () => {
        await result.current.usar()
      })
      expect(getCurrentPosition).toHaveBeenCalledTimes(1)

      await act(async () => {
        espera.resolver(FILIAIS)
        await primeira
      })
      expect(result.current.buscando).toBe(false)
    })
  })

  describe('voltar ao CEP e reaproveitar a lista de filiais', () => {
    it('voltarAoCep limpa a posição e a origem volta a ser o CEP', async () => {
      const { result } = renderHook(() => useLocalizacaoAtual())
      await clicar(result)

      act(() => result.current.voltarAoCep())

      expect(result.current).toMatchObject({ posicao: null, origem: 'cep', mensagem: null })
    })

    it('depois de uma chamada bem-sucedida, voltar ao CEP e clicar de novo NÃO refaz a chamada a /lojas/filiais', async () => {
      const { result } = renderHook(() => useLocalizacaoAtual())
      await clicar(result)
      act(() => result.current.voltarAoCep())

      await clicar(result)

      expect(lojaService.filiaisPublicas).toHaveBeenCalledTimes(1)
      expect(getCurrentPosition).toHaveBeenCalledTimes(2) // a posição é lida de novo, a lista não
      expect(result.current).toMatchObject({ posicao: PORTO_ALEGRE, filiais: FILIAIS, origem: 'navegador' })
    })

    it('a lista continua em memória se a tela for desmontada e montada de novo na mesma sessão', async () => {
      const primeira = renderHook(() => useLocalizacaoAtual())
      await clicar(primeira.result)
      primeira.unmount()

      const segunda = renderHook(() => useLocalizacaoAtual())
      await clicar(segunda.result)

      expect(lojaService.filiaisPublicas).toHaveBeenCalledTimes(1)
      expect(segunda.result.current.filiais).toEqual(FILIAIS)
    })
  })

  describe('estados que caem no CEP, sem tocar a rede', () => {
    it('permissão negada: mensagem, sem posição, sem chamar /lojas/filiais, e o botão continua', async () => {
      getCurrentPosition.mockImplementation(posicaoComErro(1))
      const { result } = renderHook(() => useLocalizacaoAtual())

      await clicar(result)

      expect(result.current).toMatchObject({ mensagem: MSG_NEGADA, posicao: null, origem: 'cep', botaoOculto: false, buscando: false })
      expect(lojaService.filiaisPublicas).not.toHaveBeenCalled()
    })

    it.each([
      ['posição indisponível', 2],
      ['tempo esgotado', 3],
    ])('%s: mensagem curta e nenhuma chamada a /lojas/filiais', async (_nome, code) => {
      getCurrentPosition.mockImplementation(posicaoComErro(code))
      const { result } = renderHook(() => useLocalizacaoAtual())

      await clicar(result)

      expect(result.current).toMatchObject({ mensagem: MSG_INDISPONIVEL, posicao: null, botaoOculto: false })
      expect(lojaService.filiaisPublicas).not.toHaveBeenCalled()
    })

    it('fora do RS: mostra o aviso e NÃO guarda posição, então nenhuma distância pode ser calculada', async () => {
      getCurrentPosition.mockImplementation(posicaoOk(SAO_PAULO))
      const { result } = renderHook(() => useLocalizacaoAtual())

      await clicar(result)

      expect(result.current).toMatchObject({ mensagem: MSG_FORA_DO_RS, posicao: null, origem: 'cep', botaoOculto: false })
      expect(result.current.filiais).toEqual([])
      expect(lojaService.filiaisPublicas).not.toHaveBeenCalled()
    })

    it('uma tentativa que deu certo depois de uma falha limpa a mensagem antiga', async () => {
      getCurrentPosition.mockImplementationOnce(posicaoComErro(1))
      const { result } = renderHook(() => useLocalizacaoAtual())
      await clicar(result)
      expect(result.current.mensagem).toBe(MSG_NEGADA)

      await clicar(result)

      expect(result.current).toMatchObject({ mensagem: null, posicao: PORTO_ALEGRE })
    })
  })

  describe('falha no endpoint de filiais: o botão some até recarregar e nada é repetido', () => {
    const erroHttp = (status) => Object.assign(new Error(`status ${status}`), { response: { status } })

    it.each([
      ['429 (muitas requisições)', erroHttp(429)],
      ['500', erroHttp(500)],
      ['503', erroHttp(503)],
      ['erro de rede', new Error('Network Error')],
      ['tempo esgotado', Object.assign(new Error('timeout of 15000ms exceeded'), { code: 'ECONNABORTED' })],
    ])('%s: mensagem, botão oculto, sem posição e uma única chamada', async (_nome, erro) => {
      lojaService.filiaisPublicas.mockRejectedValue(erro)
      const { result } = renderHook(() => useLocalizacaoAtual())

      await clicar(result)

      expect(result.current).toMatchObject({ mensagem: MSG_FILIAIS, botaoOculto: true, posicao: null, origem: 'cep', buscando: false })
      expect(lojaService.filiaisPublicas).toHaveBeenCalledTimes(1)
    })

    it('depois da falha, outro clique não faz nada (nem pede a posição nem chama a API)', async () => {
      lojaService.filiaisPublicas.mockRejectedValue(erroHttp(429))
      const { result } = renderHook(() => useLocalizacaoAtual())
      await clicar(result)

      await clicar(result)
      await clicar(result)

      expect(lojaService.filiaisPublicas).toHaveBeenCalledTimes(1)
      expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    })

    it('a falha vale para a sessão: ao montar de novo o botão continua oculto e a API não é chamada', async () => {
      lojaService.filiaisPublicas.mockRejectedValue(erroHttp(500))
      const primeira = renderHook(() => useLocalizacaoAtual())
      await clicar(primeira.result)
      primeira.unmount()

      const segunda = renderHook(() => useLocalizacaoAtual())
      expect(segunda.result.current.botaoOculto).toBe(true)
      await clicar(segunda.result)

      expect(lojaService.filiaisPublicas).toHaveBeenCalledTimes(1)
    })
  })

  describe('mensagens conforme o usuário tem CEP ou não', () => {
    it('sem CEP configurado, a mensagem não promete "Usando seu CEP"', async () => {
      getCurrentPosition.mockImplementation(posicaoComErro(1))
      const { result } = renderHook(() => useLocalizacaoAtual({ temCep: false }))

      await clicar(result)

      expect(result.current.mensagem).toBe('Sem permissão de localização.')
    })
  })

  describe('a posição não sobrevive à sessão', () => {
    it('no logout a posição some e a origem volta a ser o CEP', async () => {
      const { result, rerender } = renderHook(() => useLocalizacaoAtual())
      await clicar(result)
      expect(result.current.posicao).toEqual(PORTO_ALEGRE)

      useAuth.mockReturnValue({ isAuthenticated: false, user: null })
      rerender()

      expect(result.current).toMatchObject({ posicao: null, origem: 'cep' })
    })

    it('trocar de usuário também zera a posição', async () => {
      const { result, rerender } = renderHook(() => useLocalizacaoAtual())
      await clicar(result)

      logado('outra@email.com')
      rerender()

      expect(result.current.posicao).toBeNull()
    })
  })
})
