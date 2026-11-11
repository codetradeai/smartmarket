import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CupomViva } from './CupomViva'

function montar() {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }))
  return render(
    <MemoryRouter>
      <CupomViva />
    </MemoryRouter>,
  )
}

describe('CupomViva', () => {
  it('mostra o título, os três passos e o CTA que leva à lista de compras', () => {
    montar()
    expect(screen.getByRole('heading', { level: 2, name: /três passos\.\s*uma lista mais barata\./i })).toBeInTheDocument()
    for (const titulo of ['Monte a lista', 'Cruze os preços', 'Escolha o mercado']) {
      expect(screen.getByRole('button', { name: new RegExp(titulo, 'i') })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: /começar pela lista/i })).toHaveAttribute('href', '/list')
  })

  it('começa no passo 01 e troca o passo ativo ao clicar', () => {
    montar()
    const atual = () => document.querySelector('[aria-current="step"]')
    expect(atual()).toHaveTextContent('Monte a lista')
    fireEvent.click(screen.getByRole('button', { name: /escolha o mercado/i }))
    expect(atual()).toHaveTextContent('Escolha o mercado')
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
  })

  it('o cupom avisa que os valores são de demonstração e descreve o vencedor', () => {
    montar()
    expect(screen.getByText(/exemplo ilustrativo/i)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /demonstração ilustrativa.*mercado c.*r\$\s?3,20/i })).toBeInTheDocument()
  })

  it('o scanner (laser) fica na grade do cupom, escondido dos leitores de tela, e só anima no passo 02', () => {
    montar()
    const papel = document.querySelector('.sm-cupom__paper')
    const scan = papel.querySelector('.sm-cupom__grade .sm-cupom__scan')
    expect(scan).toBeInTheDocument()
    expect(scan.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(papel).toHaveAttribute('data-passo', '0')

    fireEvent.click(screen.getByRole('button', { name: /cruze os preços/i }))
    expect(papel).toHaveAttribute('data-passo', '1')
  })
})
