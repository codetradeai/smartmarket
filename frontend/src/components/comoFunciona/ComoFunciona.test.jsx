import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ComoFunciona } from './ComoFunciona'
import { economiaDemo, indiceMenor, passoDoProgresso, totaisDemo } from './comoFuncionaDados'

function montar({ reduzido = false } = {}) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: reduzido && query.includes('reduce'),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }))
  return render(
    <MemoryRouter>
      <ComoFunciona />
    </MemoryRouter>,
  )
}

describe('dados da demonstração', () => {
  it('calcula totais, vencedor e economia a partir dos preços ilustrativos', () => {
    const totais = totaisDemo()
    expect(totais).toEqual([54.79, 53.79, 51.59])
    expect(indiceMenor(totais)).toBe(2)
    expect(economiaDemo()).toBe(3.2)
  })

  it('mapeia o progresso do scroll para o passo ativo', () => {
    expect(passoDoProgresso(0)).toBe(0)
    expect(passoDoProgresso(0.5)).toBe(1)
    expect(passoDoProgresso(0.9)).toBe(2)
  })
})

describe('ComoFunciona', () => {
  afterEach(() => jest.restoreAllMocks())

  it('mostra os três passos e o CTA que leva à lista de compras', () => {
    montar()
    expect(screen.getByRole('heading', { level: 2, name: /sua lista\.\s*nossa comparação\.\s*sua economia\./i })).toBeInTheDocument()
    for (const titulo of ['Monte sua lista', 'Cruze os preços', 'Escolha o mercado']) {
      expect(screen.getByRole('heading', { level: 3, name: titulo })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: /começar pela lista/i })).toHaveAttribute('href', '/list')
  })

  it('começa no passo 1 e marca só ele como atual', () => {
    // Seção de 3000px numa janela de 1000px, com o topo alinhado: progresso 0.
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 0, height: 3000, width: 800, left: 0, right: 800, bottom: 3000 })
    window.innerHeight = 1000
    montar()
    const atuais = document.querySelectorAll('[aria-current="step"]')
    expect(atuais).toHaveLength(1)
    expect(atuais[0]).toHaveTextContent('Monte sua lista')
  })

  it('com movimento reduzido vira estático, no estado final, e identifica a demonstração como ilustrativa', () => {
    const { container } = montar({ reduzido: true })
    expect(container.querySelector('.sm-story--static')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent('Escolha o mercado')
    expect(screen.getByRole('img', { name: /demonstração ilustrativa.*mercado c/i })).toBeInTheDocument()
    expect(screen.getByText(/exemplo ilustrativo/i)).toBeInTheDocument()
  })
})
