import { fireEvent, render, screen } from '@testing-library/react'
import { ProductImage } from './ProductImage'

describe('ProductImage', () => {
  it('mostra o fallback quando a imagem falha ao carregar', () => {
    render(<ProductImage src="/images/quebrada.webp" alt="Cafe" fallbackIcon="📦" />)

    fireEvent.error(screen.getByRole('img', { name: 'Cafe' }))

    expect(screen.queryByRole('img', { name: 'Cafe' })).not.toBeInTheDocument()
    expect(screen.getByText('📦')).toBeInTheDocument()
  })

  it('volta a tentar a imagem quando o src muda depois de uma falha', () => {
    const { rerender } = render(
      <ProductImage src="/images/quebrada.webp" alt="Cafe" fallbackIcon="📦" />
    )
    fireEvent.error(screen.getByRole('img', { name: 'Cafe' }))
    expect(screen.queryByRole('img', { name: 'Cafe' })).not.toBeInTheDocument()

    rerender(<ProductImage src="/images/boa.webp" alt="Cafe" fallbackIcon="📦" />)

    const imagem = screen.getByRole('img', { name: 'Cafe' })
    expect(imagem).toHaveAttribute('src', '/images/boa.webp')
    expect(screen.queryByText('📦')).not.toBeInTheDocument()
  })

  it('mostra o indicador de carregamento de novo quando o src muda depois de carregada', () => {
    const { container, rerender } = render(<ProductImage src="/images/a.webp" alt="A" />)
    fireEvent.load(screen.getByRole('img', { name: 'A' }))
    expect(container.querySelector('.animate-pulse')).toBeNull()

    rerender(<ProductImage src="/images/b.webp" alt="A" />)

    expect(container.querySelector('.animate-pulse')).not.toBeNull()
    expect(screen.getByRole('img', { name: 'A' })).toHaveClass('opacity-0')
  })

  it('usa o fallback quando nao ha src valido', () => {
    render(<ProductImage src="produto.png" alt="Sem foto" fallbackIcon="🛒" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('🛒')).toBeInTheDocument()
  })
})
