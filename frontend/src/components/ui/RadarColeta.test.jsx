import { fireEvent, render, screen } from '@testing-library/react'
import { RadarColeta } from './RadarColeta'

const MERCADOS = [
  { id: 'asun', name: 'Asun Supermercados' },
  { id: 'stok', name: 'Stok Center' },
  { id: 'inexistente', name: 'Sem logo' },
]
const RESUMO = [
  { id: 'asun', anuncios: 3000 },
  { id: 'stok', anuncios: 118 },
]

describe('RadarColeta', () => {
  it('mostra um card por rede com logo, ignora rede sem logo e soma os anúncios no hub', () => {
    render(<RadarColeta markets={MERCADOS} redesResumo={RESUMO} selectedMarket="todos" onSelect={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.getByAltText('Asun Supermercados')).toBeInTheDocument()
    expect(screen.queryByAltText('Sem logo')).not.toBeInTheDocument()
    expect(screen.getByText(/3\.118 preços sincronizados/)).toBeInTheDocument()
    expect(screen.getByText(/3\.000 anúncios/)).toBeInTheDocument()
  })

  it('chama onSelect com o id da rede e marca a selecionada com aria-pressed', () => {
    const onSelect = jest.fn()
    render(<RadarColeta markets={MERCADOS} redesResumo={RESUMO} selectedMarket="stok" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /asun/i }))
    expect(onSelect).toHaveBeenCalledWith('asun')
    expect(screen.getByRole('button', { name: /stok/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /asun/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('não renderiza nada sem redes', () => {
    const { container } = render(<RadarColeta markets={[]} redesResumo={[]} selectedMarket="todos" />)
    expect(container).toBeEmptyDOMElement()
  })
})
