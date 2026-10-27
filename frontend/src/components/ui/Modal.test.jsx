import { fireEvent, render, screen } from '@testing-library/react'
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from './Modal'

describe('Modal', () => {
  it('nao renderiza nada quando fechado', () => {
    render(<Modal isOpen={false} onClose={() => {}}>Conteudo</Modal>)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza o conteudo em um dialog quando aberto', () => {
    render(
      <Modal isOpen onClose={() => {}}>
        <ModalHeader>
          <ModalTitle>Confirmar</ModalTitle>
          <ModalDescription>Tem certeza?</ModalDescription>
        </ModalHeader>
        <ModalBody>Corpo</ModalBody>
        <ModalFooter>Rodape</ModalFooter>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Confirmar' })).toBeInTheDocument()
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument()
    expect(screen.getByText('Corpo')).toBeInTheDocument()
    expect(screen.getByText('Rodape')).toBeInTheDocument()
  })

  it('fecha pelo botao de fechar', () => {
    const onClose = jest.fn()
    render(<Modal isOpen onClose={onClose}>Conteudo</Modal>)

    fireEvent.click(screen.getByRole('button', { name: 'Fechar modal' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('esconde o botao de fechar com showCloseButton=false', () => {
    render(<Modal isOpen onClose={() => {}} showCloseButton={false}>Conteudo</Modal>)

    expect(screen.queryByRole('button', { name: 'Fechar modal' })).not.toBeInTheDocument()
  })

  it('fecha ao pressionar Escape, mas ignora outras teclas', () => {
    const onClose = jest.fn()
    render(<Modal isOpen onClose={onClose}>Conteudo</Modal>)

    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha ao clicar no fundo, mas nao ao clicar no conteudo', () => {
    const onClose = jest.fn()
    render(<Modal isOpen onClose={onClose}>Conteudo</Modal>)

    fireEvent.click(screen.getByText('Conteudo'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('nao fecha ao clicar no fundo com closeOnOverlayClick=false', () => {
    const onClose = jest.fn()
    render(<Modal isOpen onClose={onClose} closeOnOverlayClick={false}>Conteudo</Modal>)

    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('bloqueia o scroll do body enquanto aberto e restaura ao desmontar', () => {
    const { unmount } = render(<Modal isOpen onClose={() => {}}>Conteudo</Modal>)
    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('unset')
  })

  it('nao quebra quando onClose nao e informado', () => {
    render(<Modal isOpen>Conteudo</Modal>)

    expect(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
      fireEvent.click(screen.getByRole('dialog'))
    }).not.toThrow()
  })
})
