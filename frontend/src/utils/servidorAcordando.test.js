import {
  ATRASO_AVISO_MS,
  assinarServidorAcordando,
  iniciarChamada,
  servidorAcordando,
} from './servidorAcordando'

describe('servidorAcordando', () => {
  // Chamadas abertas por cada teste: o afterEach encerra todas, para um teste que falha no meio
  // não deixar o estado (de módulo) ligado para o seguinte.
  let abertas

  const iniciar = () => {
    const encerrar = iniciarChamada()
    abertas.push(encerrar)
    return encerrar
  }

  beforeEach(() => {
    jest.useFakeTimers()
    abertas = []
  })

  afterEach(() => {
    abertas.forEach((encerrar) => encerrar())
    jest.useRealTimers()
  })

  it('o limiar é de 8 s', () => {
    expect(ATRASO_AVISO_MS).toBe(8000)
  })

  it('fica desligado sem nenhuma chamada', () => {
    expect(servidorAcordando()).toBe(false)
  })

  it('fica desligado até 1 ms antes de 8 s sem resposta', () => {
    iniciar()

    jest.advanceTimersByTime(ATRASO_AVISO_MS - 1)

    expect(servidorAcordando()).toBe(false)
  })

  it('liga quando a chamada passa de 8 s sem resposta', () => {
    iniciar()

    jest.advanceTimersByTime(ATRASO_AVISO_MS)

    expect(servidorAcordando()).toBe(true)
  })

  it('desliga quando a chamada lenta termina', () => {
    const encerrar = iniciar()
    jest.advanceTimersByTime(ATRASO_AVISO_MS + 30000)
    expect(servidorAcordando()).toBe(true)

    encerrar()

    expect(servidorAcordando()).toBe(false)
  })

  it('uma chamada que termina antes de 8 s nunca liga o aviso e cancela o temporizador', () => {
    const encerrar = iniciar()
    jest.advanceTimersByTime(3000)

    encerrar()
    jest.advanceTimersByTime(ATRASO_AVISO_MS * 2)

    expect(servidorAcordando()).toBe(false)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('com duas chamadas lentas, só desliga quando as duas terminam', () => {
    const primeira = iniciar()
    const segunda = iniciar()
    jest.advanceTimersByTime(ATRASO_AVISO_MS)

    primeira()
    expect(servidorAcordando()).toBe(true)

    segunda()
    expect(servidorAcordando()).toBe(false)
  })

  it('uma chamada rápida não desliga o aviso causado por outra, lenta', () => {
    const lenta = iniciar()
    jest.advanceTimersByTime(ATRASO_AVISO_MS)
    const rapida = iniciar()

    rapida()

    expect(servidorAcordando()).toBe(true)
    lenta()
    expect(servidorAcordando()).toBe(false)
  })

  it('encerrar a mesma chamada duas vezes não desconta a mais', () => {
    const primeira = iniciar()
    const segunda = iniciar()
    jest.advanceTimersByTime(ATRASO_AVISO_MS)

    primeira()
    primeira()

    expect(servidorAcordando()).toBe(true)
    segunda()
    expect(servidorAcordando()).toBe(false)
  })

  it('avisa os ouvintes só quando o aviso liga e quando desliga, não a cada chamada', () => {
    const ouvinte = jest.fn()
    const parar = assinarServidorAcordando(ouvinte)
    const primeira = iniciar()
    const segunda = iniciar()

    jest.advanceTimersByTime(ATRASO_AVISO_MS)
    expect(ouvinte).toHaveBeenCalledTimes(1)

    primeira()
    expect(ouvinte).toHaveBeenCalledTimes(1)

    segunda()
    expect(ouvinte).toHaveBeenCalledTimes(2)
    parar()
  })

  it('um ouvinte removido não é mais avisado', () => {
    const ouvinte = jest.fn()
    const parar = assinarServidorAcordando(ouvinte)
    parar()
    iniciar()

    jest.advanceTimersByTime(ATRASO_AVISO_MS)

    expect(ouvinte).not.toHaveBeenCalled()
  })

  it('volta a ligar numa segunda rodada de espera lenta', () => {
    const primeira = iniciar()
    jest.advanceTimersByTime(ATRASO_AVISO_MS)
    primeira()
    expect(servidorAcordando()).toBe(false)

    iniciar()
    jest.advanceTimersByTime(ATRASO_AVISO_MS)

    expect(servidorAcordando()).toBe(true)
  })
})
