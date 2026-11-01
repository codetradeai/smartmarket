import { render, screen } from '@testing-library/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card'

describe('Card', () => {
  it('renderiza as partes compostas com o conteudo informado', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Arroz 5kg</CardTitle>
          <CardDescription>Tipo 1</CardDescription>
        </CardHeader>
        <CardContent>R$ 25,90</CardContent>
        <CardFooter>Fort</CardFooter>
      </Card>
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Arroz 5kg' })).toBeInTheDocument()
    expect(screen.getByText('Tipo 1')).toBeInTheDocument()
    expect(screen.getByText('R$ 25,90')).toBeInTheDocument()
    expect(screen.getByText('Fort')).toBeInTheDocument()
  })

  it('aplica a variante informada e cai na padrao quando desconhecida', () => {
    const { rerender } = render(<Card data-testid="card" variant="elevated" />)
    expect(screen.getByTestId('card').className).toContain('shadow-[0_8px_32px')

    rerender(<Card data-testid="card" variant="inexistente" />)
    expect(screen.getByTestId('card').className).toContain('shadow-sm')
  })

  it('permite trocar o elemento do titulo com a prop "as"', () => {
    render(<CardTitle as="h1">Titulo principal</CardTitle>)

    expect(screen.getByRole('heading', { level: 1, name: 'Titulo principal' })).toBeInTheDocument()
  })

  it('mescla className extra e repassa atributos ao elemento', () => {
    render(<Card data-testid="card" className="minha-classe" id="meu-card" />)

    const card = screen.getByTestId('card')
    expect(card).toHaveClass('minha-classe')
    expect(card).toHaveAttribute('id', 'meu-card')
  })
})
