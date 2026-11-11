import { act, render, screen } from '@testing-library/react'
import { HeroHeadline } from './HeroHeadline'

function configurarMovimento(reduzido) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: reduzido && query.includes('reduce'),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }))
}

const ativo = (container) => container.querySelector('.sm-slot__item.is-ativo')?.textContent

describe('HeroHeadline', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('expõe a frase completa original para leitores de tela e esconde os fragmentos', () => {
    configurarMovimento(false)
    const { container } = render(<HeroHeadline />)
    expect(screen.getByRole('heading', { level: 1, name: 'Sua lista. O menor preço.' })).toBeInTheDocument()
    const fragmentos = container.querySelectorAll('h1 > span')
    expect(fragmentos.length).toBeGreaterThan(0)
    fragmentos.forEach((f) => expect(f).toHaveAttribute('aria-hidden', 'true'))
  })

  it('empilha as quatro variações e alterna a ativa a cada 2,8 s, voltando à primeira', () => {
    configurarMovimento(false)
    const { container } = render(<HeroHeadline />)
    expect(container.querySelectorAll('.sm-slot__item')).toHaveLength(4)
    expect(ativo(container)).toBe('O menor preço.')

    act(() => jest.advanceTimersByTime(2800))
    expect(ativo(container)).toBe('Mais barata.')
    expect(container.querySelector('.sm-slot__item.is-saindo')).toHaveTextContent('O menor preço.')

    act(() => jest.advanceTimersByTime(2800 * 3))
    expect(ativo(container)).toBe('O menor preço.')
  })

  it('com movimento reduzido não alterna: fica só na frase original', () => {
    configurarMovimento(true)
    const { container } = render(<HeroHeadline />)
    act(() => jest.advanceTimersByTime(2800 * 5))
    expect(ativo(container)).toBe('O menor preço.')
  })
})
