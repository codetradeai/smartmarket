import { fireEvent, render, screen } from '@testing-library/react'
import { Input } from './Input'

describe('Input', () => {
  it('associa o label ao campo pelo id gerado', () => {
    render(<Input label="Email Principal" />)

    const campo = screen.getByLabelText('Email Principal')
    expect(campo).toHaveAttribute('id', 'input-email-principal')
  })

  it('prefere o id informado ao gerado a partir do label', () => {
    render(<Input label="Nome" id="campo-nome" />)

    expect(screen.getByLabelText('Nome')).toHaveAttribute('id', 'campo-nome')
  })

  it('propaga digitacao via onChange', () => {
    const onChange = jest.fn()
    render(<Input label="Nome" value="" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } })

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('mostra a mensagem de erro e esconde o texto de ajuda', () => {
    render(<Input label="Senha" error="Senha obrigatoria" helperText="Minimo 8 caracteres" />)

    expect(screen.getByText('Senha obrigatoria')).toBeInTheDocument()
    expect(screen.queryByText('Minimo 8 caracteres')).not.toBeInTheDocument()
  })

  it('mostra o texto de ajuda quando nao ha erro', () => {
    render(<Input label="Senha" helperText="Minimo 8 caracteres" />)

    expect(screen.getByText('Minimo 8 caracteres')).toBeInTheDocument()
  })

  it('desabilita o campo', () => {
    render(<Input label="Nome" disabled />)

    expect(screen.getByLabelText('Nome')).toBeDisabled()
  })

  it('exibe o botao de limpar quando ha valor e chama onClear', () => {
    const onClear = jest.fn()
    render(<Input label="Busca" value="arroz" onChange={() => {}} onClear={onClear} />)

    fireEvent.click(screen.getByTitle('Limpar campo'))

    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('nao exibe o botao de limpar quando o campo esta vazio', () => {
    render(<Input label="Busca" value="" onChange={() => {}} onClear={() => {}} />)

    expect(screen.queryByTitle('Limpar campo')).not.toBeInTheDocument()
  })

  it('nao exibe o botao de limpar quando ha icone a direita', () => {
    render(
      <Input
        label="Busca"
        value="arroz"
        onChange={() => {}}
        onClear={() => {}}
        rightIcon={<i data-testid="direita" />}
      />
    )

    expect(screen.queryByTitle('Limpar campo')).not.toBeInTheDocument()
    expect(screen.getByTestId('direita')).toBeInTheDocument()
  })

  it('renderiza icone a esquerda e, em modo busca, a lupa padrao', () => {
    const { container, rerender } = render(<Input label="Busca" leftIcon={<i data-testid="esquerda" />} />)
    expect(screen.getByTestId('esquerda')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()

    rerender(<Input label="Busca" isSearch />)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
