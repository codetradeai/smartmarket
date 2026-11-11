import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Home from './Home'
import { MARKETS, PRODUCTS } from '../data'

// Catálogo real (src/data.js) tem 32 MB; os testes usam a fixture pequena.
jest.mock('../data', () => require('../test/dataFixture'))
// MARKETS, CATEGORIES e totais vêm do módulo leve; aqui derivados da mesma fixture.
jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../data')))

// Home.jsx usa useAuth() só para saber se há sessão (isAuthenticated). O mock abaixo representa o
// visitante, que é o que a Home mostra por padrão (modo "apresentacao"). Função comum, não jest.fn,
// para não ser zerada por jest.resetAllMocks().
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isAdmin: false,
    isLoading: false,
    user: null,
    token: null,
    login: () => {},
    register: () => {},
    logout: () => {},
  }),
}))

// Mostra para onde a Home navegou (rota /auth), com a query string completa.
function DestinoAuth() {
  const { pathname, search } = useLocation()
  return <p data-testid="destino">{`${pathname}${search}`}</p>
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<DestinoAuth />} />
      </Routes>
    </MemoryRouter>
  )
}

const destino = () => new URL(screen.getByTestId('destino').textContent, 'http://localhost')

describe('Home (visitante)', () => {
  it('sem grupos de equivalentes, não afirma produtos em 2+ redes (a fixture tem 2 preços no mesmo objeto)', () => {
    renderizar()

    const contador = screen.getByText('Anúncios com preço coletado').closest('div')
    expect(contador).toHaveTextContent('cada um com o preço da rede onde foi coletado')
    expect(contador).not.toHaveTextContent('2+ redes')
  })

  it('renderiza a apresentação com o título e a busca que convida ao cadastro', () => {
    renderizar()

    const primeiraDobra = screen.getByRole('region', { name: 'Compare sua lista de compras' })
    expect(within(primeiraDobra).getByRole('heading', { level: 1, name: 'Sua lista. O menor preço.' })).toBeInTheDocument()
    expect(within(primeiraDobra).getByLabelText('Buscar no catálogo')).toHaveValue('')
    expect(within(primeiraDobra).getByRole('button', { name: 'Criar conta e buscar' })).toBeInTheDocument()
    expect(within(primeiraDobra).getByText('A busca abre com a sua conta')).toBeInTheDocument()
  })

  it('a busca leva ao cadastro levando o termo digitado', () => {
    renderizar()

    fireEvent.change(screen.getByLabelText('Buscar no catálogo'), { target: { value: '  arroz tio joão  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta e buscar' }))

    const url = destino()
    expect(url.pathname).toBe('/auth')
    expect(url.searchParams.get('mode')).toBe('register')
    expect(url.searchParams.get('intent')).toBe('busca')
    expect(url.searchParams.get('q')).toBe('arroz tio joão')
  })

  it('a busca vazia leva ao cadastro sem termo', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta e buscar' }))

    const url = destino()
    expect(url.searchParams.get('intent')).toBe('busca')
    expect(url.searchParams.has('q')).toBe(false)
  })

  it('os atalhos de busca e os botões da primeira dobra apontam para o cadastro', () => {
    renderizar()
    const primeiraDobra = screen.getByRole('region', { name: 'Compare sua lista de compras' })

    expect(within(primeiraDobra).getByRole('link', { name: /Montar a lista/ })).toHaveAttribute(
      'href',
      '/auth?mode=register&intent=lista'
    )
    expect(within(primeiraDobra).getByRole('link', { name: 'Ver o catálogo' })).toHaveAttribute(
      'href',
      '/auth?mode=register&intent=catalogo'
    )

    fireEvent.click(within(primeiraDobra).getByRole('button', { name: 'Café Melitta' }))

    const url = destino()
    expect(url.searchParams.get('intent')).toBe('busca')
    expect(url.searchParams.get('q')).toBe('Café Melitta')
  })

  it('os contadores mostram quantas redes e quantos produtos há no catálogo', () => {
    renderizar()

    const valorDe = (rotulo) => screen.getByText(rotulo).closest('div').querySelector('dd')
    expect(valorDe('Redes no catálogo')).toHaveTextContent(new RegExp(`^${MARKETS.length}$`))
    expect(valorDe('Anúncios com preço coletado')).toHaveTextContent(new RegExp(`^${PRODUCTS.length}$`))
  })
})
