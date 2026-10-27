import { act, fireEvent, render, screen, within } from '@testing-library/react'
import AdminPage from './AdminPage'
import { produtoService, mercadoService, adminService } from '../services'
import { PRODUCTS } from '../data'

jest.mock('../services', () => ({
  produtoService: {
    buscarCatalogoComPrecos: jest.fn(),
    atualizar: jest.fn(),
    criar: jest.fn(),
    remover: jest.fn(),
  },
  mercadoService: { listar: jest.fn(), atualizar: jest.fn(), criar: jest.fn() },
  adminService: { listarUsuarios: jest.fn(), obterPainel: jest.fn(), alterarPapel: jest.fn() },
}))

const PRODUTO_API = {
  id: 1,
  name: 'Arroz Integral',
  brand: 'Camil',
  category: 'graos',
  unit: '1 kg',
  image: '🌾',
  promo: true,
  prices: { fort: 7.5, carrefour: 8, big: null },
}

const MERCADO_API = {
  id: 1,
  name: 'Fort Atacadista',
  city: 'Porto Alegre',
  address: 'Av. Teste, 10',
  active: true,
  products: 12,
  lastSync: 'Ontem',
}

async function renderizar({ painel = null, produtos = [], mercados = [], usuarios = null } = {}) {
  produtoService.buscarCatalogoComPrecos.mockResolvedValue(produtos)
  mercadoService.listar.mockResolvedValue(mercados)
  adminService.listarUsuarios.mockResolvedValue(usuarios)
  adminService.obterPainel.mockResolvedValue(painel)
  await act(async () => {
    render(<AdminPage />)
  })
}

const kpi = (rotulo) => screen.getByText(rotulo).closest('div').querySelector('h3')
const abrirAba = (nome) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`${nome} \\(\\d+\\)`) }))
const linhaDe = (texto) => screen.getByText(texto).closest('tr')
const modal = () => screen.getByRole('dialog')
const campo = (rotulo) => within(modal()).getByLabelText(rotulo)

describe('AdminPage', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    produtoService.atualizar.mockResolvedValue({})
    produtoService.criar.mockResolvedValue({ id: 99 })
    produtoService.remover.mockResolvedValue()
    mercadoService.atualizar.mockResolvedValue({})
    mercadoService.criar.mockResolvedValue({ id: 77 })
    adminService.alterarPapel.mockResolvedValue({})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('carregamento', () => {
    it('mostra os dados locais enquanto o backend nao responde com dados', async () => {
      await renderizar()

      expect(screen.getByRole('heading', { level: 1, name: 'Painel Administrativo' })).toBeInTheDocument()
      expect(kpi('Produtos no Catálogo')).toHaveTextContent(String(PRODUCTS.length))
      expect(kpi('Redes Monitoradas')).toHaveTextContent('3')
      expect(kpi('Usuários Totais')).toHaveTextContent('5')
      expect(screen.getByRole('button', { name: `📦 Produtos (${PRODUCTS.length})` })).toBeInTheDocument()
    })

    it('usa as metricas do painel quando o backend as informa', async () => {
      await renderizar({ painel: { produtos: 100, mercados: 4, usuarios: 50 } })

      expect(kpi('Produtos no Catálogo')).toHaveTextContent('100')
      expect(kpi('Redes Monitoradas')).toHaveTextContent('4')
      expect(kpi('Usuários Totais')).toHaveTextContent('50')
    })

    it('substitui produtos e mercados pelos dados do backend', async () => {
      await renderizar({ produtos: [PRODUTO_API], mercados: [MERCADO_API] })

      expect(screen.getByRole('button', { name: /Produtos \(1\)/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Mercados \(1\)/ })).toBeInTheDocument()
      expect(screen.getByText('Arroz Integral')).toBeInTheDocument()
    })

    it('converte usuarios paginados do backend, inclusive suspensos', async () => {
      await renderizar({
        usuarios: {
          content: [
            { id: 9, nome: 'Ana', email: 'ana@email.com', papel: 'ADMIN', createdAt: '2026-10-01T10:00:00', lists: 2, ativo: false },
          ],
        },
      })
      abrirAba('Usuários')

      const linha = within(linhaDe('Ana'))
      expect(linha.getByText('ana@email.com')).toBeInTheDocument()
      expect(linha.getByText('ADMIN')).toBeInTheDocument()
      expect(linha.getByText('2026-10-01')).toBeInTheDocument()
      expect(linha.getByText('SUSPENSO')).toBeInTheDocument()
    })

    it('aceita lista simples de usuarios e preenche valores padrao', async () => {
      await renderizar({ usuarios: [{ id: 3, name: 'Bia', email: 'bia@email.com' }] })
      abrirAba('Usuários')

      const linha = within(linhaDe('Bia'))
      expect(linha.getByText('USER')).toBeInTheDocument()
      expect(linha.getByText('2026-10-10')).toBeInTheDocument()
      expect(linha.getByText('0')).toBeInTheDocument()
      expect(linha.getByText('ATIVO')).toBeInTheDocument()
    })

    it('mantem os dados locais quando as chamadas ao backend falham', async () => {
      produtoService.buscarCatalogoComPrecos.mockRejectedValue(new Error('offline'))
      mercadoService.listar.mockRejectedValue(new Error('offline'))
      adminService.listarUsuarios.mockRejectedValue(new Error('offline'))
      adminService.obterPainel.mockRejectedValue(new Error('offline'))
      await act(async () => {
        render(<AdminPage />)
      })

      expect(kpi('Produtos no Catálogo')).toHaveTextContent(String(PRODUCTS.length))
      expect(kpi('Usuários Totais')).toHaveTextContent('5')
    })

    it('ignora a resposta do backend se o componente for desmontado antes dela chegar', async () => {
      const erro = jest.spyOn(console, 'error').mockImplementation(() => {})
      let responder
      produtoService.buscarCatalogoComPrecos.mockReturnValue(new Promise((resolve) => { responder = resolve }))
      mercadoService.listar.mockResolvedValue([])
      adminService.listarUsuarios.mockResolvedValue(null)
      adminService.obterPainel.mockResolvedValue(null)
      const { unmount } = render(<AdminPage />)
      unmount()

      await act(async () => {
        responder([PRODUTO_API])
      })

      expect(erro).not.toHaveBeenCalled()
    })
  })

  describe('aba de produtos', () => {
    it('mostra a tabela com precos formatados, traco para precos ausentes e selo de promocao', async () => {
      await renderizar({ produtos: [PRODUTO_API] })

      const linha = within(linhaDe('Arroz Integral'))
      expect(linha.getByText('PROMO')).toBeInTheDocument()
      expect(linha.getByText('Camil')).toBeInTheDocument()
      expect(linha.getByText('Grãos')).toBeInTheDocument()
      expect(linha.getByText('R$ 7.50')).toBeInTheDocument()
      expect(linha.getByText('R$ 8.00')).toBeInTheDocument()
      expect(linha.getByText('—')).toBeInTheDocument()
    })

    it('mostra a categoria bruta quando ela nao existe na lista e usa icone padrao sem imagem', async () => {
      await renderizar({ produtos: [{ ...PRODUTO_API, id: 2, name: 'Item Raro', category: 'outra', image: '', promo: false, prices: {} }] })

      const linha = within(linhaDe('Item Raro'))
      expect(linha.getByText('outra')).toBeInTheDocument()
      expect(linha.getByText('📦')).toBeInTheDocument()
      expect(linha.queryByText('PROMO')).not.toBeInTheDocument()
      expect(linha.getAllByText('—')).toHaveLength(3)
    })

    it('filtra por nome ou marca e informa quantos registros exibe', async () => {
      await renderizar({ produtos: [PRODUTO_API, { ...PRODUTO_API, id: 2, name: 'Leite', brand: 'Italac' }] })
      const filtro = screen.getByPlaceholderText('Filtrar produtos...')

      fireEvent.change(filtro, { target: { value: 'italac' } })
      expect(screen.getByText('Leite')).toBeInTheDocument()
      expect(screen.queryByText('Arroz Integral')).not.toBeInTheDocument()
      expect(screen.getByText('Exibindo', { exact: false })).toHaveTextContent('Exibindo 1 registros')

      fireEvent.change(filtro, { target: { value: 'ARROZ' } })
      expect(screen.getByText('Arroz Integral')).toBeInTheDocument()
    })

    describe('novo produto', () => {
      const abrir = () => fireEvent.click(screen.getByRole('button', { name: /Novo Produto/ }))

      it('exige nome e marca', async () => {
        await renderizar({ produtos: [PRODUTO_API] })
        abrir()

        fireEvent.submit(modal().querySelector('form'))

        expect(screen.getByText('Por favor, preencha os campos obrigatórios.')).toBeInTheDocument()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(produtoService.criar).not.toHaveBeenCalled()
      })

      it('cadastra o produto no backend, mostra no topo da tabela e avisa', async () => {
        await renderizar({ produtos: [PRODUTO_API] })
        abrir()
        expect(within(modal()).getByRole('heading', { name: 'Novo Produto no Catálogo' })).toBeInTheDocument()

        fireEvent.change(campo('Nome do Produto'), { target: { value: 'Feijão Novo' } })
        fireEvent.change(campo('Marca'), { target: { value: 'Kicaldo' } })
        fireEvent.change(campo('Fort Atacadista'), { target: { value: '9.5' } })
        fireEvent.click(within(modal()).getByLabelText('Destacar como Oferta Promocional no Catálogo'))
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(produtoService.criar).toHaveBeenCalledWith(
          expect.objectContaining({ nome: 'Feijão Novo', marca: 'Kicaldo', categoria: 'graos', unidade: '1 kg' })
        )
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.getByText("Novo produto 'Feijão Novo' cadastrado!")).toBeInTheDocument()
        const linhas = screen.getAllByRole('row')
        expect(within(linhas[1]).getByText('Feijão Novo')).toBeInTheDocument()
        expect(within(linhas[1]).getByText('PROMO')).toBeInTheDocument()
        expect(within(linhas[1]).getByText('R$ 9.50')).toBeInTheDocument()
      })

      it('cadastra localmente mesmo se o backend falhar', async () => {
        produtoService.criar.mockRejectedValue(new Error('offline'))
        await renderizar({ produtos: [PRODUTO_API] })
        abrir()

        fireEvent.change(campo('Nome do Produto'), { target: { value: 'Item Offline' } })
        fireEvent.change(campo('Marca'), { target: { value: 'Marca X' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(screen.getByText('Item Offline')).toBeInTheDocument()
        expect(console.warn).toHaveBeenCalled()
      })

      it('permite trocar categoria e unidade e cancelar sem salvar', async () => {
        await renderizar({ produtos: [PRODUTO_API] })
        abrir()

        fireEvent.change(within(modal()).getByRole('combobox'), { target: { value: 'cafe' } })
        fireEvent.change(campo('Unidade / Peso'), { target: { value: '500 g' } })
        fireEvent.change(campo('Carrefour Mercado'), { target: { value: '1' } })
        fireEvent.change(campo('Big Bompreço'), { target: { value: '2' } })
        fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(produtoService.criar).not.toHaveBeenCalled()
      })
    })

    describe('editar produto', () => {
      it('abre o formulario preenchido e salva as alteracoes no backend (id numerico)', async () => {
        await renderizar({ produtos: [PRODUTO_API] })

        fireEvent.click(within(linhaDe('Arroz Integral')).getByRole('button', { name: 'Editar' }))
        expect(within(modal()).getByRole('heading', { name: 'Editar Produto' })).toBeInTheDocument()
        expect(campo('Nome do Produto')).toHaveValue('Arroz Integral')
        expect(campo('Fort Atacadista')).toHaveValue(7.5)
        expect(campo('Big Bompreço')).toHaveValue(null)
        expect(within(modal()).getByLabelText('Destacar como Oferta Promocional no Catálogo')).toBeChecked()

        fireEvent.change(campo('Nome do Produto'), { target: { value: 'Arroz Integral Premium' } })
        fireEvent.change(campo('Fort Atacadista'), { target: { value: '' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(produtoService.atualizar).toHaveBeenCalledWith(1, expect.objectContaining({ nome: 'Arroz Integral Premium' }))
        expect(screen.getByText("Produto 'Arroz Integral Premium' atualizado com sucesso!")).toBeInTheDocument()
        const linha = within(linhaDe('Arroz Integral Premium'))
        expect(linha.getByText('R$ 8.00')).toBeInTheDocument()
        expect(linha.getAllByText('—')).toHaveLength(2)
      })

      it('nao chama o backend para produtos locais (id textual), mas atualiza a tabela', async () => {
        await renderizar()

        fireEvent.click(within(linhaDe('Arroz Branco Tipo 1')).getByRole('button', { name: 'Editar' }))
        fireEvent.change(campo('Nome do Produto'), { target: { value: 'Arroz Local' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(produtoService.atualizar).not.toHaveBeenCalled()
        expect(screen.getByText('Arroz Local')).toBeInTheDocument()
      })

      it('atualiza a tabela mesmo se o backend falhar', async () => {
        produtoService.atualizar.mockRejectedValue(new Error('offline'))
        await renderizar({ produtos: [PRODUTO_API] })

        fireEvent.click(within(linhaDe('Arroz Integral')).getByRole('button', { name: 'Editar' }))
        fireEvent.change(campo('Nome do Produto'), { target: { value: 'Arroz Alterado' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(screen.getByText('Arroz Alterado')).toBeInTheDocument()
      })

      it('mantem as outras linhas intactas ao editar uma', async () => {
        await renderizar({ produtos: [PRODUTO_API, { ...PRODUTO_API, id: 2, name: 'Outro Produto' }] })

        fireEvent.click(within(linhaDe('Arroz Integral')).getByRole('button', { name: 'Editar' }))
        fireEvent.change(campo('Marca'), { target: { value: 'Nova Marca' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(within(linhaDe('Outro Produto')).getByText('Camil')).toBeInTheDocument()
      })
    })

    describe('excluir produto', () => {
      it('nao exclui quando o usuario cancela a confirmacao', async () => {
        window.confirm.mockReturnValue(false)
        await renderizar({ produtos: [PRODUTO_API] })

        fireEvent.click(within(linhaDe('Arroz Integral')).getByRole('button', { name: 'Excluir' }))

        expect(window.confirm).toHaveBeenCalledWith("Tem certeza que deseja excluir o produto 'Arroz Integral'?")
        expect(screen.getByText('Arroz Integral')).toBeInTheDocument()
        expect(produtoService.remover).not.toHaveBeenCalled()
      })

      it('exclui no backend (id numerico), remove da tabela e avisa', async () => {
        await renderizar({ produtos: [PRODUTO_API] })

        await act(async () => {
          fireEvent.click(within(linhaDe('Arroz Integral')).getByRole('button', { name: 'Excluir' }))
        })

        expect(produtoService.remover).toHaveBeenCalledWith(1)
        expect(screen.queryByText('Arroz Integral')).not.toBeInTheDocument()
        expect(screen.getByText("Produto 'Arroz Integral' removido do catálogo.")).toBeInTheDocument()
      })

      it('remove localmente produtos de id textual sem chamar o backend', async () => {
        await renderizar()

        await act(async () => {
          fireEvent.click(within(linhaDe('Arroz Branco Tipo 1')).getByRole('button', { name: 'Excluir' }))
        })

        expect(produtoService.remover).not.toHaveBeenCalled()
        expect(screen.queryByText('Arroz Branco Tipo 1')).not.toBeInTheDocument()
      })

      it('remove da tabela mesmo se o backend falhar', async () => {
        produtoService.remover.mockRejectedValue(new Error('offline'))
        await renderizar({ produtos: [PRODUTO_API] })

        await act(async () => {
          fireEvent.click(within(linhaDe('Arroz Integral')).getByRole('button', { name: 'Excluir' }))
        })

        expect(screen.queryByText('Arroz Integral')).not.toBeInTheDocument()
      })
    })
  })

  describe('aba de mercados', () => {
    it('lista os mercados com status e botao de novo mercado', async () => {
      await renderizar({ mercados: [MERCADO_API, { ...MERCADO_API, id: 2, name: 'Mercado Fechado', active: false, address: '' }] })
      abrirAba('Mercados')

      const ativo = within(linhaDe('Fort Atacadista'))
      expect(ativo.getByText('ATIVO')).toBeInTheDocument()
      expect(ativo.getByText('12 itens')).toBeInTheDocument()
      expect(ativo.getByText('Ontem')).toBeInTheDocument()
      const inativo = within(linhaDe('Mercado Fechado'))
      expect(inativo.getByText('INATIVO')).toBeInTheDocument()
      expect(inativo.getByText('—')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Novo Mercado/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Novo Produto/ })).not.toBeInTheDocument()
    })

    it('filtra por nome ou cidade e limpa o filtro ao trocar de aba', async () => {
      await renderizar({ mercados: [MERCADO_API, { ...MERCADO_API, id: 2, name: 'Outra Rede', city: 'Canoas' }] })
      abrirAba('Mercados')

      fireEvent.change(screen.getByPlaceholderText('Filtrar mercados...'), { target: { value: 'canoas' } })
      expect(screen.getByText('Outra Rede')).toBeInTheDocument()
      expect(screen.queryByText('Fort Atacadista')).not.toBeInTheDocument()

      abrirAba('Produtos')
      abrirAba('Mercados')
      expect(screen.getByText('Fort Atacadista')).toBeInTheDocument()
    })

    describe('novo mercado', () => {
      const abrir = async (opcoes) => {
        await renderizar(opcoes)
        abrirAba('Mercados')
        fireEvent.click(screen.getByRole('button', { name: /Novo Mercado/ }))
      }

      it('nao salva sem nome', async () => {
        await abrir({ mercados: [MERCADO_API] })

        fireEvent.submit(modal().querySelector('form'))

        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(mercadoService.criar).not.toHaveBeenCalled()
      })

      it('cadastra o mercado, mostra na tabela como pendente e avisa', async () => {
        await abrir({ mercados: [MERCADO_API] })
        expect(within(modal()).getByRole('heading', { name: 'Novo Supermercado' })).toBeInTheDocument()

        fireEvent.change(campo('Nome da Rede / Supermercado'), { target: { value: 'Rede Nova' } })
        fireEvent.change(campo('Cidade'), { target: { value: 'Gramado' } })
        fireEvent.change(campo('Endereço da Loja'), { target: { value: 'Rua Nova, 1' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(mercadoService.criar).toHaveBeenCalledWith({ nome: 'Rede Nova', cidade: 'Gramado', endereco: 'Rua Nova, 1', ativo: true })
        expect(screen.getByText("Novo supermercado 'Rede Nova' cadastrado!")).toBeInTheDocument()
        const linha = within(linhaDe('Rede Nova'))
        expect(linha.getByText('Pendente primeira coleta')).toBeInTheDocument()
        expect(linha.getByText('0 itens')).toBeInTheDocument()
      })

      it('gera um identificador a partir do nome se o backend falhar', async () => {
        mercadoService.criar.mockRejectedValue(new Error('offline'))
        await abrir({ mercados: [MERCADO_API] })

        fireEvent.change(campo('Nome da Rede / Supermercado'), { target: { value: 'Rede Offline' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(screen.getByText('Rede Offline')).toBeInTheDocument()
        expect(console.warn).toHaveBeenCalled()
      })

      it('permite cancelar', async () => {
        await abrir({ mercados: [MERCADO_API] })

        fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    describe('editar mercado', () => {
      it('abre preenchido, salva no backend (id numerico) e atualiza a tabela', async () => {
        await renderizar({ mercados: [MERCADO_API, { ...MERCADO_API, id: 2, name: 'Outra Rede' }] })
        abrirAba('Mercados')

        fireEvent.click(within(linhaDe('Fort Atacadista')).getByRole('button', { name: 'Editar' }))
        expect(within(modal()).getByRole('heading', { name: 'Editar Supermercado' })).toBeInTheDocument()
        expect(campo('Nome da Rede / Supermercado')).toHaveValue('Fort Atacadista')
        expect(campo('Cidade')).toHaveValue('Porto Alegre')

        fireEvent.change(campo('Nome da Rede / Supermercado'), { target: { value: 'Fort Renovado' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(mercadoService.atualizar).toHaveBeenCalledWith(1, expect.objectContaining({ nome: 'Fort Renovado' }))
        expect(screen.getByText("Rede 'Fort Renovado' atualizada com sucesso!")).toBeInTheDocument()
        expect(screen.getByText('Fort Renovado')).toBeInTheDocument()
        expect(screen.getByText('Outra Rede')).toBeInTheDocument()
      })

      it('nao chama o backend para mercados locais (id textual)', async () => {
        await renderizar()
        abrirAba('Mercados')

        fireEvent.click(within(linhaDe('Fort Atacadista')).getByRole('button', { name: 'Editar' }))
        fireEvent.change(campo('Nome da Rede / Supermercado'), { target: { value: 'Fort Local' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(mercadoService.atualizar).not.toHaveBeenCalled()
        expect(screen.getByText('Fort Local')).toBeInTheDocument()
      })

      it('atualiza a tabela mesmo se o backend falhar', async () => {
        mercadoService.atualizar.mockRejectedValue(new Error('offline'))
        await renderizar({ mercados: [MERCADO_API] })
        abrirAba('Mercados')

        fireEvent.click(within(linhaDe('Fort Atacadista')).getByRole('button', { name: 'Editar' }))
        fireEvent.change(campo('Nome da Rede / Supermercado'), { target: { value: 'Fort Alterado' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(screen.getByText('Fort Alterado')).toBeInTheDocument()
      })
    })

    it('sincroniza um mercado, mostra carregamento e atualiza produtos e data', async () => {
      await renderizar({ mercados: [{ ...MERCADO_API, products: 0 }] })
      abrirAba('Mercados')
      jest.useFakeTimers()

      fireEvent.click(within(linhaDe('Fort Atacadista')).getByRole('button', { name: 'Sincronizar' }))
      expect(within(linhaDe('Fort Atacadista')).getByRole('button', { name: 'Carregando...' })).toBeDisabled()

      act(() => {
        jest.advanceTimersByTime(1800)
      })

      expect(screen.getByText("Scraper executado com sucesso para 'Fort Atacadista'! Preços atualizados.")).toBeInTheDocument()
      const linha = within(linhaDe('Fort Atacadista'))
      expect(linha.getByText('40 itens')).toBeInTheDocument()
      expect(linha.getByText(/^Hoje às /)).toBeInTheDocument()
      expect(linha.getByRole('button', { name: 'Sincronizar' })).toBeEnabled()
    })

    it('sincroniza apenas o mercado escolhido', async () => {
      await renderizar({ mercados: [{ ...MERCADO_API, products: 0 }, { ...MERCADO_API, id: 2, name: 'Outra Rede', products: 3 }] })
      abrirAba('Mercados')
      jest.useFakeTimers()

      fireEvent.click(within(linhaDe('Fort Atacadista')).getByRole('button', { name: 'Sincronizar' }))
      act(() => {
        jest.advanceTimersByTime(1800)
      })

      expect(within(linhaDe('Outra Rede')).getByText('3 itens')).toBeInTheDocument()
    })
  })

  describe('aba de usuarios', () => {
    it('lista os usuarios locais com papel e status', async () => {
      await renderizar()
      abrirAba('Usuários')

      const linha = within(linhaDe('Maria Santos'))
      expect(linha.getByText('maria@email.com')).toBeInTheDocument()
      expect(linha.getByText('USER')).toBeInTheDocument()
      expect(linha.getByText('7')).toBeInTheDocument()
      expect(linha.getByText('ATIVO')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Novo/ })).not.toBeInTheDocument()
    })

    it('filtra por nome ou e-mail', async () => {
      await renderizar()
      abrirAba('Usuários')
      const filtro = screen.getByPlaceholderText('Filtrar usuarios...')

      fireEvent.change(filtro, { target: { value: 'joao@' } })
      expect(screen.getByText('João Lima')).toBeInTheDocument()
      expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument()

      fireEvent.change(filtro, { target: { value: 'davi' } })
      expect(screen.getByText('Davi Souza')).toBeInTheDocument()
    })

    it('alterna o papel no backend, na tabela e avisa', async () => {
      await renderizar()
      abrirAba('Usuários')

      await act(async () => {
        fireEvent.click(within(linhaDe('Maria Santos')).getByRole('button', { name: 'Mudar Role' }))
      })

      expect(adminService.alterarPapel).toHaveBeenCalledWith(4, 'ADMIN')
      expect(within(linhaDe('Maria Santos')).getByText('ADMIN')).toBeInTheDocument()
      expect(screen.getByText('Papel do usuário Maria Santos alterado para ADMIN.')).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(within(linhaDe('Maria Santos')).getByRole('button', { name: 'Mudar Role' }))
      })
      expect(adminService.alterarPapel).toHaveBeenLastCalledWith(4, 'USER')
      expect(within(linhaDe('Maria Santos')).getByText('USER')).toBeInTheDocument()
    })

    it('altera o papel na tabela mesmo se o backend falhar', async () => {
      adminService.alterarPapel.mockRejectedValue(new Error('offline'))
      await renderizar()
      abrirAba('Usuários')

      await act(async () => {
        fireEvent.click(within(linhaDe('Davi Souza')).getByRole('button', { name: 'Mudar Role' }))
      })

      expect(within(linhaDe('Davi Souza')).getByText('USER')).toBeInTheDocument()
    })

    it('suspende e reativa um usuario, avisando a cada mudanca', async () => {
      await renderizar()
      abrirAba('Usuários')

      fireEvent.click(within(linhaDe('João Lima')).getByRole('button', { name: 'Suspender' }))
      expect(within(linhaDe('João Lima')).getByText('SUSPENSO')).toBeInTheDocument()
      expect(screen.getByText('Status do usuário João Lima alterado para SUSPENSO.')).toBeInTheDocument()

      fireEvent.click(within(linhaDe('João Lima')).getByRole('button', { name: 'Ativar' }))
      expect(within(linhaDe('João Lima')).getByText('ATIVO')).toBeInTheDocument()
      expect(screen.getByText('Status do usuário João Lima alterado para ATIVO.')).toBeInTheDocument()
    })

    it('altera o status apenas do usuario escolhido', async () => {
      await renderizar()
      abrirAba('Usuários')

      fireEvent.click(within(linhaDe('João Lima')).getByRole('button', { name: 'Suspender' }))

      expect(within(linhaDe('Maria Santos')).getByText('ATIVO')).toBeInTheDocument()
    })
  })

  it('o aviso some sozinho depois de 3,5 segundos', async () => {
    await renderizar()
    abrirAba('Usuários')
    jest.useFakeTimers()

    fireEvent.click(within(linhaDe('João Lima')).getByRole('button', { name: 'Suspender' }))
    expect(screen.getByText(/Status do usuário João Lima/)).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(3500)
    })
    expect(screen.queryByText(/Status do usuário João Lima/)).not.toBeInTheDocument()
  })
})
