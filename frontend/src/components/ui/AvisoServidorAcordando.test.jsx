import { act, render, screen } from '@testing-library/react'
import AvisoServidorAcordando from './AvisoServidorAcordando'
import { ATRASO_AVISO_MS, iniciarChamada } from '../../utils/servidorAcordando'

const MENSAGEM = 'O servidor estava dormindo e está acordando; pode levar alguns minutos.'

describe('AvisoServidorAcordando', () => {
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

  it('não renderiza nada (nem ocupa espaço) enquanto nenhuma chamada passou de 8 s', () => {
    const { container } = render(<AvisoServidorAcordando />)
    iniciar()

    act(() => {
      jest.advanceTimersByTime(ATRASO_AVISO_MS - 1)
    })

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(MENSAGEM)).not.toBeInTheDocument()
  })

  it('aparece depois de 8 s com a mensagem amigável, como aviso de status discreto', () => {
    render(<AvisoServidorAcordando />)
    iniciar()

    act(() => {
      jest.advanceTimersByTime(ATRASO_AVISO_MS)
    })

    const aviso = screen.getByRole('status')
    expect(aviso).toHaveTextContent(MENSAGEM)
    expect(aviso).toHaveAttribute('aria-live', 'polite')
  })

  it('some quando a resposta chega', () => {
    render(<AvisoServidorAcordando />)
    const encerrar = iniciar()
    act(() => {
      jest.advanceTimersByTime(ATRASO_AVISO_MS + 60000)
    })
    expect(screen.getByText(MENSAGEM)).toBeInTheDocument()

    act(() => {
      encerrar()
    })

    expect(screen.queryByText(MENSAGEM)).not.toBeInTheDocument()
  })

  it('já nasce visível se o servidor já estava demorando quando o componente monta', () => {
    iniciar()
    act(() => {
      jest.advanceTimersByTime(ATRASO_AVISO_MS)
    })

    render(<AvisoServidorAcordando />)

    expect(screen.getByText(MENSAGEM)).toBeInTheDocument()
  })

  it('aceita uma classe extra para o espaçamento da tela', () => {
    render(<AvisoServidorAcordando className="mb-4" />)
    iniciar()

    act(() => {
      jest.advanceTimersByTime(ATRASO_AVISO_MS)
    })

    expect(screen.getByRole('status')).toHaveClass('mb-4')
  })

  it('o círculo girando é decorativo (escondido de leitores de tela) e respeita movimento reduzido', () => {
    render(<AvisoServidorAcordando />)
    iniciar()

    act(() => {
      jest.advanceTimersByTime(ATRASO_AVISO_MS)
    })

    const giratorio = screen.getByRole('status').querySelector('[aria-hidden="true"]')
    expect(giratorio).toHaveClass('animate-spin', 'motion-reduce:animate-none')
  })
})
