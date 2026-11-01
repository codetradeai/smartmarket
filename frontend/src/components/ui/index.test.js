import * as ui from './index'

describe('components/ui (barrel)', () => {
  it('reexporta todos os componentes de interface', () => {
    const esperados = [
      'Button', 'Input',
      'Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter',
      'Modal', 'ModalHeader', 'ModalTitle', 'ModalDescription', 'ModalBody', 'ModalFooter',
      'Navbar',
    ]

    esperados.forEach((nome) => {
      expect(ui[nome]).toBeDefined()
    })
  })
})
