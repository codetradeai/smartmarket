import { fireEvent, render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renderiza o texto e usa type="button" por padrao', () => {
    render(<Button>Salvar</Button>)

    const botao = screen.getByRole('button', { name: 'Salvar' })
    expect(botao).toHaveAttribute('type', 'button')
    expect(botao).toBeEnabled()
  })

  it('dispara onClick ao clicar', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Salvar</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('nao dispara onClick quando desabilitado', () => {
    const onClick = jest.fn()
    render(<Button disabled onClick={onClick}>Salvar</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('mostra "Carregando..." e desabilita o botao em isLoading', () => {
    render(<Button isLoading>Salvar</Button>)

    const botao = screen.getByRole('button')
    expect(botao).toBeDisabled()
    expect(botao).toHaveTextContent('Carregando...')
    expect(screen.queryByText('Salvar')).not.toBeInTheDocument()
  })

  it('renderiza icones laterais ao redor do texto', () => {
    render(
      <Button leftIcon={<i data-testid="esquerda" />} rightIcon={<i data-testid="direita" />}>
        Salvar
      </Button>
    )

    expect(screen.getByTestId('esquerda')).toBeInTheDocument()
    expect(screen.getByTestId('direita')).toBeInTheDocument()
  })

  it('aplica a variante e o tamanho informados', () => {
    render(<Button variant="danger" size="lg">Excluir</Button>)

    const botao = screen.getByRole('button', { name: 'Excluir' })
    expect(botao.className).toContain('bg-brand-error')
    expect(botao.className).toContain('h-12')
  })

  it('cai na variante e no tamanho padrao quando recebe valores desconhecidos', () => {
    render(<Button variant="inexistente" size="inexistente">Padrao</Button>)

    const botao = screen.getByRole('button', { name: 'Padrao' })
    expect(botao.className).toContain('bg-brand-green')
    expect(botao.className).toContain('h-10')
  })

  it('respeita type="submit"', () => {
    render(<Button type="submit">Enviar</Button>)

    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('type', 'submit')
  })
})
