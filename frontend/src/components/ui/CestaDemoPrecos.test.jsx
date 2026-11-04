import { render, screen, within } from '@testing-library/react'
import { CestaDemoPrecos } from './CestaDemoPrecos'
import { formatarDataColeta } from '../../utils/cestaDemo'
import { ProductDetailModal } from './ProductDetailModal'

jest.mock('../../data/cesta-demo.json', () => ({
  meta: { rotulo: 'Cesta de demonstração' },
  produtos: [
    {
      id: 'p12',
      nome: 'Arroz Bco Blue Ville Tp1 1kg',
      ean: '07896011906881',
      precos: {
        master: { preco: 4.89, coletado_em: '2026-11-03T22:37:24-03:00', origem_vinculo: 'proprio', nome_na_rede: 'Arroz Bco Blue Ville Tp1 1kg' },
        stok: { preco: 4.35, coletado_em: '2026-11-03T22:37:27-03:00', origem_vinculo: 'ean', nome_na_rede: 'Arroz Blue Ville Branco Tipo 1 1kg' },
      },
    },
  ],
}))

const MARKETS = [
  { id: 'master', name: 'Master Supermercados' },
  { id: 'stok', name: 'Stok Center' },
  { id: 'fort', name: 'Fort Atacadista' },
]

const secao = () => screen.getByRole('region', { name: 'Cesta de demonstração' })
const linhas = () => within(secao()).getAllByRole('listitem')

describe('CestaDemoPrecos', () => {
  it('mostra o rótulo, o preço de cada rede e a data da coleta em horário de Brasília', () => {
    render(<CestaDemoPrecos produtoId="p12" markets={MARKETS} />)

    expect(within(secao()).getByRole('heading', { name: 'Cesta de demonstração' })).toBeInTheDocument()
    const [primeira, segunda] = linhas()
    expect(primeira).toHaveTextContent('Stok Center')
    expect(primeira).toHaveTextContent('R$ 4,35')
    expect(primeira).toHaveTextContent('coletado em 03/11/2026 22:37')
    expect(segunda).toHaveTextContent('Master Supermercados')
    expect(segunda).toHaveTextContent('R$ 4,89')
    expect(segunda).toHaveTextContent('coletado em 03/11/2026 22:37')
  })

  it('ordena do menor para o maior preço e deixa as redes sem preço por último', () => {
    render(<CestaDemoPrecos produtoId="p12" markets={MARKETS} />)

    expect(linhas().map((li) => li.getAttribute('data-rede'))).toEqual(['stok', 'master', 'fort'])
  })

  it('diz "sem preço nesta rede" quando a rede não tem preço na cesta, sem inventar valor', () => {
    render(<CestaDemoPrecos produtoId="p12" markets={MARKETS} />)

    const fort = linhas()[2]
    expect(fort).toHaveTextContent('Fort Atacadista')
    expect(fort).toHaveTextContent('sem preço nesta rede')
    expect(fort).not.toHaveTextContent('R$')
  })

  it('não calcula preço: só aparecem os dois valores coletados', () => {
    render(<CestaDemoPrecos produtoId="p12" markets={MARKETS} />)

    const valores = within(secao()).getAllByText(/R\$ \d/).map((el) => el.textContent)
    expect(valores).toEqual(['R$ 4,35', 'R$ 4,89'])
    expect(secao()).not.toHaveTextContent(/econom|diferença|mais barato/i)
  })

  it('não aparece para produto fora da cesta', () => {
    const { container } = render(<CestaDemoPrecos produtoId="p999" markets={MARKETS} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('formatarDataColeta lê o horário gravado, sem converter fuso', () => {
    expect(formatarDataColeta('2026-11-03T22:37:24-03:00')).toBe('03/11/2026 22:37')
    expect(formatarDataColeta(undefined)).toBeNull()
  })
})

describe('ProductDetailModal com a cesta de demonstração', () => {
  const produto = { id: 'p12', name: 'Arroz Bco Blue Ville Tp1 1kg', brand: 'Blue Ville', category: 'graos', unit: '1kg', image: '🌾', prices: { master: 4.89 } }

  it('mostra a seção da cesta no detalhe de um produto que está nela', () => {
    render(<ProductDetailModal product={produto} allProducts={[produto]} markets={MARKETS} isOpen onClose={() => {}} />)

    expect(secao()).toHaveTextContent('coletado em 03/11/2026 22:37')
    expect(within(secao()).getByText('sem preço nesta rede')).toBeInTheDocument()
  })

  it('não mostra a seção para produto fora da cesta', () => {
    const outro = { ...produto, id: 'p999' }
    render(<ProductDetailModal product={outro} allProducts={[outro]} markets={MARKETS} isOpen onClose={() => {}} />)

    expect(screen.queryByRole('region', { name: 'Cesta de demonstração' })).not.toBeInTheDocument()
  })
})
