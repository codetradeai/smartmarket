import { act, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../test/dataFixture')))
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, isAdmin: false, isLoading: false, user: null }),
}))

const movimentoReduzido = (ativo) => {
  window.matchMedia = jest.fn().mockImplementation((consulta) => ({
    matches: ativo && consulta.includes('prefers-reduced-motion'),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }))
}

const renderizar = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

const video = (container) => container.querySelector('video.sm-hero-video')

describe('Home: vídeo do hero adiado', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined)
    window.HTMLMediaElement.prototype.pause = jest.fn()
    delete window.requestIdleCallback
    delete navigator.connection
  })
  afterEach(() => jest.useRealTimers())

  it('na primeira renderização o vídeo não tem src e não pré-carrega', () => {
    movimentoReduzido(false)
    const { container } = renderizar()

    expect(video(container)).not.toHaveAttribute('src')
    expect(video(container)).toHaveAttribute('preload', 'none')
    expect(video(container)).toHaveAttribute('poster', '/video/hero-poster.jpg')
  })

  it('depois da renderização ociosa o src é definido e o vídeo toca', () => {
    movimentoReduzido(false)
    const { container } = renderizar()
    act(() => jest.advanceTimersByTime(1600))

    expect(video(container)).toHaveAttribute('src', '/video/hero.mp4')
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })

  it('com movimento reduzido o vídeo nunca é baixado', () => {
    movimentoReduzido(true)
    const { container } = renderizar()
    act(() => jest.advanceTimersByTime(10000))

    expect(video(container)).not.toHaveAttribute('src')
  })

  it('com economia de dados o vídeo nunca é baixado', () => {
    movimentoReduzido(false)
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true })
    const { container } = renderizar()
    act(() => jest.advanceTimersByTime(10000))

    expect(video(container)).not.toHaveAttribute('src')
  })

  it('desmontar antes do agendamento cancela o carregamento', () => {
    movimentoReduzido(false)
    const { container, unmount } = renderizar()
    const elemento = video(container)
    unmount()
    act(() => jest.advanceTimersByTime(10000))

    expect(elemento).not.toHaveAttribute('src')
  })
})
