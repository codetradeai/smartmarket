import { fireEvent, render, screen } from '@testing-library/react'
import { SearchSuggest } from './SearchSuggest'

jest.mock('../../catalogoResumo', () => require('../../test/resumoDe').resumoDe(require('../../test/dataFixture')))

const URL_IMAGEM = 'https://cdn-externo.invalid/a.png'
const produtos = [
  { id: 'p1', name: 'Arroz Teste 1kg', brand: 'Marca', category: 'graos', imageLocal: URL_IMAGEM, image: '🍚', prices: { fort: 5 } },
]

describe('SearchSuggest: miniatura com fallback', () => {
  it('troca a imagem pelo ícone do produto quando ela falha ao carregar', () => {
    render(<SearchSuggest id="busca" value="arroz" onChange={() => {}} onSubmit={() => {}} products={produtos} />)
    fireEvent.focus(screen.getByRole('textbox'))

    const img = document.querySelector(`img[src="${URL_IMAGEM}"]`)
    expect(img).not.toBeNull()
    fireEvent.error(img)

    expect(document.querySelector(`img[src="${URL_IMAGEM}"]`)).toBeNull()
    expect(screen.getByText('🍚')).toBeInTheDocument()
  })
})
