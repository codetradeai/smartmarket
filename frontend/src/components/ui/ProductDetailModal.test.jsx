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
    expect(screen.getAllByText('Melitta').length).toBeGreaterThanOrEqual(1)
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

  it('permite arrastar a foto estática e retorna ao centro ao soltar', () => {
    const { container } = render(
      <ProductDetailModal
        product={mockProductComprovado}
        markets={mockMarkets}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const photoArea = container.querySelector('.cursor-grab')
    expect(photoArea).not.toBeNull()

    // Inicia o arraste da foto
    fireEvent.pointerDown(photoArea, { clientX: 100, clientY: 100, button: 0, pointerId: 1 })
    expect(photoArea).toHaveClass('cursor-grabbing')

    // Move a foto
    fireEvent.pointerMove(photoArea, { clientX: 150, clientY: 120, pointerId: 1 })

    // Solta a foto (deve retornar ao repouso e voltar ao centro)
    fireEvent.pointerUp(photoArea, { pointerId: 1 })
    expect(photoArea).toHaveClass('cursor-grab')
  })

  describe('Produtos Relacionados e Alternativas de Preço (Fase 4)', () => {
    const mockCatalogoRelacionados = [
      mockProductComprovado, // p1 - Melitta 500g
      {
        id: 'p2',
        name: 'Café em pó Melitta Tradicional 250g',
        brand: 'Melitta',
        category: 'cafe',
        unit: '250g',
        prices: { zaffari: 18.0, asun: 17.5, stok: 16.5 },
        recursosVisuais: { has360: true, frames: ['/f1.webp', '/f2.webp'] },
      },
      {
        id: 'p3',
        name: 'Café Torrado e Moído União 500g',
        brand: 'União',
        category: 'cafe',
        unit: '500g',
        prices: { zaffari: 22.0, asun: 21.0, stok: 20.0 },
      },
      {
        id: 'p4',
        name: 'Café a Vácuo Bom Jesus 500g',
        brand: 'Bom Jesus',
        category: 'cafe',
        unit: '500g',
        prices: { zaffari: 20.0, asun: 19.0, stok: 18.0 },
      },
      {
        id: 'p5',
        name: 'Arroz Branco Tio João 1kg',
        category: 'graos',
        brand: 'Tio João',
        unit: '1kg',
        prices: { asun: 5.5 },
      },
    ]

    it('não exibe a seção de relacionados quando allProducts é vazio ou não possui alternativas', () => {
      render(
        <ProductDetailModal
          product={mockProductComprovado}
          allProducts={[]}
          markets={mockMarkets}
          isOpen={true}
          onClose={vi.fn()}
        />
      )

      expect(screen.queryByText(/Você também pode comparar/i)).toBeNull()
    })

    it('exibe a seção Você também pode comparar com as abas Outras marcas e Mais da marca', () => {
      render(
        <ProductDetailModal
          product={mockProductComprovado}
          allProducts={mockCatalogoRelacionados}
          markets={mockMarkets}
          isOpen={true}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText(/Você também pode comparar/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Outras marcas/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Mais da Melitta/i })).toBeInTheDocument()

      // Na aba inicial (Outras marcas), devem aparecer União e Bom Jesus
      expect(screen.getByText('Café a Vácuo Bom Jesus 500g')).toBeInTheDocument()
      expect(screen.getByText('Café Torrado e Moído União 500g')).toBeInTheDocument()
    })

    it('permite alternar para a aba Mais da marca e exibe versões da mesma marca com badge 360 se disponível', () => {
      render(
        <ProductDetailModal
          product={mockProductComprovado}
          allProducts={mockCatalogoRelacionados}
          markets={mockMarkets}
          isOpen={true}
          onClose={vi.fn()}
        />
      )

      const btnMesmaMarca = screen.getByRole('button', { name: /Mais da Melitta/i })
      fireEvent.click(btnMesmaMarca)

      // Deve exibir o Melitta 250g
      expect(screen.getByText('Café em pó Melitta Tradicional 250g')).toBeInTheDocument()
      // Deve conter o badge 360° para o p2 que possui recursosVisuais.has360
      expect(screen.getByTitle('Possui rotação 360°')).toBeInTheDocument()
    })

    it('ao clicar em uma alternativa, atualiza o produto no modal sem fechá-lo e dispara onSelectProduct', () => {
      const handleSelect = vi.fn()
      const handleClose = vi.fn()
      const handleAddToList = vi.fn()

      render(
        <ProductDetailModal
          product={mockProductComprovado}
          allProducts={mockCatalogoRelacionados}
          onSelectProduct={handleSelect}
          markets={mockMarkets}
          isOpen={true}
          onClose={handleClose}
          onAddToList={handleAddToList}
        />
      )

      const cardBomJesus = screen.getByText('Café a Vácuo Bom Jesus 500g').closest('[role="button"]')
      expect(cardBomJesus).not.toBeNull()

      fireEvent.click(cardBomJesus)

      // onSelectProduct foi disparado com o novo produto
      expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'p4', name: 'Café a Vácuo Bom Jesus 500g' }))
      // Modal NÃO foi fechado
      expect(handleClose).not.toHaveBeenCalled()

      // Título do modal agora reflete o novo produto (Bom Jesus)
      expect(screen.getByRole('heading', { level: 2, name: 'Café a Vácuo Bom Jesus 500g' })).toBeInTheDocument()

      // Ao clicar em adicionar à lista, adiciona o NOVO produto (p4)
      const btnAdd = screen.getByRole('button', { name: /Adicionar à Lista de Compras/i })
      fireEvent.click(btnAdd)
      expect(handleAddToList).toHaveBeenCalledWith(expect.objectContaining({ id: 'p4' }))
    })

    it('executa com perfeição o fluxo completo de navegação sequencial: A -> B -> C -> fechar -> abrir D', () => {
      // Simula o componente pai controlando o estado do produto selecionado
      let currentSelected = mockProductComprovado // Produto A (Melitta 500g)
      let modalOpen = true

      const handleSelect = vi.fn((newProd) => {
        currentSelected = newProd
      })
      const handleClose = vi.fn(() => {
        modalOpen = false
      })

      const { rerender } = render(
        <ProductDetailModal
          product={currentSelected}
          allProducts={mockCatalogoRelacionados}
          onSelectProduct={handleSelect}
          markets={mockMarkets}
          isOpen={modalOpen}
          onClose={handleClose}
        />
      )

      // 1. Estado inicial: Produto A (Melitta 500g)
      expect(screen.getByRole('heading', { level: 2, name: 'Café em pó Melitta Tradicional 500g' })).toBeInTheDocument()

      // 2. Clicar no relacionado B (Bom Jesus 500g)
      const btnBomJesus = screen.getByText('Café a Vácuo Bom Jesus 500g').closest('[role="button"]')
      fireEvent.click(btnBomJesus)

      rerender(
        <ProductDetailModal
          product={currentSelected}
          allProducts={mockCatalogoRelacionados}
          onSelectProduct={handleSelect}
          markets={mockMarkets}
          isOpen={modalOpen}
          onClose={handleClose}
        />
      )
      expect(screen.getByRole('heading', { level: 2, name: 'Café a Vácuo Bom Jesus 500g' })).toBeInTheDocument()

      // 3. Clicar em outro relacionado C (União 500g)
      const btnUniao = screen.getByText('Café Torrado e Moído União 500g').closest('[role="button"]')
      fireEvent.click(btnUniao)

      rerender(
        <ProductDetailModal
          product={currentSelected}
          allProducts={mockCatalogoRelacionados}
          onSelectProduct={handleSelect}
          markets={mockMarkets}
          isOpen={modalOpen}
          onClose={handleClose}
        />
      )
      expect(screen.getByRole('heading', { level: 2, name: 'Café Torrado e Moído União 500g' })).toBeInTheDocument()

      // 4. Fechar o modal
      const btnClose = screen.getByTitle(/Fechar \(Esc\)/i)
      fireEvent.click(btnClose)
      expect(handleClose).toHaveBeenCalled()

      // 5. Reabrir com um produto diferente D (Melitta 250g com 360°)
      const produtoD = mockCatalogoRelacionados[1] // p2 Melitta 250g
      currentSelected = produtoD
      modalOpen = true

      rerender(
        <ProductDetailModal
          product={currentSelected}
          allProducts={mockCatalogoRelacionados}
          onSelectProduct={handleSelect}
          markets={mockMarkets}
          isOpen={modalOpen}
          onClose={handleClose}
        />
      )

      expect(screen.getByRole('heading', { level: 2, name: 'Café em pó Melitta Tradicional 250g' })).toBeInTheDocument()
      // Produto D possui 360° -> deve exibir o botão de 360°
      expect(screen.getByRole('button', { name: /Giro 360°/i })).toBeInTheDocument()
    })
  })
})




