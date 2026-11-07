import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App: rotas em chunks próprios', () => {
  it('abre uma rota lazy mostrando o fallback e depois a página', async () => {
    render(
      <MemoryRouter initialEntries={['/auth?mode=register']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByRole('status')).toHaveTextContent('Carregando a página')
    expect(await screen.findByText('Comece a economizar', {}, { timeout: 30000 })).toBeInTheDocument()
  }, 40000)

  it('a Home continua no pacote inicial (sem fallback)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.queryByText('Carregando a página…')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
