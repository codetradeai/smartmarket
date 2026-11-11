import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FaixaFinal } from './FaixaFinal'

function renderizar() {
  return render(
    <MemoryRouter>
      <FaixaFinal redesAtivas={4} />
    </MemoryRouter>
  )
}

describe('FaixaFinal', () => {
  it('mantém o título, o subtítulo e os dois links com as rotas originais', () => {
    renderizar()

    expect(screen.getByRole('heading', { name: /A próxima compra pode custar menos\./ })).toBeInTheDocument()
    expect(screen.getByText(/sem estimativa inventada/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Abrir minha lista/ })).toHaveAttribute('href', '/list')
    expect(screen.getByRole('link', { name: 'Ver o catálogo' })).toHaveAttribute('href', '/catalog')
  })

  it('o cupom troca a mensagem conforme o perfil, sem mostrar valores inventados', () => {
    renderizar()

    const grupo = screen.getByRole('radiogroup', { name: 'Perfil de compra' })
    expect(within(grupo).getByRole('radio', { name: 'Compra da Semana' })).toBeChecked()
    expect(screen.getByText('Compare os itens do seu dia a dia.')).toBeInTheDocument()

    fireEvent.click(within(grupo).getByRole('radio', { name: 'Cesta Básica' }))
    expect(screen.getByText('Explore os produtos essenciais.')).toBeInTheDocument()

    fireEvent.click(within(grupo).getByRole('radio', { name: 'Rancho do Mês' }))
    expect(screen.getByText('Organize uma compra maior.')).toBeInTheDocument()

    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument()
  })

  it('as setas do teclado movem a seleção entre os perfis', () => {
    renderizar()

    const semana = screen.getByRole('radio', { name: 'Compra da Semana' })
    fireEvent.keyDown(semana, { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'Rancho do Mês' })).toBeChecked()

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Rancho do Mês' }), { key: 'Home' })
    expect(screen.getByRole('radio', { name: 'Cesta Básica' })).toBeChecked()
  })
})
