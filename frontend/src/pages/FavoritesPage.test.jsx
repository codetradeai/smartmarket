import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FavoritesPage from './FavoritesPage'
import { favoritoService } from '../services'

jest.mock('../services', () => ({
  favoritoService: {
    listarMercados: jest.fn(),
    listarProdutos: jest.fn(),
    favoritarMercado: jest.fn(),
    desfavoritarMercado: jest.fn(),
    favoritarProduto: jest.fn(),
    desfavoritarProduto: jest.fn(),
  },
  produtoService: {},
  mercadoService: {},
}))

async function renderizar() {
  await act(async () => {
    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    )
  })
}

const cartaoDe = (nome) => screen.getByRole('heading', { name: nome }).closest('.group')
const abrirAba = (nome) => fireEvent.click(screen.getByRole('button', { name: new RegExp(nome) }))
const dialogo = () => screen.getByRole('dialog')

describe('FavoritesPage', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    favoritoService.listarMercados.mockResolvedValue([])
    favoritoService.listarProdutos.mockResolvedValue([])
    favoritoService.favoritarMercado.mockResolvedValue({})
    favoritoService.desfavoritarMercado.mockResolvedValue()
    favoritoService.favoritarProduto.mockResolvedValue()
    favoritoService.desfavoritarProduto.mockResolvedValue()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('favoritos iniciais e persistencia', () => {
    it('comeca com os produtos e mercados favoritos padrao e os salva no navegador', async () => {
      await renderizar()

      expect(screen.getByRole('heading', { level: 1, name: 'Meus Favoritos' })).toBeInTheDocument()
      expect(screen.getByText('4 produtos · 2 mercados')).toBeInTheDocument()
      expect(JSON.parse(localStorage.getItem('sm_fav_products'))).toEqual(['p1', 'p3', 'p9', 'p17'])
      expect(JSON.parse(localStorage.getItem('sm_fav_markets'))).toEqual(['fort', 'carrefour'])
      expect(screen.getByRole('heading', { name: 'Arroz Branco Tipo 1' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Café Torrado e Moído' })).toBeInTheDocument()
    })

    it('usa os favoritos guardados no navegador', async () => {
      localStorage.setItem('sm_fav_products', JSON.stringify(['p2']))
      localStorage.setItem('sm_fav_markets', JSON.stringify(['big']))
      await renderizar()

      expect(screen.getByText('1 produtos · 1 mercados')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Arroz Parboilizado' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()
    })

    it('volta aos favoritos padrao quando o armazenamento esta corrompido', async () => {
      localStorage.setItem('sm_fav_products', '{nao-e-json')
      localStorage.setItem('sm_fav_markets', '{nao-e-json')
      await renderizar()

      expect(screen.getByText('4 produtos · 2 mercados')).toBeInTheDocument()
    })

    it('funciona mesmo quando nao consegue gravar no navegador', async () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('cota excedida')
      })
      await renderizar()

      expect(screen.getByText('4 produtos · 2 mercados')).toBeInTheDocument()
      fireEvent.click(within(cartaoDe('Arroz Branco Tipo 1')).getByTitle('Remover dos favoritos'))
      expect(screen.getByText('3 produtos · 2 mercados')).toBeInTheDocument()
    })

    it('substitui os favoritos pelos devolvidos pelo servidor', async () => {
      favoritoService.listarProdutos.mockResolvedValue([{ produtoId: 'p2' }, { id: 'p4' }, 'p5'])
      favoritoService.listarMercados.mockResolvedValue([{ mercadoId: 'big' }])
      await renderizar()

      expect(screen.getByText('3 produtos · 1 mercados')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Arroz Parboilizado' })).toBeInTheDocument()
    })

    it('mantem os favoritos locais quando o servidor devolve listas vazias', async () => {
      await renderizar()
      expect(screen.getByText('4 produtos · 2 mercados')).toBeInTheDocument()
    })

    it('mantem os favoritos locais quando o servidor falha', async () => {
      favoritoService.listarMercados.mockRejectedValue(new Error('offline'))
      await renderizar()

      expect(screen.getByText('4 produtos · 2 mercados')).toBeInTheDocument()
    })
  })

  describe('banner de economia', () => {
    it('indica o mercado mais barato entre os favoritos', async () => {
      await renderizar()

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'O Fort Atacadista é o mais barato em 4 dos seus 4 favoritos!'
      )
      expect(screen.getByRole('link', { name: 'Calcular Cesta Completa' })).toHaveAttribute('href', '/list')
    })

    it('some quando nao ha produtos favoritos', async () => {
      localStorage.setItem('sm_fav_products', '[]')
      await renderizar()

      expect(screen.queryByText('Economia Inteligente')).not.toBeInTheDocument()
    })
  })

  describe('aba de produtos', () => {
    it('mostra marca, unidade, oferta e o menor preco com o mercado', async () => {
      await renderizar()

      const cartao = within(cartaoDe('Arroz Branco Tipo 1'))
      expect(cartao.getByText('Tio João')).toBeInTheDocument()
      expect(cartao.getByText('· 5 kg')).toBeInTheDocument()
      expect(cartao.getByText('OFERTA')).toBeInTheDocument()
      expect(cartao.getByText('R$ 22.90')).toBeInTheDocument()
      expect(cartao.getByText('Fort Atacadista')).toBeInTheDocument()
      expect(within(cartaoDe('Feijão Carioca')).queryByText('OFERTA')).not.toBeInTheDocument()
    })

    it('filtra por busca e mostra aviso quando nada corresponde', async () => {
      await renderizar()
      const campo = screen.getByPlaceholderText('Buscar em favoritos...')

      fireEvent.change(campo, { target: { value: 'feij' } })
      expect(screen.getByRole('heading', { name: 'Feijão Carioca' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()

      fireEvent.change(campo, { target: { value: 'zzz' } })
      expect(screen.getByRole('heading', { name: 'Nenhum produto favorito encontrado' })).toBeInTheDocument()

      fireEvent.click(screen.getByTitle('Limpar campo'))
      expect(screen.getByRole('heading', { name: 'Arroz Branco Tipo 1' })).toBeInTheDocument()
    })

    it('busca tambem pela marca', async () => {
      await renderizar()

      fireEvent.change(screen.getByPlaceholderText('Buscar em favoritos...'), { target: { value: 'italac' } })

      expect(screen.getByRole('heading', { name: 'Leite Integral UHT' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Feijão Carioca' })).not.toBeInTheDocument()
    })

    it('filtra por categoria', async () => {
      await renderizar()

      fireEvent.click(screen.getByRole('button', { name: /Leites e Derivados/ }))
      expect(screen.getByRole('heading', { name: 'Leite Integral UHT' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Todos/ }))
      expect(screen.getByRole('heading', { name: 'Arroz Branco Tipo 1' })).toBeInTheDocument()
    })

    it('mostra o estado vazio quando nao ha nenhum favorito', async () => {
      localStorage.setItem('sm_fav_products', '[]')
      await renderizar()

      expect(screen.getByRole('heading', { name: 'Você ainda não favoritou nenhum produto' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ir para o Catálogo' })).toHaveAttribute('href', '/catalog')
    })

    it('remove um produto dos favoritos, avisa e informa o servidor', async () => {
      await renderizar()

      fireEvent.click(within(cartaoDe('Arroz Branco Tipo 1')).getByTitle('Remover dos favoritos'))

      expect(screen.getByText('Produto removido dos favoritos.')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()
      expect(screen.getByText('3 produtos · 2 mercados')).toBeInTheDocument()
      expect(JSON.parse(localStorage.getItem('sm_fav_products'))).toEqual(['p3', 'p9', 'p17'])
      expect(favoritoService.desfavoritarProduto).toHaveBeenCalledWith('p1')
    })

    it('mantem a remocao local mesmo se o servidor falhar', async () => {
      favoritoService.desfavoritarProduto.mockRejectedValue(new Error('offline'))
      await renderizar()

      await act(async () => {
        fireEvent.click(within(cartaoDe('Arroz Branco Tipo 1')).getByTitle('Remover dos favoritos'))
      })

      expect(screen.queryByRole('heading', { name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()
    })

    it('adiciona o produto a lista de compras e avisa', async () => {
      await renderizar()
      const botao = () => within(cartaoDe('Arroz Branco Tipo 1')).getByRole('button', { name: '+ Lista' })

      fireEvent.click(botao())
      fireEvent.click(botao())

      expect(screen.getByText('Adicionado à sua lista de compras!')).toBeInTheDocument()
      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({ p1: 2 })
    })

    it('usa lista vazia quando a lista da sessao esta corrompida', async () => {
      sessionStorage.setItem('sm_list', '{nao-e-json')
      await renderizar()

      fireEvent.click(within(cartaoDe('Arroz Branco Tipo 1')).getByRole('button', { name: '+ Lista' }))

      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({ p1: 1 })
    })

    it('some o aviso sozinho depois de 3 segundos', async () => {
      await renderizar()
      jest.useFakeTimers()

      fireEvent.click(within(cartaoDe('Arroz Branco Tipo 1')).getByRole('button', { name: '+ Lista' }))
      expect(screen.getByText('Adicionado à sua lista de compras!')).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(3000)
      })
      expect(screen.queryByText('Adicionado à sua lista de compras!')).not.toBeInTheDocument()
    })
  })

  describe('aba de mercados', () => {
    it('lista os tres mercados com quantos favoritos cada um tem mais barato', async () => {
      await renderizar()

      abrirAba('Mercados Favoritos')

      expect(screen.getByRole('heading', { name: 'Fort Atacadista' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Carrefour' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Big Bompreço' })).toBeInTheDocument()
      expect(screen.getByText('4 itens')).toBeInTheDocument()
      expect(screen.getAllByText('0 itens')).toHaveLength(2)
      expect(screen.getAllByTitle('Remover dos favoritos')).toHaveLength(2)
      expect(screen.getAllByTitle('Favoritar mercado')).toHaveLength(1)
      expect(screen.getAllByRole('link', { name: 'Ver Ofertas' })[0]).toHaveAttribute('href', '/catalog')
    })

    it('favorita um mercado, avisa e informa o servidor', async () => {
      await renderizar()
      abrirAba('Mercados Favoritos')

      fireEvent.click(screen.getByTitle('Favoritar mercado'))

      expect(screen.getByText('Mercado adicionado aos favoritos!')).toBeInTheDocument()
      expect(favoritoService.favoritarMercado).toHaveBeenCalledWith('big')
      expect(JSON.parse(localStorage.getItem('sm_fav_markets'))).toEqual(['fort', 'carrefour', 'big'])
      expect(screen.getAllByText('★ Favoritado')).toHaveLength(3)
    })

    it('desfavorita um mercado pelo botao de texto, avisa e informa o servidor', async () => {
      await renderizar()
      abrirAba('Mercados Favoritos')

      fireEvent.click(screen.getAllByRole('button', { name: '★ Favoritado' })[0])

      expect(screen.getByText('Mercado removido dos favoritos.')).toBeInTheDocument()
      expect(favoritoService.desfavoritarMercado).toHaveBeenCalledWith('fort')
      expect(screen.getAllByRole('button', { name: 'Favoritar' })).toHaveLength(2)
    })

    it('mantem a mudanca local mesmo se o servidor falhar', async () => {
      favoritoService.favoritarMercado.mockRejectedValue(new Error('offline'))
      await renderizar()
      abrirAba('Mercados Favoritos')

      await act(async () => {
        fireEvent.click(screen.getByTitle('Favoritar mercado'))
      })

      expect(screen.getAllByText('★ Favoritado')).toHaveLength(3)
    })
  })

  describe('alertas de preco', () => {
    async function abrirModalDeAlerta(produto = 'Arroz Branco Tipo 1') {
      fireEvent.click(within(cartaoDe(produto)).getByTitle('Definir alerta de preço'))
    }

    it('abre o modal com o preco alvo sugerido (10% abaixo do menor preco)', async () => {
      await renderizar()

      await abrirModalDeAlerta()

      expect(within(dialogo()).getByRole('heading', { name: 'Definir Alerta de Preço' })).toBeInTheDocument()
      expect(within(dialogo()).getByText('Arroz Branco Tipo 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Preço Alvo Desejado (R$)')).toHaveValue(20.61)
    })

    it('salva o alerta, mostra no cartao, na aba de alertas e grava no navegador', async () => {
      await renderizar()
      await abrirModalDeAlerta()

      fireEvent.change(screen.getByLabelText('Preço Alvo Desejado (R$)'), { target: { value: '19.90' } })
      fireEvent.submit(dialogo().querySelector('form'))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByText('Alerta de R$ 19.90 salvo para Arroz Branco Tipo 1!')).toBeInTheDocument()
      expect(within(cartaoDe('Arroz Branco Tipo 1')).getByText('🔔 Alvo: R$ 19.90')).toBeInTheDocument()
      expect(JSON.parse(localStorage.getItem('sm_price_alerts'))).toEqual({ p1: 19.9 })
      expect(screen.getByRole('button', { name: /Alertas de Preço/ })).toHaveTextContent('1')
    })

    it.each([
      ['vazio', ''],
      ['negativo', '-3'],
      ['zero', '0'],
    ])('nao salva alerta com valor %s e mantem o modal aberto', async (_nome, valor) => {
      await renderizar()
      await abrirModalDeAlerta()

      fireEvent.change(screen.getByLabelText('Preço Alvo Desejado (R$)'), { target: { value: valor } })
      fireEvent.submit(dialogo().querySelector('form'))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(localStorage.getItem('sm_price_alerts')).toBeNull()
    })

    it('reabre o modal com o alerta ja salvo', async () => {
      localStorage.setItem('sm_price_alerts', JSON.stringify({ p1: 21 }))
      await renderizar()

      await abrirModalDeAlerta()

      expect(screen.getByLabelText('Preço Alvo Desejado (R$)')).toHaveValue(21)
    })

    it('cancela sem salvar', async () => {
      await renderizar()
      await abrirModalDeAlerta()

      fireEvent.click(within(dialogo()).getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(localStorage.getItem('sm_price_alerts')).toBeNull()
    })

    it('remove o alerta pelo cartao do produto', async () => {
      localStorage.setItem('sm_price_alerts', JSON.stringify({ p1: 21 }))
      await renderizar()

      fireEvent.click(within(cartaoDe('Arroz Branco Tipo 1')).getByTitle('Remover alerta'))

      expect(screen.getByText('Alerta de preço removido.')).toBeInTheDocument()
      expect(JSON.parse(localStorage.getItem('sm_price_alerts'))).toEqual({})
    })

    it('ignora alertas guardados com JSON corrompido', async () => {
      localStorage.setItem('sm_price_alerts', '{nao-e-json')
      await renderizar()

      expect(screen.getByRole('button', { name: /Alertas de Preço/ })).toHaveTextContent('0')
    })

    it('mostra o estado vazio da aba de alertas e volta para os favoritos', async () => {
      await renderizar()
      abrirAba('Alertas de Preço')

      expect(screen.getByRole('heading', { name: 'Nenhum alerta de preço configurado' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Ver Meus Favoritos' }))

      expect(screen.getByRole('region', { name: 'Produtos Favoritos' })).toBeInTheDocument()
    })

    it('mostra "Meta Atingida" quando o preco atual esta no alvo ou abaixo', async () => {
      localStorage.setItem('sm_price_alerts', JSON.stringify({ p1: 25 }))
      await renderizar()
      abrirAba('Alertas de Preço')

      expect(screen.getByText('🎉 Meta Atingida!')).toBeInTheDocument()
      expect(screen.getByText('R$ 25.00')).toBeInTheDocument()
      expect(screen.getByText('R$ 22.90')).toBeInTheDocument()
    })

    it('mostra "Aguardando Baixa" quando o preco atual ainda esta acima do alvo', async () => {
      localStorage.setItem('sm_price_alerts', JSON.stringify({ p3: 5 }))
      await renderizar()
      abrirAba('Alertas de Preço')

      expect(screen.getByText('Aguardando Baixa')).toBeInTheDocument()
    })

    it('ignora alertas de produtos que nao existem mais', async () => {
      localStorage.setItem('sm_price_alerts', JSON.stringify({ inexistente: 10 }))
      await renderizar()
      abrirAba('Alertas de Preço')

      expect(screen.queryByText('Excluir Alerta')).not.toBeInTheDocument()
    })

    it('exclui um alerta e adiciona o produto a lista pela aba de alertas', async () => {
      localStorage.setItem('sm_price_alerts', JSON.stringify({ p1: 25 }))
      await renderizar()
      abrirAba('Alertas de Preço')

      fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({ p1: 1 })

      fireEvent.click(screen.getByRole('button', { name: 'Excluir Alerta' }))
      expect(screen.getByRole('heading', { name: 'Nenhum alerta de preço configurado' })).toBeInTheDocument()
    })
  })
})
