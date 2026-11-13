import { fireEvent, render, screen } from '@testing-library/react'
import LojaDoCartao from './LojaDoCartao'

const FILIAL = {
  nomeFilial: 'Carrefour Centro',
  endereco: 'Rua dos Andradas, 200',
  cidade: 'Porto Alegre',
  uf: 'RS',
  latitude: -30.0346,
  longitude: -51.2177,
  distanciaKm: 3.5,
}
const SEM_COORDENADAS = { ...FILIAL, latitude: null, longitude: null }

describe('LojaDoCartao', () => {
  it('sem loja não renderiza nada', () => {
    const { container } = render(<LojaDoCartao filial={null} nomeRede="Carrefour" />)

    expect(container).toBeEmptyDOMElement()
  })

  describe('texto', () => {
    it('mostra o nome e a distância em formato brasileiro', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      expect(screen.getByText('Carrefour Centro')).toBeInTheDocument()
      expect(screen.getByText('• 3,5 km')).toBeInTheDocument()
    })

    it('mostra o prefixo quando ele é pedido e não mostra quando não é', () => {
      const { rerender } = render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" rotulo="Loja de referência:" />)
      expect(screen.getByText('Loja de referência:')).toBeInTheDocument()

      rerender(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)
      expect(screen.queryByText(/Loja de referência/)).not.toBeInTheDocument()
    })

    it('sem distância calculada mostra só o nome, sem "• km" nem undefined', () => {
      render(<LojaDoCartao filial={{ ...FILIAL, distanciaKm: null }} nomeRede="Carrefour" />)

      expect(screen.getByText('Carrefour Centro')).toBeInTheDocument()
      expect(document.body.textContent).not.toMatch(/undefined|null|km|•/)
    })

    it('mostra o preço da rede quando ele é pedido ("• R$ 7.90"), como nos outros cartões', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" rotulo="Mais perto:" preco={7.9} />)

      expect(screen.getByText('• R$ 7.90')).toBeInTheDocument()
    })

    it('sem preço pedido (ou preço inválido) não mostra "R$"', () => {
      const { rerender } = render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)
      expect(document.body.textContent).not.toMatch(/R\$/)

      rerender(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" preco={NaN} />)
      expect(document.body.textContent).not.toMatch(/R\$|NaN/)
    })

    it('nunca mostra endereço nem cidade', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" rotulo="Loja de referência:" />)

      expect(document.body.textContent).not.toMatch(/Andradas|Porto Alegre|RS/)
    })
  })

  describe('tooltip: o preço é da rede', () => {
    it('diz que o preço vale para toda a rede e que a loja é só referência', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      expect(
        screen.getByTitle('Carrefour Centro • 3,5 km. O preço vale para toda a rede Carrefour; a loja é só referência.')
      ).toBeInTheDocument()
    })

    it('sem distância o tooltip traz só o nome e o aviso', () => {
      render(<LojaDoCartao filial={{ ...FILIAL, distanciaKm: null }} nomeRede="Carrefour" />)

      expect(
        screen.getByTitle('Carrefour Centro. O preço vale para toda a rede Carrefour; a loja é só referência.')
      ).toBeInTheDocument()
    })

    it('o tooltip do cartão compacto também traz o aviso', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" compacto />)

      expect(screen.getByTitle(/O preço vale para toda a rede Carrefour; a loja é só referência\.$/)).toBeInTheDocument()
    })

    it('o tooltip não traz endereço nem cidade', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      expect(screen.getByTitle(/Carrefour Centro/).getAttribute('title')).not.toMatch(/Andradas|Porto Alegre|Rua/)
    })
  })

  describe('"Como chegar"', () => {
    it('com coordenadas mostra o link do Google Maps, em outra aba, sem referrer e com rótulo acessível', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      const link = screen.getByRole('link', { name: 'Como chegar a Carrefour Centro (abre o mapa em outra aba)' })
      expect(link).toHaveTextContent('Como chegar')
      expect(link).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=-30.0346,-51.2177')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link.getAttribute('rel').split(/\s+/).sort()).toEqual(['noopener', 'noreferrer'])
      expect(link).toHaveAttribute('referrerpolicy', 'no-referrer')
    })

    it('o link só leva o ponto da loja: nada do usuário nem endereço', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      const href = screen.getByRole('link').getAttribute('href')
      expect(href).not.toMatch(/origin|Andradas|Porto|90010/i)
    })

    it.each([
      ['coordenadas nulas', { latitude: null, longitude: null }],
      ['sem os campos', { latitude: undefined, longitude: undefined }],
      ['só a latitude', { latitude: -30.03, longitude: null }],
      ['só a longitude', { latitude: null, longitude: -51.2 }],
      ['texto no lugar de número', { latitude: '-30.03', longitude: '-51.2' }],
      ['fora da faixa', { latitude: 95, longitude: -51.2 }],
    ])('sem coordenadas válidas (%s) não há link', (_nome, coordenadas) => {
      render(<LojaDoCartao filial={{ ...FILIAL, ...coordenadas }} nomeRede="Carrefour" />)

      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.queryByText('Como chegar')).not.toBeInTheDocument()
      // o resto da loja continua aparecendo
      expect(screen.getByText('Carrefour Centro')).toBeInTheDocument()
    })

    it('o link aparece também na versão compacta', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" compacto />)

      expect(screen.getByRole('link', { name: /Como chegar a Carrefour Centro/ })).toBeInTheDocument()
    })

    describe('clique', () => {
      // O jsdom não navega: o preventDefault na captura evita o aviso "Not implemented: navigation"
      // sem impedir que o clique suba pela árvore (que é o que o teste observa).
      const impedirNavegacao = (evento) => evento.preventDefault()
      beforeEach(() => document.addEventListener('click', impedirNavegacao, true))
      afterEach(() => document.removeEventListener('click', impedirNavegacao, true))

      it('clicar no link NÃO dispara o clique do cartão (não abre o detalhe do produto)', () => {
        const aoClicarNoCartao = jest.fn()
        render(
          <div onClick={aoClicarNoCartao}>
            <LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />
          </div>
        )

        fireEvent.click(screen.getByRole('link', { name: /Como chegar/ }))

        expect(aoClicarNoCartao).not.toHaveBeenCalled()
      })

      it('clicar no resto do chip continua subindo para o cartão', () => {
        const aoClicarNoCartao = jest.fn()
        render(
          <div onClick={aoClicarNoCartao}>
            <LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />
          </div>
        )

        fireEvent.click(screen.getByText('Carrefour Centro'))

        expect(aoClicarNoCartao).toHaveBeenCalledTimes(1)
      })
    })
  })

  it('sem coordenadas o chip fica igual ao de antes, sem o link', () => {
    render(<LojaDoCartao filial={SEM_COORDENADAS} nomeRede="Carrefour" />)

    expect(screen.getByText('Carrefour Centro').parentElement).toHaveTextContent(/^📍\s*Carrefour Centro\s*•\s*3,5 km$/)
  })
})
