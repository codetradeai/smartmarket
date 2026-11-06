import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sobre from './Sobre'

// Catálogo real (src/data.js) tem 32 MB; os testes usam a fixture pequena.
jest.mock('../data', () => require('../test/dataFixture'))

function renderizar() {
  return render(
    <MemoryRouter>
      <Sobre />
    </MemoryRouter>
  )
}

// Página institucional: os testes cobrem só a navegação. Textos de missão e diferenciais
// são conteúdo editorial e mudam sem que nada quebre.
describe('Sobre', () => {
  it('oferece navegacao para as principais paginas', () => {
    renderizar()

    expect(screen.getByRole('link', { name: /Smart\s*Market/ })).toHaveAttribute('href', '/')
    expect(screen.getAllByRole('link', { name: 'Catálogo' })[0]).toHaveAttribute('href', '/catalog')
    expect(screen.getByRole('link', { name: 'Favoritos' })).toHaveAttribute('href', '/favorites')
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/auth')
  })

  it('convida o visitante a ver o catalogo e os favoritos', () => {
    renderizar()

    expect(screen.getByRole('heading', { name: 'Pronto para economizar?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver Catálogo' })).toHaveAttribute('href', '/catalog')
    expect(screen.getByRole('link', { name: 'Meus Favoritos' })).toHaveAttribute('href', '/favorites')
  })
})
