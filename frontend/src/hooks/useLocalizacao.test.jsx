import { act, renderHook, waitFor } from '@testing-library/react'
import { useLocalizacao } from './useLocalizacao'
import { useAuth } from './useAuth'
import lojaService from '../services/lojaService'

jest.mock('./useAuth', () => ({ useAuth: jest.fn() }))
jest.mock('../services/lojaService', () => ({
  __esModule: true,
  default: {
    obterLocalizacao: jest.fn(),
    lojasProximas: jest.fn(),
    trocarCep: jest.fn(),
    excluirLocalizacao: jest.fn(),
    definirLojaPreferida: jest.fn(),
  },
}))

const estadoVazio = { localizacao: null, lojas: [], carregando: false, erro: null }

const erroDoServidor = (status) => Object.assign(new Error(`status ${status}`), { response: { status } })
const erroDeRede = () => new Error('Network Error')

const LOCALIZACAO = {
  cep: '90010000',
  cidade: 'Porto Alegre',
  uf: 'RS',
  latitude: -30.0277,
  longitude: -51.2287,
  resolvida: true,
  lojaPreferidaId: null,
}
const LOCALIZACAO_NOVA = { ...LOCALIZACAO, cep: '01001000', cidade: 'São Paulo', uf: 'SP' }
const LOJAS = [
  { mercadoId: 1, mercadoNome: 'Fort Atacadista', lojaId: 11, distanciaKm: 1.2 },
  { mercadoId: 2, mercadoNome: 'Zaffari / Bourbon', lojaId: 21, distanciaKm: 3.4 },
]
const LOJAS_NOVAS = [{ mercadoId: 3, mercadoNome: 'Carrefour Mercado', lojaId: 31, distanciaKm: 0.8 }]

describe('useLocalizacao', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    useAuth.mockReturnValue({ isAuthenticated: true })
  })

  describe('desligado', () => {
    it.each([
      ['ativo é false', { ativo: false }, true],
      ['o usuário não está autenticado', undefined, false],
    ])('quando %s, não chama a API e devolve o estado vazio', (_motivo, opcoes, autenticado) => {
      useAuth.mockReturnValue({ isAuthenticated: autenticado })

      const { result } = renderHook(() => useLocalizacao(opcoes))

      expect(result.current).toEqual(expect.objectContaining(estadoVazio))
      expect(lojaService.obterLocalizacao).not.toHaveBeenCalled()
      expect(lojaService.lojasProximas).not.toHaveBeenCalled()
    })
  })

  describe('ligado', () => {
    it('chama as duas, carregando vai de true a false e expõe localizacao e lojas', async () => {
      lojaService.obterLocalizacao.mockResolvedValue(LOCALIZACAO)
      lojaService.lojasProximas.mockResolvedValue(LOJAS)

      const { result } = renderHook(() => useLocalizacao())

      expect(result.current.carregando).toBe(true)
      await waitFor(() => expect(result.current.carregando).toBe(false))
      expect(result.current.localizacao).toEqual(LOCALIZACAO)
      expect(result.current.lojas).toEqual(LOJAS)
      expect(result.current.erro).toBeNull()
      expect(lojaService.obterLocalizacao).toHaveBeenCalledTimes(1)
      expect(lojaService.lojasProximas).toHaveBeenCalledTimes(1)
    })

    it('se lojasProximas falha e obterLocalizacao funciona, usa a localização, lojas fica [] e erro vem em texto', async () => {
      lojaService.obterLocalizacao.mockResolvedValue(LOCALIZACAO)
      lojaService.lojasProximas.mockRejectedValue(erroDoServidor(503))

      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      expect(result.current.localizacao).toEqual(LOCALIZACAO)
      expect(result.current.lojas).toEqual([])
      expect(result.current.erro).toBe('Erro 503 do servidor.')
    })

    it('se as duas falham por rede, o estado fica vazio, o erro vem preenchido e nada é lançado', async () => {
      lojaService.obterLocalizacao.mockRejectedValue(erroDeRede())
      lojaService.lojasProximas.mockRejectedValue(erroDeRede())

      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      expect(result.current).toEqual(
        expect.objectContaining({
          localizacao: null,
          lojas: [],
          erro: 'Sem resposta do servidor. Verifique sua conexão e tente novamente.',
        }),
      )
    })

    it('o erro é o da primeira falha (obterLocalizacao vem antes de lojasProximas)', async () => {
      lojaService.obterLocalizacao.mockRejectedValue(erroDoServidor(500))
      lojaService.lojasProximas.mockRejectedValue(erroDeRede())

      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      expect(result.current.erro).toBe('Erro 500 do servidor.')
    })
  })

  describe('privacidade e estabilidade', () => {
    const usarTudo = async (result) => {
      await act(async () => {
        await result.current.trocarCep('01001000')
        await result.current.definirLojaPreferida(7)
        await result.current.excluir()
        await result.current.recarregar()
      })
    }
    const prepararApi = () => {
      lojaService.obterLocalizacao.mockResolvedValue(LOCALIZACAO)
      lojaService.lojasProximas.mockResolvedValue(LOJAS)
      lojaService.trocarCep.mockResolvedValue(LOCALIZACAO_NOVA)
      lojaService.definirLojaPreferida.mockResolvedValue(LOCALIZACAO)
      lojaService.excluirLocalizacao.mockResolvedValue(undefined)
    }

    it('Storage.prototype.setItem e getItem nunca são chamados', async () => {
      const lerItem = jest.spyOn(Storage.prototype, 'getItem')
      const gravarItem = jest.spyOn(Storage.prototype, 'setItem')
      prepararApi()
      try {
        const { result } = renderHook(() => useLocalizacao())
        await waitFor(() => expect(result.current.carregando).toBe(false))
        await usarTudo(result)

        expect(lerItem).not.toHaveBeenCalled()
        expect(gravarItem).not.toHaveBeenCalled()
      } finally {
        lerItem.mockRestore()
        gravarItem.mockRestore()
      }
    })

    it('não escreve nada no console (o CEP não pode vazar em log)', async () => {
      const espioes = ['log', 'info', 'warn', 'error', 'debug'].map((metodo) =>
        jest.spyOn(console, metodo).mockImplementation(() => {}),
      )
      prepararApi()
      try {
        const { result } = renderHook(() => useLocalizacao())
        await waitFor(() => expect(result.current.carregando).toBe(false))
        await usarTudo(result)

        espioes.forEach((espiao) => expect(espiao).not.toHaveBeenCalled())
      } finally {
        espioes.forEach((espiao) => espiao.mockRestore())
      }
    })

    it('as funções devolvidas mantêm a mesma identidade entre renders', async () => {
      prepararApi()
      const { result, rerender } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      const { recarregar, trocarCep, excluir, definirLojaPreferida } = result.current

      rerender()
      await usarTudo(result)

      expect(result.current.recarregar).toBe(recarregar)
      expect(result.current.trocarCep).toBe(trocarCep)
      expect(result.current.excluir).toBe(excluir)
      expect(result.current.definirLojaPreferida).toBe(definirLojaPreferida)
    })
  })

  describe('logout', () => {
    it('quando isAuthenticated vira false, localizacao, lojas e erro são limpos', async () => {
      lojaService.obterLocalizacao.mockResolvedValue(LOCALIZACAO)
      lojaService.lojasProximas.mockRejectedValue(erroDoServidor(500))
      const { result, rerender } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      expect(result.current.localizacao).toEqual(LOCALIZACAO)
      expect(result.current.erro).not.toBeNull()

      useAuth.mockReturnValue({ isAuthenticated: false })
      rerender()

      expect(result.current).toEqual(expect.objectContaining(estadoVazio))
    })

    it('ao entrar de novo, os dados do usuário anterior não aparecem enquanto a nova carga não responde', async () => {
      lojaService.obterLocalizacao.mockResolvedValueOnce(LOCALIZACAO).mockReturnValueOnce(new Promise(() => {}))
      lojaService.lojasProximas.mockResolvedValueOnce(LOJAS).mockReturnValueOnce(new Promise(() => {}))
      const { result, rerender } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      useAuth.mockReturnValue({ isAuthenticated: false })
      rerender()
      useAuth.mockReturnValue({ isAuthenticated: true })
      rerender()

      expect(result.current).toEqual(expect.objectContaining({ localizacao: null, lojas: [], erro: null, carregando: true }))
    })
  })

  describe('respostas atrasadas', () => {
    const adiada = () => {
      let resolver
      const promessa = new Promise((resolve) => (resolver = resolve))
      return { promessa, resolver }
    }

    it('a carga do usuário que saiu, ao responder depois do login de outro, é descartada', async () => {
      const locA = adiada()
      const lojasA = adiada()
      const locB = adiada()
      const lojasB = adiada()
      lojaService.obterLocalizacao.mockReturnValueOnce(locA.promessa).mockReturnValueOnce(locB.promessa)
      lojaService.lojasProximas.mockReturnValueOnce(lojasA.promessa).mockReturnValueOnce(lojasB.promessa)
      const { result, rerender } = renderHook(() => useLocalizacao())

      useAuth.mockReturnValue({ isAuthenticated: false })
      rerender()
      useAuth.mockReturnValue({ isAuthenticated: true })
      rerender()
      await act(async () => {
        locA.resolver(LOCALIZACAO)
        lojasA.resolver(LOJAS)
      })

      expect(result.current).toEqual(expect.objectContaining({ localizacao: null, lojas: [], carregando: true }))

      await act(async () => {
        locB.resolver(LOCALIZACAO_NOVA)
        lojasB.resolver(LOJAS_NOVAS)
      })

      expect(result.current).toEqual(
        expect.objectContaining({ localizacao: LOCALIZACAO_NOVA, lojas: LOJAS_NOVAS, carregando: false }),
      )
    })

    it('trocarCep que responde depois do logout e de um novo login não mexe no estado do novo usuário', async () => {
      const troca = adiada()
      lojaService.obterLocalizacao.mockResolvedValueOnce(LOCALIZACAO).mockReturnValueOnce(new Promise(() => {}))
      lojaService.lojasProximas.mockResolvedValueOnce(LOJAS).mockReturnValueOnce(new Promise(() => {}))
      lojaService.trocarCep.mockReturnValue(troca.promessa)
      const { result, rerender } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      let pendente
      act(() => {
        pendente = result.current.trocarCep('01001000')
      })
      useAuth.mockReturnValue({ isAuthenticated: false })
      rerender()
      useAuth.mockReturnValue({ isAuthenticated: true })
      rerender()
      await act(async () => {
        troca.resolver(LOCALIZACAO_NOVA)
        await pendente
      })

      expect(result.current.localizacao).toBeNull()
      expect(lojaService.lojasProximas).toHaveBeenCalledTimes(2)
    })

    it('lojas recarregadas depois de um trocarCep, ao responder após logout e novo login, são descartadas', async () => {
      const lojasDaTroca = adiada()
      lojaService.obterLocalizacao.mockResolvedValueOnce(LOCALIZACAO).mockReturnValueOnce(new Promise(() => {}))
      lojaService.lojasProximas
        .mockResolvedValueOnce(LOJAS)
        .mockReturnValueOnce(lojasDaTroca.promessa)
        .mockReturnValueOnce(new Promise(() => {}))
      lojaService.trocarCep.mockResolvedValue(LOCALIZACAO_NOVA)
      const { result, rerender } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      let pendente
      await act(async () => {
        pendente = result.current.trocarCep('01001000')
      })
      useAuth.mockReturnValue({ isAuthenticated: false })
      rerender()
      useAuth.mockReturnValue({ isAuthenticated: true })
      rerender()
      await act(async () => {
        lojasDaTroca.resolver(LOJAS_NOVAS)
        await pendente
      })

      expect(result.current).toEqual(expect.objectContaining({ localizacao: null, lojas: [], carregando: true }))
    })

    it('resposta que chega depois do desmonte não gera aviso', async () => {
      const aviso = jest.spyOn(console, 'error').mockImplementation(() => {})
      const loc = adiada()
      const lojas = adiada()
      lojaService.obterLocalizacao.mockReturnValue(loc.promessa)
      lojaService.lojasProximas.mockReturnValue(lojas.promessa)
      const { unmount } = renderHook(() => useLocalizacao())

      unmount()
      await act(async () => {
        loc.resolver(LOCALIZACAO)
        lojas.resolver(LOJAS)
      })

      expect(aviso).not.toHaveBeenCalled()
      aviso.mockRestore()
    })
  })

  describe('recarregar', () => {
    it('refaz as duas chamadas e carregando fica true só enquanto elas não respondem', async () => {
      lojaService.obterLocalizacao.mockResolvedValueOnce(LOCALIZACAO).mockResolvedValueOnce(LOCALIZACAO_NOVA)
      let responderLojas
      lojaService.lojasProximas
        .mockResolvedValueOnce(LOJAS)
        .mockReturnValueOnce(new Promise((resolve) => (responderLojas = resolve)))
      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      let recarga
      act(() => {
        recarga = result.current.recarregar()
      })
      expect(result.current.carregando).toBe(true)

      await act(async () => {
        responderLojas(LOJAS_NOVAS)
        await recarga
      })

      expect(result.current.carregando).toBe(false)
      expect(result.current.localizacao).toEqual(LOCALIZACAO_NOVA)
      expect(result.current.lojas).toEqual(LOJAS_NOVAS)
      expect(lojaService.obterLocalizacao).toHaveBeenCalledTimes(2)
      expect(lojaService.lojasProximas).toHaveBeenCalledTimes(2)
    })
  })

  describe('excluir', () => {
    it('com sucesso, chama excluirLocalizacao e recarrega as duas', async () => {
      lojaService.obterLocalizacao.mockResolvedValueOnce(LOCALIZACAO).mockResolvedValueOnce(null)
      lojaService.lojasProximas.mockResolvedValueOnce(LOJAS).mockResolvedValueOnce([])
      lojaService.excluirLocalizacao.mockResolvedValue(undefined)
      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      await act(async () => {
        await result.current.excluir()
      })

      expect(lojaService.excluirLocalizacao).toHaveBeenCalledTimes(1)
      expect(lojaService.obterLocalizacao).toHaveBeenCalledTimes(2)
      expect(lojaService.lojasProximas).toHaveBeenCalledTimes(2)
      expect(result.current.localizacao).toBeNull()
      expect(result.current.lojas).toEqual([])
    })

    it('com falha, relança o mesmo erro e não recarrega nem muda o estado', async () => {
      lojaService.obterLocalizacao.mockResolvedValue(LOCALIZACAO)
      lojaService.lojasProximas.mockResolvedValue(LOJAS)
      const erro = erroDoServidor(500)
      lojaService.excluirLocalizacao.mockRejectedValue(erro)
      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      let rejeitado
      await act(async () => {
        rejeitado = await result.current.excluir().catch((e) => e)
      })

      expect(rejeitado).toBe(erro)
      expect(result.current.localizacao).toEqual(LOCALIZACAO)
      expect(result.current.lojas).toEqual(LOJAS)
      expect(lojaService.obterLocalizacao).toHaveBeenCalledTimes(1)
    })
  })

  describe('definirLojaPreferida', () => {
    it('com sucesso, localizacao passa a ser a resposta e as lojas recarregam', async () => {
      const comPreferida = { ...LOCALIZACAO, lojaPreferidaId: 7 }
      lojaService.obterLocalizacao.mockResolvedValue(LOCALIZACAO)
      lojaService.lojasProximas.mockResolvedValueOnce(LOJAS).mockResolvedValueOnce(LOJAS_NOVAS)
      lojaService.definirLojaPreferida.mockResolvedValue(comPreferida)
      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      await act(async () => {
        await result.current.definirLojaPreferida(7)
      })

      expect(lojaService.definirLojaPreferida).toHaveBeenCalledWith(7)
      expect(result.current.localizacao).toEqual(comPreferida)
      expect(result.current.lojas).toEqual(LOJAS_NOVAS)
      expect(lojaService.lojasProximas).toHaveBeenCalledTimes(2)
      expect(lojaService.obterLocalizacao).toHaveBeenCalledTimes(1)
    })

    it('com falha, relança o mesmo erro e mantém localizacao e lojas', async () => {
      lojaService.obterLocalizacao.mockResolvedValue(LOCALIZACAO)
      lojaService.lojasProximas.mockResolvedValue(LOJAS)
      const erro = erroDoServidor(404)
      lojaService.definirLojaPreferida.mockRejectedValue(erro)
      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      let rejeitado
      await act(async () => {
        rejeitado = await result.current.definirLojaPreferida(7).catch((e) => e)
      })

      expect(rejeitado).toBe(erro)
      expect(result.current.localizacao).toEqual(LOCALIZACAO)
      expect(result.current.lojas).toEqual(LOJAS)
      expect(lojaService.lojasProximas).toHaveBeenCalledTimes(1)
    })
  })

  describe('trocarCep', () => {
    it('com sucesso, localizacao passa a ser a resposta e as lojas são buscadas de novo', async () => {
      lojaService.obterLocalizacao.mockResolvedValue(LOCALIZACAO)
      lojaService.lojasProximas.mockResolvedValueOnce(LOJAS).mockResolvedValueOnce(LOJAS_NOVAS)
      lojaService.trocarCep.mockResolvedValue(LOCALIZACAO_NOVA)
      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      await act(async () => {
        await result.current.trocarCep('01001000')
      })

      expect(lojaService.trocarCep).toHaveBeenCalledWith('01001000')
      expect(result.current.localizacao).toEqual(LOCALIZACAO_NOVA)
      expect(result.current.lojas).toEqual(LOJAS_NOVAS)
      expect(lojaService.lojasProximas).toHaveBeenCalledTimes(2)
      expect(lojaService.obterLocalizacao).toHaveBeenCalledTimes(1)
    })

    it('rejeitado com userMessage: a promessa rejeita com o mesmo erro e o estado não muda', async () => {
      lojaService.obterLocalizacao.mockResolvedValue(LOCALIZACAO)
      lojaService.lojasProximas.mockResolvedValue(LOJAS)
      const erro = Object.assign(new Error('400'), { userMessage: 'CEP não encontrado' })
      lojaService.trocarCep.mockRejectedValue(erro)
      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      let rejeitado
      await act(async () => {
        rejeitado = await result.current.trocarCep('00000000').catch((e) => e)
      })

      expect(rejeitado).toBe(erro)
      expect(result.current.localizacao).toEqual(LOCALIZACAO)
      expect(result.current.lojas).toEqual(LOJAS)
      expect(result.current.erro).toBeNull()
      expect(lojaService.lojasProximas).toHaveBeenCalledTimes(1)
    })

    it('com sucesso, mas a busca das lojas falhando: a localização nova fica, lojas vira [] e erro é preenchido', async () => {
      lojaService.obterLocalizacao.mockResolvedValue(LOCALIZACAO)
      lojaService.lojasProximas.mockResolvedValueOnce(LOJAS).mockRejectedValueOnce(erroDoServidor(502))
      lojaService.trocarCep.mockResolvedValue(LOCALIZACAO_NOVA)
      const { result } = renderHook(() => useLocalizacao())
      await waitFor(() => expect(result.current.carregando).toBe(false))

      await act(async () => {
        await result.current.trocarCep('01001000')
      })

      expect(result.current.localizacao).toEqual(LOCALIZACAO_NOVA)
      expect(result.current.lojas).toEqual([])
      expect(result.current.erro).toBe('Erro 502 do servidor.')
    })
  })
})
