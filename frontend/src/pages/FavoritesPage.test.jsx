import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FavoritesPage from './FavoritesPage'
import { AuthContext } from '../contexts/AuthContext'
import { favoritoService } from '../services'

// Catálogo real (src/data.js) tem 32 MB; os testes usam a fixture pequena.
jest.mock('../data', () => require('../test/dataFixture'))
// MARKETS, CATEGORIES e totais vêm do módulo leve; aqui derivados da mesma fixture.
jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../data')))

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

// Favoritos que a página grava quando não há nada guardado (getFavProducts/getFavMarkets).
const PRODUTOS_PADRAO = ['p1', 'p3', 'p9', 'p17']
const MERCADOS_PADRAO = ['fort', 'carrefour']

// Sessão de um usuário logado. Sem `auth`, a página é renderizada como visitante (fora do provider).
const USUARIO_LOGADO = { isAuthenticated: true, isAdmin: false, user: { nome: 'Ana', papel: 'USER' } }

async function renderizar({ auth = null } = {}) {
  const pagina = (
    <MemoryRouter>
      <FavoritesPage />
    </MemoryRouter>
  )
  let resultado
  await act(async () => {
    resultado = render(auth ? <AuthContext.Provider value={auth}>{pagina}</AuthContext.Provider> : pagina)
  })
  return resultado
}

const lerLocal = (chave) => JSON.parse(localStorage.getItem(chave))
const resumo = () => screen.getByText(/produtos · \d+ alertas ativos$/)
const cartaoDe = (nome) => screen.getByRole('heading', { level: 3, name: nome }).closest('.group')
const abaMercados = () => screen.getByRole('button', { name: /Mercados Favoritos \(Opcional\)/ })
const abaAlertas = () => screen.getByRole('button', { name: /Configurar & Ver Alertas de Preço/ })
const campoBusca = () => screen.getByPlaceholderText('Buscar em seus favoritos...')
const dialogo = () => screen.getByRole('dialog')
const campoPrecoAlvo = () => screen.getByLabelText('Preço Alvo Desejado (R$)')

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
    jest.restoreAllMocks()
  })

  describe('persistencia dos favoritos', () => {
    it('usa os favoritos guardados no navegador', async () => {
      localStorage.setItem('sm_fav_products', JSON.stringify(['p2']))
      localStorage.setItem('sm_fav_markets', JSON.stringify(['big']))
      await renderizar()

      expect(resumo()).toHaveTextContent('1 produtos · 0 alertas ativos')
      expect(abaMercados()).toHaveTextContent(/\(Opcional\)\s*1$/)
      expect(screen.getByRole('heading', { level: 3, name: 'Arroz Parboilizado' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 3, name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()
    })

    it.each([
      ['nao ha nada guardado', null],
      ['o armazenamento esta corrompido', '{nao-e-json'],
    ])('visitante volta aos favoritos padrao e os grava quando %s', async (_caso, conteudo) => {
      if (conteudo) {
        localStorage.setItem('sm_fav_products', conteudo)
        localStorage.setItem('sm_fav_markets', conteudo)
      }
      await renderizar()

      expect(resumo()).toHaveTextContent('4 produtos · 0 alertas ativos')
      expect(lerLocal('sm_fav_products')).toEqual(PRODUTOS_PADRAO)
      expect(lerLocal('sm_fav_markets')).toEqual(MERCADOS_PADRAO)
    })

    it('favoritos vazios continuam vazios ao reabrir a pagina', async () => {
      const { unmount } = await renderizar()
      for (const nome of ['Arroz Branco Tipo 1', 'Feijão Carioca', 'Leite Integral UHT', 'Café Torrado e Moído']) {
        fireEvent.click(within(cartaoDe(nome)).getByTitle('Remover dos favoritos'))
      }
      expect(lerLocal('sm_fav_products')).toEqual([])
      unmount()

      await renderizar()

      expect(screen.getByRole('heading', { name: 'Você ainda não favoritou nenhum produto' })).toBeInTheDocument()
      expect(resumo()).toHaveTextContent('0 produtos · 0 alertas ativos')
      expect(lerLocal('sm_fav_products')).toEqual([])
    })

    it('usuario logado nao recebe favoritos de demonstracao', async () => {
      await renderizar({ auth: USUARIO_LOGADO })

      expect(screen.getByRole('heading', { name: 'Você ainda não favoritou nenhum produto' })).toBeInTheDocument()
      expect(resumo()).toHaveTextContent('0 produtos · 0 alertas ativos')
      expect(abaMercados()).toHaveTextContent(/\(Opcional\)\s*0$/)
      expect(localStorage.getItem('sm_fav_products')).toBeNull()
      expect(localStorage.getItem('sm_fav_markets')).toBeNull()
    })

    it('substitui os favoritos pelos devolvidos pelo servidor e grava no navegador', async () => {
      favoritoService.listarProdutos.mockResolvedValue([{ produtoId: 'p2' }, { id: 'p4' }, 'p5'])
      favoritoService.listarMercados.mockResolvedValue([{ mercadoId: 'big' }])
      await renderizar()

      expect(resumo()).toHaveTextContent('3 produtos · 0 alertas ativos')
      expect(screen.getByRole('heading', { level: 3, name: 'Arroz Parboilizado' })).toBeInTheDocument()
      expect(lerLocal('sm_fav_products')).toEqual(['p2', 'p4', 'p5'])
      expect(lerLocal('sm_fav_markets')).toEqual(['big'])
    })

    // Achado 40: a resposta do servidor (que pode demorar com a API fria) trazia a foto antiga dos
    // favoritos e sobrescrevia o que o usuario fez enquanto esperava.
    describe('acoes feitas enquanto a carga do servidor esta pendente', () => {
      const pendente = () => {
        let resolver
        const promessa = new Promise((resolve) => {
          resolver = resolve
        })
        return { promessa, resolver }
      }

      it('nao desfaz um produto removido durante a carga', async () => {
        const { promessa, resolver } = pendente()
        favoritoService.listarProdutos.mockReturnValue(promessa)
        await renderizar()

        fireEvent.click(within(cartaoDe('Arroz Branco Tipo 1')).getByTitle('Remover dos favoritos'))
        expect(lerLocal('sm_fav_products')).toEqual(['p3', 'p9', 'p17'])

        // O servidor responde com a lista antiga, ainda contendo p1.
        await act(async () => {
          resolver(['p1', 'p3', 'p9', 'p17'])
        })

        expect(screen.queryByRole('heading', { level: 3, name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()
        expect(resumo()).toHaveTextContent('3 produtos · 0 alertas ativos')
        expect(lerLocal('sm_fav_products')).toEqual(['p3', 'p9', 'p17'])
      })

      it('mantem um mercado favoritado durante a carga mesmo que o servidor nao o conheca', async () => {
        const { promessa, resolver } = pendente()
        favoritoService.listarMercados.mockReturnValue(promessa)
        await renderizar()
        fireEvent.click(abaMercados())

        fireEvent.click(screen.getByTitle('Favoritar mercado'))
        expect(lerLocal('sm_fav_markets')).toEqual(['fort', 'carrefour', 'big'])

        await act(async () => {
          resolver([{ mercadoId: 'fort' }, { mercadoId: 'carrefour' }])
        })

        expect(lerLocal('sm_fav_markets')).toEqual(['fort', 'carrefour', 'big'])
        expect(screen.getAllByRole('button', { name: '★ Favoritado' })).toHaveLength(3)
      })

      it('nao desfaz um mercado desfavoritado durante a carga', async () => {
        const { promessa, resolver } = pendente()
        favoritoService.listarMercados.mockReturnValue(promessa)
        await renderizar()
        fireEvent.click(abaMercados())

        fireEvent.click(screen.getAllByRole('button', { name: '★ Favoritado' })[0])
        expect(lerLocal('sm_fav_markets')).toEqual(['carrefour'])

        await act(async () => {
          resolver([{ mercadoId: 'fort' }, { mercadoId: 'carrefour' }])
        })

        expect(lerLocal('sm_fav_markets')).toEqual(['carrefour'])
        expect(screen.getAllByRole('button', { name: '★ Favoritado' })).toHaveLength(1)
      })
    })

    it.each([
      ['devolve listas vazias', () => {}],
      ['falha', () => favoritoService.listarMercados.mockRejectedValue(new Error('offline'))],
    ])('mantem os favoritos locais quando o servidor %s', async (_caso, prepararServidor) => {
      prepararServidor()
      await renderizar()

      expect(resumo()).toHaveTextContent('4 produtos · 0 alertas ativos')
      expect(lerLocal('sm_fav_products')).toEqual(PRODUTOS_PADRAO)
    })
  })

  describe('precos dos favoritos', () => {
    it('indica o mercado mais barato entre os favoritos', async () => {
      await renderizar()

      const banner = screen.getByText('Economia Inteligente').parentElement
      expect(within(banner).getByRole('heading', { level: 2 })).toHaveTextContent(
        'O Fort Atacadista é o mais barato em 4 dos seus 4 favoritos!'
      )
      expect(screen.getByRole('link', { name: 'Calcular Cesta Completa' })).toHaveAttribute('href', '/list')
    })

    it('mostra no cartao o menor preco, o mercado e a economia em relacao ao mais caro', async () => {
      await renderizar()

      const cartao = within(cartaoDe('Arroz Branco Tipo 1'))
      expect(cartao.getByText('Melhor Preço (Fort Atacadista)')).toBeInTheDocument()
      expect(cartao.getByText('R$ 22.90')).toBeInTheDocument()
      expect(cartao.getByText('-R$ 1.60')).toBeInTheDocument()
      expect(cartao.getByText('Comparado em 3 mercados')).toBeInTheDocument()
    })
  })

  describe('aba de produtos', () => {
    it('filtra por busca, avisa quando nada corresponde e limpa a busca', async () => {
      await renderizar()

      fireEvent.change(campoBusca(), { target: { value: 'feij' } })
      expect(screen.getByRole('heading', { level: 3, name: 'Feijão Carioca' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 3, name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()

      fireEvent.change(campoBusca(), { target: { value: 'zzz' } })
      expect(screen.getByRole('heading', { name: 'Nenhum produto favorito encontrado neste filtro' })).toBeInTheDocument()

      fireEvent.click(screen.getByTitle('Limpar campo'))
      expect(screen.getByRole('heading', { level: 3, name: 'Arroz Branco Tipo 1' })).toBeInTheDocument()
    })

    it('busca tambem pela marca', async () => {
      await renderizar()

      fireEvent.change(campoBusca(), { target: { value: 'italac' } })

      expect(screen.getByRole('heading', { level: 3, name: 'Leite Integral UHT' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 3, name: 'Feijão Carioca' })).not.toBeInTheDocument()
    })

    it('filtra por categoria e volta a mostrar tudo em "Todos"', async () => {
      await renderizar()

      fireEvent.click(screen.getByTitle('Filtrar favoritos em Frios e Laticínios'))
      expect(screen.getByRole('heading', { level: 3, name: 'Leite Integral UHT' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 3, name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()

      fireEvent.click(screen.getByTitle('Filtrar favoritos em Todos'))
      expect(screen.getByRole('heading', { level: 3, name: 'Arroz Branco Tipo 1' })).toBeInTheDocument()
    })

    it('remove um produto dos favoritos, avisa e informa o servidor', async () => {
      await renderizar()

      fireEvent.click(within(cartaoDe('Arroz Branco Tipo 1')).getByTitle('Remover dos favoritos'))

      expect(screen.getByText('Produto removido dos favoritos.')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 3, name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()
      expect(resumo()).toHaveTextContent('3 produtos · 0 alertas ativos')
      expect(lerLocal('sm_fav_products')).toEqual(['p3', 'p9', 'p17'])
      expect(favoritoService.desfavoritarProduto).toHaveBeenCalledWith('p1')
    })

    it('mantem a remocao local mesmo se o servidor falhar', async () => {
      favoritoService.desfavoritarProduto.mockRejectedValue(new Error('offline'))
      await renderizar()

      await act(async () => {
        fireEvent.click(within(cartaoDe('Arroz Branco Tipo 1')).getByTitle('Remover dos favoritos'))
      })

      expect(screen.queryByRole('heading', { level: 3, name: 'Arroz Branco Tipo 1' })).not.toBeInTheDocument()
      expect(lerLocal('sm_fav_products')).toEqual(['p3', 'p9', 'p17'])
    })

    it('mostra o estado vazio e esconde o banner ao remover o ultimo favorito', async () => {
      await renderizar()

      for (const nome of ['Arroz Branco Tipo 1', 'Feijão Carioca', 'Leite Integral UHT', 'Café Torrado e Moído']) {
        fireEvent.click(within(cartaoDe(nome)).getByTitle('Remover dos favoritos'))
      }

      expect(screen.getByRole('heading', { name: 'Você ainda não favoritou nenhum produto' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ir para o Catálogo' })).toHaveAttribute('href', '/catalog')
      expect(screen.queryByText('Economia Inteligente')).not.toBeInTheDocument()
      expect(lerLocal('sm_fav_products')).toEqual([])
    })

    it('adiciona o produto a lista de compras e avisa', async () => {
      await renderizar()
      const botao = () => within(cartaoDe('Arroz Branco Tipo 1')).getByRole('button', { name: '+ Adicionar à Minha Lista' })

      fireEvent.click(botao())
      fireEvent.click(botao())

      expect(screen.getByText('Adicionado à sua lista de compras!')).toBeInTheDocument()
      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({ p1: 2 })
    })
  })

  describe('aba de mercados', () => {
    it('favorita um mercado, avisa e informa o servidor', async () => {
      await renderizar()
      fireEvent.click(abaMercados())

      fireEvent.click(screen.getByTitle('Favoritar mercado'))

      expect(screen.getByText('Mercado adicionado aos seus favoritos!')).toBeInTheDocument()
      expect(favoritoService.favoritarMercado).toHaveBeenCalledWith('big')
      expect(lerLocal('sm_fav_markets')).toEqual(['fort', 'carrefour', 'big'])
      expect(screen.getAllByRole('button', { name: '★ Favoritado' })).toHaveLength(3)
    })

    it('desfavorita um mercado pelo botao de texto, avisa e informa o servidor', async () => {
      await renderizar()
      fireEvent.click(abaMercados())

      fireEvent.click(screen.getAllByRole('button', { name: '★ Favoritado' })[0])

      expect(screen.getByText('Mercado removido dos favoritos.')).toBeInTheDocument()
      expect(favoritoService.desfavoritarMercado).toHaveBeenCalledWith('fort')
      expect(lerLocal('sm_fav_markets')).toEqual(['carrefour'])
      expect(screen.getAllByRole('button', { name: 'Favoritar Rede' })).toHaveLength(2)
    })

    it('mantem a mudanca local mesmo se o servidor falhar', async () => {
      favoritoService.favoritarMercado.mockRejectedValue(new Error('offline'))
      await renderizar()
      fireEvent.click(abaMercados())

      await act(async () => {
        fireEvent.click(screen.getByTitle('Favoritar mercado'))
      })

      expect(screen.getAllByRole('button', { name: '★ Favoritado' })).toHaveLength(3)
      expect(lerLocal('sm_fav_markets')).toEqual(['fort', 'carrefour', 'big'])
    })
  })

  describe('alertas de preco', () => {
    const abrirModalDeAlerta = (produto = 'Arroz Branco Tipo 1') =>
      fireEvent.click(within(cartaoDe(produto)).getByTitle('Definir alerta de preço'))

    it('abre o modal com o preco alvo sugerido (10% abaixo do menor preco)', async () => {
      await renderizar()

      abrirModalDeAlerta()

      expect(within(dialogo()).getByRole('heading', { name: 'Definir Alerta de Preço' })).toBeInTheDocument()
      expect(within(dialogo()).getByText('Arroz Branco Tipo 1')).toBeInTheDocument()
      expect(campoPrecoAlvo()).toHaveValue(20.61)
    })

    it('o configurador da aba de alertas sugere o mesmo preco alvo do modal (10% abaixo do menor preco)', async () => {
      await renderizar()
      fireEvent.click(abaAlertas())

      // Arroz Branco Tipo 1: menor preco 22,90 -> 20,61 (antes o configurador sugeria 21,07, 8%).
      expect(screen.getByPlaceholderText('Ex: 15.90')).toHaveValue(20.61)
    })

    it('ao trocar de produto no configurador, o preco alvo sugerido tambem e 10% abaixo', async () => {
      await renderizar()
      fireEvent.click(abaAlertas())

      fireEvent.click(screen.getByRole('button', { name: /Feijão Carioca/ }))

      // Feijão Carioca: menor preço 7,89 -> 7,10 (antes da correção a troca sugeria 8%: 7,26).
      expect(screen.getByPlaceholderText('Ex: 15.90')).toHaveValue(7.1)
    })

    it('salva o alerta, mostra no cartao, conta na aba de alertas e grava no navegador', async () => {
      await renderizar()
      abrirModalDeAlerta()

      fireEvent.change(campoPrecoAlvo(), { target: { value: '19.90' } })
      fireEvent.submit(dialogo().querySelector('form'))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByText('Alerta de R$ 19.90 salvo para Arroz Branco Tipo 1!')).toBeInTheDocument()
      expect(within(cartaoDe('Arroz Branco Tipo 1')).getByText('🔔 Alvo: R$ 19.90 (Qualquer mercado do RS)')).toBeInTheDocument()
      expect(lerLocal('sm_price_alerts')).toEqual({ p1: { targetPrice: 19.9, marketScope: 'todos' } })
      expect(abaAlertas()).toHaveTextContent(/Alertas de Preço\s*1$/)
      expect(resumo()).toHaveTextContent('4 produtos · 1 alertas ativos')
    })

    it.each([
      ['vazio', ''],
      ['negativo', '-3'],
      ['zero', '0'],
    ])('nao salva alerta com valor %s e mantem o modal aberto', async (_nome, valor) => {
      await renderizar()
      abrirModalDeAlerta()

      fireEvent.change(campoPrecoAlvo(), { target: { value: valor } })
      fireEvent.submit(dialogo().querySelector('form'))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(localStorage.getItem('sm_price_alerts')).toBeNull()
    })

    it('cancela sem salvar', async () => {
      await renderizar()
      abrirModalDeAlerta()

      fireEvent.click(within(dialogo()).getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(localStorage.getItem('sm_price_alerts')).toBeNull()
    })

    it('remove o alerta pelo cartao do produto', async () => {
      localStorage.setItem('sm_price_alerts', JSON.stringify({ p1: 21 }))
      await renderizar()

      fireEvent.click(within(cartaoDe('Arroz Branco Tipo 1')).getByTitle('Remover alerta'))

      expect(screen.getByText('Alerta de preço removido.')).toBeInTheDocument()
      expect(lerLocal('sm_price_alerts')).toEqual({})
    })

    it('mostra "Meta Atingida" quando o preco atual esta no alvo ou abaixo', async () => {
      localStorage.setItem('sm_price_alerts', JSON.stringify({ p1: 25 }))
      await renderizar()
      fireEvent.click(abaAlertas())

      expect(screen.getByText('🎉 Meta Atingida!')).toBeInTheDocument()
      expect(screen.queryByText('🔔 Monitorando preço')).not.toBeInTheDocument()
      expect(screen.getByText('R$ 25.00')).toBeInTheDocument()
      expect(screen.getByText('R$ 22.90 (Fort Atacadista)')).toBeInTheDocument()
    })

    it('mostra "Monitorando preço" quando o preco atual ainda esta acima do alvo', async () => {
      // Feijão Carioca: menor preço 7.89 (Fort) > alvo 5.
      localStorage.setItem('sm_price_alerts', JSON.stringify({ p3: 5 }))
      await renderizar()
      fireEvent.click(abaAlertas())

      expect(screen.getByText('🔔 Monitorando preço')).toBeInTheDocument()
      expect(screen.queryByText('🎉 Meta Atingida!')).not.toBeInTheDocument()
      expect(screen.getByText('R$ 7.89 (Fort Atacadista)')).toBeInTheDocument()
    })

    it('exclui um alerta e adiciona o produto a lista pela aba de alertas', async () => {
      localStorage.setItem('sm_price_alerts', JSON.stringify({ p1: 25 }))
      await renderizar()
      fireEvent.click(abaAlertas())

      fireEvent.click(screen.getByRole('button', { name: '+ Lista' }))
      expect(JSON.parse(sessionStorage.getItem('sm_list'))).toEqual({ p1: 1 })

      fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
      expect(
        screen.getByText('Você ainda não tem alertas salvos. Use o painel acima para criar o seu primeiro alerta!')
      ).toBeInTheDocument()
      expect(lerLocal('sm_price_alerts')).toEqual({})
    })
  })
})
