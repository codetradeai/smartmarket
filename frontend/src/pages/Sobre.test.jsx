import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sobre from './Sobre'

function renderizar() {
  return render(
    <MemoryRouter>
      <Sobre />
    </MemoryRouter>
  )
}

describe('Sobre', () => {
  it('apresenta a missao do SmartMarket', () => {
    renderizar()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Economia inteligente na palma da sua mão')
    expect(screen.getByText('Nossa Missão')).toBeInTheDocument()
  })

  it('descreve os tres diferenciais', () => {
    renderizar()

    expect(screen.getByRole('heading', { name: 'Coleta Automatizada' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Comparação Cesta a Cesta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Transparência Total' })).toBeInTheDocument()
  })

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
