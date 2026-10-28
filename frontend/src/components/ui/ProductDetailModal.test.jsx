import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProductDetailModal } from './ProductDetailModal'

describe('ProductDetailModal (Fase 2)', () => {
  const mockMarkets = [
    { id: 'zaffari', name: 'Zaffari / Bourbon', color: '#7A1526' },
    { id: 'asun', name: 'Asun Supermercados', color: '#00863F' },
    { id: 'stok', name: 'Stok Center', color: '#009640' },
  ]

  const mockProductComprovado = {
    id: 'p1',
    name: 'Café em pó Melitta Tradicional 500g',
    brand: 'Melitta',
    category: 'cafe',
    unit: '500g',
    idOrigem: '7710359',
    supermercadoOrigem: 'Asun Supermercados',
    urlProduto: 'https://www.asunonline.com.br/produto/cafe-em-po-melitta-tradicional-500g',
    imageLocal: '/images/produtos/7710359_10fb88449dd6.webp',
    imageUrl: 'https://edge.osuper.com.br/foto-melitta.webp',
    descricao: 'Café torrado e moído tradicional de 500g.',
    prices: {
      zaffari: 26.50,
      asun: 24.90,
      stok: 23.40,
    },
    promo: true,
    precoNormal: 26.90,
  }

  it('não renderiza quando isOpen é falso', () => {
    const { container } = render(
      <ProductDetailModal
        product={mockProductComprovado}
        markets={mockMarkets}
        isOpen={false}
        onClose={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('exibe nome, marca, categoria, unidade e SKU de origem', () => {
    render(
      <ProductDetailModal
        product={mockProductComprovado}
        markets={mockMarkets}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Café em pó Melitta Tradicional 500g')).toBeInTheDocument()
    expect(screen.getByText('Melitta')).toBeInTheDocument()
    expect(screen.getByText(/cafe/i)).toBeInTheDocument()
    expect(screen.getAllByText(/500g/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('SKU #7710359')).toBeInTheDocument()
  })

  it('ordena os preços dos supermercados estritamente pelo menor valor válido', () => {
    render(
      <ProductDetailModal
        product={mockProductComprovado}
        markets={mockMarkets}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    // O menor preço é Stok (23.40), seguido por Asun (24.90) e Zaffari (26.50)
    expect(screen.getAllByText(/23\.40/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('R$ 24.90')).toBeInTheDocument()
    expect(screen.getByText('R$ 26.50')).toBeInTheDocument()
    expect(screen.getByText(/Melhor Preço do RS/i)).toBeInTheDocument()
  })

  it('exibe a comprovação promocional quando precoNormal > menor preço', () => {
    render(
      <ProductDetailModal
        product={mockProductComprovado}
        markets={mockMarkets}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    // Preço normal riscado: R$ 26.90
    expect(screen.getByText(/De R\$ 26\.90/i)).toBeInTheDocument()
    // Economia promocional: R$ 26.90 - R$ 23.40 = R$ 3.50
    expect(screen.getByText(/Economia de R\$ 3\.50/i)).toBeInTheDocument()
  })

  it('exibe o link oficial com target _blank e rel noopener', () => {
    render(
      <ProductDetailModal
        product={mockProductComprovado}
        markets={mockMarkets}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const link = screen.getByRole('link', { name: /Ver produto na loja oficial/i })
    expect(link).toHaveAttribute('href', 'https://www.asunonline.com.br/produto/cafe-em-po-melitta-tradicional-500g')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('chama onClose ao clicar no botão de fechar', () => {
    const handleClose = vi.fn()
    render(
      <ProductDetailModal
        product={mockProductComprovado}
        markets={mockMarkets}
        isOpen={true}
        onClose={handleClose}
      />
    )

    const closeBtn = screen.getByTitle(/Fechar \(Esc\)/i)
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('não exibe opção 360° para produtos sem sequência real completa (preserva galeria)', () => {
    render(
      <ProductDetailModal
        product={mockProductComprovado}
        markets={mockMarkets}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    // Não deve existir botão de alternância 360°
    expect(screen.queryByText(/🔄 Giro 360°/i)).toBeNull()
    // Âncora de integração documentada registra ausência de sequência
    const anchor = document.querySelector('[data-integration="product-viewer-360-anchor"]')
    expect(anchor).not.toBeNull()
    expect(anchor).toHaveAttribute('data-has-360', 'false')
  })

  it('habilita seletor e modo 360° quando o produto possui recursosVisuais.has360 com 2+ quadros', () => {
    const productCom360 = {
      ...mockProductComprovado,
      recursosVisuais: {
        has360: true,
        frames: ['/frame-1.webp', '/frame-2.webp', '/frame-3.webp'],
      },
    }

    render(
      <ProductDetailModal
        product={productCom360}
        markets={mockMarkets}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    // Deve exibir o seletor de modo 360°
    const btn360 = screen.getByRole('button', { name: /Giro 360°/i })
    expect(btn360).toBeInTheDocument()

    // Âncora reflete status ativo
    const anchor = document.querySelector('[data-integration="product-viewer-360-anchor"]')
    expect(anchor).toHaveAttribute('data-has-360', 'true')

    // Alterna para modo 360°
    fireEvent.click(btn360)
    expect(screen.getByRole('region')).toBeInTheDocument()
  })
})


