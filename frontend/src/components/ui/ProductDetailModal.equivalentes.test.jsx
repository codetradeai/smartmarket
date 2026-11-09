import { render, screen, within } from '@testing-library/react'
import { ProductDetailModal } from './ProductDetailModal'
import { CATALOGO, GRUPOS } from '../../test/equivalentesFixture'

const MARKETS = [
  { id: 'zaffari', name: 'Zaffari / Bourbon', color: '#7A1526' },
  { id: 'asun', name: 'Asun Supermercados', color: '#00863F' },
  { id: 'fort', name: 'Fort Atacadista', color: '#F5651B' },
  { id: 'rissul', name: 'Supermercados Rissul', color: '#E31C24' },
]

const prod = (id) => CATALOGO.find((p) => p.id === id)

function abrir(id, extra = {}) {
  render(
    <ProductDetailModal
      product={prod(id)}
      allProducts={CATALOGO}
      equivalentes={GRUPOS}
      markets={MARKETS}
      isOpen
      onClose={jest.fn()}
      {...extra}
    />,
  )
  return within(screen.getByRole('dialog'))
}

describe('ProductDetailModal com equivalentes entre redes', () => {
  it('mostra a linha da outra rede com o preço e o NOME do item equivalente, em vez de "Indisponível"', () => {
    const dialogo = abrir('p10')
    expect(dialogo.getAllByText('Fort Atacadista').length).toBeGreaterThanOrEqual(1)
    expect(dialogo.getAllByText('R$ 2.99').length).toBeGreaterThanOrEqual(1)
    expect(dialogo.getAllByText(/Iogurte Natural Desnatado Nestlé 160 g/).length).toBeGreaterThanOrEqual(1)
    // Fort deixou de ser indisponível; só Zaffari e Rissul seguem sem cotação
    expect(dialogo.getAllByText('Indisponível')).toHaveLength(2)
  })

  it('equivalente confirmado participa do menor preço e da economia', () => {
    const dialogo = abrir('p10')
    const melhor = dialogo.getByText(/Melhor Preço do RS/).parentElement
    expect(melhor.textContent).toMatch(/Fort Atacadista/)
    expect(dialogo.getByText(/Economize até/).textContent).toMatch(/R\$ 0\.50/)
    expect(dialogo.getAllByText(/★ Menor Preço/).length).toBe(1)
  })

  it('diz que o menor preço vem do equivalente, citando o nome do item', () => {
    const dialogo = abrir('p10')
    const aviso = dialogo.getByText(/preço do equivalente/i)
    expect(aviso.textContent).toMatch(/Iogurte Natural Desnatado Nestlé 160 g/)
  })

  it('equivalente provável aparece com selo e aviso em texto, mas fora do menor preço', () => {
    const dialogo = abrir('p12')
    // o provável (Rissul, R$ 2.89) é mais barato que o próprio item (Zaffari, R$ 3.19), mas não vira "menor preço"
    expect(dialogo.getByText('Provável mesmo produto')).toBeInTheDocument()
    expect(dialogo.getByText(/Fora do cálculo do menor preço/)).toBeInTheDocument()
    expect(dialogo.getByText('Iogurte Natural Nestlé 170g')).toBeInTheDocument()
    expect(dialogo.getByText('R$ 2.89')).toBeInTheDocument()
    const melhor = dialogo.getByText(/Melhor Preço do RS/).parentElement
    expect(melhor.textContent).toMatch(/Zaffari/)
    expect(melhor.textContent).not.toMatch(/Rissul/)
    expect(dialogo.queryByText(/Economize até/)).toBeNull()
    expect(dialogo.getAllByText(/★ Menor Preço/).length).toBe(1)
    // Rissul tem cotação provável, então não aparece como indisponível
    expect(dialogo.getAllByText('Indisponível')).toHaveLength(2)
  })

  it('sem equivalentes o comportamento é o de sempre: as demais redes ficam indisponíveis', () => {
    const dialogo = abrir('p30')
    expect(dialogo.getAllByText('Indisponível')).toHaveLength(3)
    expect(dialogo.queryByText('Provável mesmo produto')).toBeNull()
    expect(dialogo.queryByText(/preço do equivalente/i)).toBeNull()
  })

  it('com o arquivo de equivalentes vazio (padrão) nada muda', () => {
    render(
      <ProductDetailModal product={prod('p10')} allProducts={CATALOGO} markets={MARKETS} isOpen onClose={jest.fn()} />,
    )
    expect(screen.getAllByText('Indisponível')).toHaveLength(3)
  })

  it('a promoção do item não é atribuída ao preço de um equivalente mais barato', () => {
    const base = { ...prod('p10'), promo: true, precoNormal: 4.2 }
    const catalogo = CATALOGO.map((p) => (p.id === 'p10' ? base : p))
    render(
      <ProductDetailModal
        product={base}
        allProducts={catalogo}
        equivalentes={GRUPOS}
        markets={MARKETS}
        isOpen
        onClose={jest.fn()}
      />,
    )
    // o preço em destaque é o do equivalente (R$ 2.99); o "De R$ 4.20" refere-se ao item do Asun
    expect(screen.queryByText(/^De R\$ 4\.20/)).toBeNull()
  })
})
