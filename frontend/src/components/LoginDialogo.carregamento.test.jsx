import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'
import { LoginModalProvider } from '../contexts/LoginModalContext'
import LinkEntrar from './LinkEntrar'

// O corpo do card é um chunk à parte. Aqui o import fica pendente até o teste liberar, para provar
// que o casco abre na hora (com esqueleto e botão de fechar) enquanto o código ainda carrega.
let liberar
jest.mock('./carregarCartaoLogin', () => ({
  importarCartaoLogin: () =>
    new Promise((resolve) => {
      liberar = () => resolve(require('./CartaoLogin'))
    }),
}))

function renderizar() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ login: jest.fn(), isLoading: false }}>
        <LoginModalProvider>
          <LinkEntrar>Entrar</LinkEntrar>
        </LoginModalProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('Login em modal: carregamento sob demanda', () => {
  // O primeiro require do CartaoLogin transforma e instrumenta o módulo e os ícones. Sob cobertura, com a
  // máquina carregada, isso passava de 5 s dentro do teste e estourava o timeout. Aquece antes, fora dele.
  beforeAll(() => {
    require('./CartaoLogin')
  }, 60000)

  // A ordem importa: o React.lazy guarda o módulo resolvido. O teste que libera o chunk vem por último.
  it('fecha com ESC mesmo com o corpo ainda carregando', () => {
    renderizar()
    fireEvent.click(screen.getByRole('link', { name: 'Entrar' }))
    expect(screen.getByTestId('login-esqueleto')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abre o casco com esqueleto enquanto o corpo do card carrega, sem formulário ainda', async () => {
    renderizar()

    fireEvent.click(screen.getByRole('link', { name: 'Entrar' }))

    expect(screen.getByRole('dialog', { name: 'Entrar no SmartMarket' })).toBeInTheDocument()
    expect(screen.getByTestId('login-esqueleto')).toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
    // O casco já é funcional: dá para fechar antes de o chunk chegar.
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()

    await act(async () => {
      liberar()
    })

    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.queryByTestId('login-esqueleto')).not.toBeInTheDocument()
  })
})
