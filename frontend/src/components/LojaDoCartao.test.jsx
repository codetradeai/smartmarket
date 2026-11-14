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
      expect(screen.getByText('≈ 3,5 km')).toBeInTheDocument()
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
        screen.getByTitle('Carrefour Centro • ≈ 3,5 km. O preço vale para toda a rede Carrefour; a loja é só referência.')
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

    it('os links só levam o ponto da loja: nada do usuário nem endereço', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
      expect(hrefs).toHaveLength(2)
      for (const href of hrefs) {
        expect(href).not.toMatch(/origin|Andradas|Porto|90010/i)
      }
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

    expect(screen.getByText('Carrefour Centro').closest('[title]')).toHaveTextContent(/^📍\s*Carrefour Centro\s*≈ 3,5 km\s*aproximadamente 3,5 km, em linha reta, a partir do seu CEP$/)
  })

  // O jsdom não faz layout: estas classes são a trava contra voltar ao chip de uma linha só, em que o
  // nome da loja encolhia até sumir ("Za…", ou nada) e o link "Como chegar" era cortado em cartões estreitos.
  describe('layout para cartões estreitos (conferido no navegador a 360 px e a 1440 px)', () => {
    const chip = (props = {}) => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" {...props} />)
      return screen.getByText('Carrefour Centro').closest('[title]')
    }

    it.each([
      ['completo', false],
      ['compacto', true],
    ])('o chip %s é uma coluna: o nome numa linha e os detalhes (que quebram sozinhos) em outra', (_nome, compacto) => {
      const caixa = chip({ compacto })

      expect(caixa).toHaveClass('flex', 'flex-col')
      expect(screen.getByText('≈ 3,5 km').parentElement).toHaveClass('flex', 'flex-wrap')
    })

    it('o nome da loja é truncado só se for maior que o chip (max-w-full), e nunca encolhe a zero', () => {
      chip()

      expect(screen.getByText('Carrefour Centro')).toHaveClass('truncate', 'min-w-0', 'max-w-full')
    })

    it('com prefixo, o pin e o prefixo não encolhem (o nome é que desce de linha se faltar espaço)', () => {
      chip({ rotulo: 'Loja de referência:' })

      const grupoDoPrefixo = screen.getByText('Loja de referência:').parentElement
      expect(grupoDoPrefixo).toHaveClass('shrink-0')
    })

    it('sem prefixo, o nome fica ao lado do pin, no mesmo grupo (não desce sozinho sob o pin)', () => {
      chip()

      const nome = screen.getByText('Carrefour Centro')
      expect(nome.parentElement).toContainElement(screen.getByText('📍'))
    })

    it('a distância, o preço e os links nunca encolhem (shrink-0), e os links ficam juntos, à direita', () => {
      chip({ preco: 7.9 })

      expect(screen.getByText('≈ 3,5 km')).toHaveClass('shrink-0')
      expect(screen.getByText('• R$ 7.90')).toHaveClass('shrink-0')
      const google = screen.getByRole('link', { name: /Como chegar/ })
      const waze = screen.getByRole('link', { name: /Waze/ })
      expect(google).toHaveClass('shrink-0')
      expect(waze).toHaveClass('shrink-0')
      expect(google.parentElement).toBe(waze.parentElement)
      expect(google.parentElement).toHaveClass('ml-auto', 'shrink-0')
    })
  })

  describe('distância aproximada', () => {
    const DICA = 'Distância em linha reta, calculada a partir do seu CEP'

    it('o texto visual "≈ 3,5 km" fica escondido do leitor de tela e traz a dica no title', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      const visual = screen.getByText('≈ 3,5 km')
      expect(visual).toHaveAttribute('aria-hidden', 'true')
      expect(visual).toHaveAttribute('title', DICA)
      expect(screen.getByTitle(DICA)).toBe(visual)
    })

    it('ao lado entra o texto sr-only com a distância falada', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      const falado = screen.getByText('aproximadamente 3,5 km, em linha reta, a partir do seu CEP')
      expect(falado).toHaveClass('sr-only')
      expect(falado).not.toHaveAttribute('aria-hidden')
    })

    it('sem distância não aparece "≈", dica nem texto falado', () => {
      render(<LojaDoCartao filial={{ ...FILIAL, distanciaKm: null }} nomeRede="Carrefour" />)

      expect(document.body.textContent).not.toMatch(/≈|aproximadamente/)
      expect(screen.queryByTitle(DICA)).not.toBeInTheDocument()
    })
  })

  describe('o "•" nunca fica solto no começo de uma linha', () => {
    // A linha de detalhes sempre começa pela distância (ou pelo preço, ou pelos links): o "•" só separa
    // a distância do preço. Assim, quando os itens quebram de linha, nenhuma linha começa com símbolo.
    const detalhes = (props) => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" {...props} />)
      return screen.getByText('Carrefour Centro').closest('[title]').lastElementChild
    }

    it('com distância e preço, o "•" fica entre os dois', () => {
      const linha = detalhes({ preco: 7.9 })

      expect(linha.textContent).toMatch(/^≈ 3,5 kmaproximadamente 3,5 km, em linha reta, a partir do seu CEP• R\$ 7\.90/)
      expect(linha.textContent.startsWith('•')).toBe(false)
    })

    it('com distância e links (sem preço), não há nenhum "•"', () => {
      const linha = detalhes()

      expect(linha.textContent).toMatch(/^≈ 3,5 km/)
      expect(linha.textContent).not.toMatch(/•/)
    })

    it('com preço mas sem distância, o preço abre a linha sem "•"', () => {
      const linha = detalhes({ filial: { ...FILIAL, distanciaKm: null }, preco: 7.9 })

      expect(linha.textContent).toMatch(/^R\$ 7\.90/)
      expect(linha.textContent).not.toMatch(/•/)
    })

    it('só com links (sem distância nem preço), a linha de detalhes não tem "•"', () => {
      render(<LojaDoCartao filial={{ ...FILIAL, distanciaKm: null }} nomeRede="Carrefour" />)

      const linha = screen.getByText('Carrefour Centro').closest('[title]').lastElementChild
      expect(linha.textContent).toBe('Como chegarWaze')
    })

    it('sem nada para a linha de detalhes (sem distância, preço nem coordenadas), ela nem existe', () => {
      render(<LojaDoCartao filial={{ ...FILIAL, distanciaKm: null, latitude: null, longitude: null }} nomeRede="Carrefour" />)

      const caixa = screen.getByText('Carrefour Centro').closest('[title]')
      expect(caixa.children).toHaveLength(1)
    })
  })

  describe('Waze', () => {
    const impedirNavegacao = (evento) => evento.preventDefault()
    beforeEach(() => document.addEventListener('click', impedirNavegacao, true))
    afterEach(() => document.removeEventListener('click', impedirNavegacao, true))

    it('com coordenadas mostra o link do Waze, em outra aba, sem referrer e com rótulo acessível', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      const link = screen.getByRole('link', { name: 'Abrir a rota até Carrefour Centro no Waze (abre em outra aba)' })
      expect(link).toHaveTextContent('Waze')
      expect(link).toHaveAttribute('href', 'https://waze.com/ul?ll=-30.0346,-51.2177&navigate=yes')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link.getAttribute('rel').split(/\s+/).sort()).toEqual(['noopener', 'noreferrer'])
      expect(link).toHaveAttribute('referrerpolicy', 'no-referrer')
    })

    it('o rótulo do Waze não se confunde com o do Google Maps (cada link tem um nome só)', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      expect(screen.getAllByRole('link', { name: /Como chegar a Carrefour Centro/ })).toHaveLength(1)
      expect(screen.getAllByRole('link', { name: /Waze/ })).toHaveLength(1)
    })

    it('os dois links aparecem na ordem Como chegar, Waze', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />)

      expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Como chegar', 'Waze'])
    })

    it.each([
      ['coordenadas nulas', { latitude: null, longitude: null }],
      ['só a latitude', { latitude: -30.03, longitude: null }],
      ['só a longitude', { latitude: null, longitude: -51.2 }],
      ['texto no lugar de número', { latitude: '-30.03', longitude: '-51.2' }],
      ['fora da faixa', { latitude: 95, longitude: -51.2 }],
    ])('sem coordenadas válidas (%s) não há link do Waze', (_nome, coordenadas) => {
      render(<LojaDoCartao filial={{ ...FILIAL, ...coordenadas }} nomeRede="Carrefour" />)

      expect(screen.queryByText('Waze')).not.toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('o link do Waze aparece também na versão compacta', () => {
      render(<LojaDoCartao filial={FILIAL} nomeRede="Carrefour" compacto />)

      expect(screen.getByRole('link', { name: /no Waze/ })).toBeInTheDocument()
    })

    it('clicar no Waze NÃO dispara o clique do cartão (não abre o detalhe do produto)', () => {
      const aoClicarNoCartao = jest.fn()
      render(
        <div onClick={aoClicarNoCartao}>
          <LojaDoCartao filial={FILIAL} nomeRede="Carrefour" />
        </div>
      )

      fireEvent.click(screen.getByRole('link', { name: /no Waze/ }))

      expect(aoClicarNoCartao).not.toHaveBeenCalled()
    })
  })
})
