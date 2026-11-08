import { act, fireEvent, render, screen, within } from '@testing-library/react'
import AdminPage from './AdminPage'
import { produtoService, mercadoService, adminService } from '../services'
import { PRODUCTS } from '../data'

// O catálogo real (src/data.js) tem ~32 MB e 9.406 produtos: importá-lo custa ~11 s por arquivo e
// renderizar a tabela leva ~20 s por teste, o que fazia esta suíte nunca terminar no CI.
// Aqui usamos uma fixture pequena, com os mesmos formatos (id textual = dado local, sem backend).
// MARKETS, CATEGORIES e totais vêm do módulo leve; aqui derivados do mesmo catálogo mockado abaixo.
jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../data')))
jest.mock('../data', () => ({
  CATEGORIES: [
    { id: 'todos', label: 'Todos os Departamentos', icon: '🏪' },
    { id: 'graos', label: 'Grãos, Arroz e Farinhas', icon: '🌾' },
    { id: 'padaria', label: 'Padaria e Confeitaria', icon: '🥖' },
    { id: 'hortifruti', label: 'Hortifruti e Feira', icon: '🍎' },
    { id: 'carnes', label: 'Açougue e Carnes Nobres', icon: '🥩' },
    { id: 'leites', label: 'Leites e Laticínios', icon: '🥛' },
    { id: 'cafe', label: 'Café, Chá e Matinais', icon: '☕' },
    { id: 'bebidas', label: 'Bebidas e Cervejas', icon: '🍺' },
    { id: 'limpeza', label: 'Limpeza e Lavanderia', icon: '🧹' },
    { id: 'higiene', label: 'Higiene e Cuidados Pessoais', icon: '🧴' },
    { id: 'congelados', label: 'Congelados e Pratos Prontos', icon: '🧊' },
    { id: 'oleos', label: 'Óleos, Azeites e Vinagres', icon: '🫙' },
    { id: 'mercearia', label: 'Mercearia e Despensa', icon: '🛒' },
    { id: 'bazar', label: 'Bazar e Descartáveis', icon: '🍽️' },
    { id: 'biscoitos', label: 'Biscoitos e Chocolates', icon: '🍪' },
  ],
  MARKETS: [
    { id: 'fort', name: 'Fort Atacadista', color: '#F5651B', sigla: 'FA', cidade: 'Canoas / Grande POA', city: 'Canoas', address: 'Av. Local, 1', active: true, products: 3, lastSync: 'Hoje às 08:00' },
    { id: 'carrefour', name: 'Carrefour Mercado', color: '#1A63B9', sigla: 'CF', cidade: 'Porto Alegre / RS', city: 'Porto Alegre', address: 'Av. Local, 2', active: true, products: 3, lastSync: 'Hoje às 08:00' },
    { id: 'zaffari', name: 'Zaffari / Bourbon', color: '#7A1526', sigla: 'ZF', cidade: 'Porto Alegre / RS', city: 'Porto Alegre', address: 'Av. Local, 3', active: true, products: 3, lastSync: 'Hoje às 08:00' },
  ],
  PRODUCTS: [
    { id: 'p1', name: 'Arroz Branco Tipo 1', brand: 'Camil', category: 'graos', unit: '5 kg', image: '🌾', promo: false, prices: { fort: 28.9, carrefour: 29.9, zaffari: 31.5 } },
    { id: 'p2', name: 'Leite Integral', brand: 'Italac', category: 'leites', unit: '1 L', image: '🥛', promo: false, prices: { fort: 4.99, carrefour: 5.49, zaffari: 5.79 } },
    { id: 'p3', name: 'Café em Pó Tradicional', brand: 'Melitta', category: 'cafe', unit: '500 g', image: '☕', promo: true, prices: { fort: 23.9, carrefour: 25.9, zaffari: 26.5 } },
  ],
}))

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

const USUARIOS_API = {
  content: [
    { id: 1, nome: 'Davi Souza', email: 'davi@smartmarket.com.br', papel: 'ADMIN', createdAt: '2026-10-10T08:00:00', lists: 3, ativo: true },
    { id: 4, nome: 'Maria Santos', email: 'maria@email.com', papel: 'USER', createdAt: '2026-10-14T08:00:00', lists: 7, ativo: true },
    { id: 5, nome: 'João Lima', email: 'joao@email.com', papel: 'USER', createdAt: '2026-10-15T08:00:00', lists: 2, ativo: true },
  ],
}

// Erro do axios com a resposta do backend ({ erro, campos } do GlobalExceptionHandler)
const erroHttp = (status, data) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } })

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
const abrirAba = (nome) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`${nome} \\(.+\\)`) }))
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
    it('mostra os produtos locais, sem inventar usuarios, enquanto o backend nao responde com dados', async () => {
      await renderizar()

      expect(screen.getByRole('heading', { level: 1, name: 'Painel Administrativo' })).toBeInTheDocument()
      expect(kpi('Produtos no Catálogo')).toHaveTextContent(String(PRODUCTS.length))
      expect(kpi('Redes Monitoradas')).toHaveTextContent('3')
      expect(kpi('Usuários Totais')).toHaveTextContent('0')
      abrirAba('Usuários')
      expect(screen.queryByText('Davi Souza')).not.toBeInTheDocument()
      expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument()
      expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument()
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
      expect(linha.getByText('ADMINISTRADOR')).toBeInTheDocument()
      expect(linha.getByText('2026-10-01')).toBeInTheDocument()
      expect(linha.getByText('SUSPENSO')).toBeInTheDocument()
    })

    it('aceita lista simples de usuarios e preenche valores padrao', async () => {
      await renderizar({ usuarios: [{ id: 3, name: 'Bia', email: 'bia@email.com' }] })
      abrirAba('Usuários')

      const linha = within(linhaDe('Bia'))
      expect(linha.getByText('USUÁRIO')).toBeInTheDocument()
      expect(linha.getByText('2026-10-10')).toBeInTheDocument()
      expect(linha.getByText('0')).toBeInTheDocument()
      expect(linha.getByText('ATIVO')).toBeInTheDocument()
    })

    it('mantem o catalogo local quando as chamadas ao backend falham, mas nao inventa usuarios', async () => {
      produtoService.buscarCatalogoComPrecos.mockRejectedValue(new Error('offline'))
      mercadoService.listar.mockRejectedValue(new Error('offline'))
      adminService.listarUsuarios.mockRejectedValue(new Error('offline'))
      adminService.obterPainel.mockRejectedValue(new Error('offline'))
      await act(async () => {
        render(<AdminPage />)
      })

      expect(kpi('Produtos no Catálogo')).toHaveTextContent(String(PRODUCTS.length))
      expect(kpi('Usuários Totais')).toHaveTextContent('—')
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
    it('mostra a tabela com menor preco, rede, preco medio, traco para precos ausentes e selo de promocao', async () => {
      await renderizar({ produtos: [PRODUTO_API] })

      const linha = within(linhaDe('Arroz Integral'))
      expect(linha.getByText('PROMO')).toBeInTheDocument()
      expect(linha.getByText('Camil')).toBeInTheDocument()
      expect(linha.getByText('Grãos')).toBeInTheDocument()
      // Menor preço (7.50, Fort) e média dos preços válidos (7.50 e 8.00 = 7.75); o 8.00 isolado não aparece.
      expect(linha.getByText('R$ 7.50')).toBeInTheDocument()
      expect(linha.getByText('no Fort Atacadista')).toBeInTheDocument()
      expect(linha.getByText('R$ 7.75')).toBeInTheDocument()
      expect(linha.queryByText('R$ 8.00')).not.toBeInTheDocument()
      expect(linha.queryByText('—')).not.toBeInTheDocument()
    })

    it('cada linha tem uma celula para cada coluna do cabecalho, com Editar/Excluir sob "Ações"', async () => {
      await renderizar({ produtos: [PRODUTO_API] })

      const cabecalhos = within(screen.getAllByRole('row')[0]).getAllByRole('columnheader')
      const celulas = within(linhaDe('Arroz Integral')).getAllByRole('cell')
      expect(celulas).toHaveLength(cabecalhos.length)
      const colunaAcoes = cabecalhos.findIndex((th) => th.textContent === 'Ações')
      expect(within(celulas[colunaAcoes]).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
      expect(within(celulas[colunaAcoes]).getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
      const colunaMedio = cabecalhos.findIndex((th) => th.textContent === 'Preço Médio')
      expect(celulas[colunaMedio]).toHaveTextContent('R$ 7.75')
    })

    it('mostra o nome da rede (nao o id) quando os precos vem da API com id numerico', async () => {
      await renderizar({
        produtos: [{ ...PRODUTO_API, prices: { 1: 7.5, 2: 8 } }],
        mercados: [MERCADO_API, { ...MERCADO_API, id: 2, name: 'Carrefour Mercado' }],
      })

      const linha = within(linhaDe('Arroz Integral'))
      expect(linha.getByText('no Fort Atacadista')).toBeInTheDocument()
      expect(linha.queryByText('no 1')).not.toBeInTheDocument()
    })

    it('mostra a categoria bruta quando ela nao existe na lista e usa icone padrao sem imagem', async () => {
      await renderizar({ produtos: [{ ...PRODUTO_API, id: 2, name: 'Item Raro', category: 'outra', image: '', promo: false, prices: {} }] })

      const linha = within(linhaDe('Item Raro'))
      expect(linha.getByText('outra')).toBeInTheDocument()
      expect(linha.getByText('🛒')).toBeInTheDocument()
      expect(linha.queryByText('PROMO')).not.toBeInTheDocument()
      // Sem nenhum preço válido: "Melhor Oferta" e "Preço Médio" ficam em traço.
      expect(linha.getAllByText('—')).toHaveLength(2)
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
        expect(within(linhas[1]).getAllByText('R$ 9.50').length).toBeGreaterThan(0)
      })

      it('se o backend recusar, mostra o erro real, nao cadastra, nao diz sucesso e mantem o formulario aberto', async () => {
        produtoService.criar.mockRejectedValue(erroHttp(400, { erro: 'Dados invalidos', campos: { marca: 'obrigatória' } }))
        await renderizar({ produtos: [PRODUTO_API] })
        abrir()

        fireEvent.change(campo('Nome do Produto'), { target: { value: 'Item Recusado' } })
        fireEvent.change(campo('Marca'), { target: { value: 'Marca X' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível cadastrar o produto: Dados invalidos: obrigatória')
        expect(screen.queryByText(/cadastrado!/)).not.toBeInTheDocument()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }))
        expect(screen.queryByText('Item Recusado')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Produtos \(1\)/ })).toBeInTheDocument()
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
        // Sem o preço do Fort, o único preço é o do Carrefour: menor preço e média coincidem em 8.00.
        expect(linha.getAllByText('R$ 8.00')).toHaveLength(2)
        expect(linha.getByText('no Carrefour Mercado')).toBeInTheDocument()
        expect(linha.queryByText('—')).not.toBeInTheDocument()
      })

      it('produto do catalogo local (id textual) nao pode ser salvo: avisa e nao altera a tabela', async () => {
        await renderizar()

        fireEvent.click(within(linhaDe('Arroz Branco Tipo 1')).getByRole('button', { name: 'Editar' }))
        fireEvent.change(campo('Nome do Produto'), { target: { value: 'Arroz Local' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(produtoService.atualizar).not.toHaveBeenCalled()
        expect(screen.getByRole('alert')).toHaveTextContent(/catálogo local/)
        expect(screen.queryByText(/atualizado com sucesso/)).not.toBeInTheDocument()
        fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }))
        expect(screen.queryByText('Arroz Local')).not.toBeInTheDocument()
        expect(screen.getByText('Arroz Branco Tipo 1')).toBeInTheDocument()
      })

      it('se o backend falhar, mostra o erro real, nao altera a tabela e nao diz sucesso', async () => {
        produtoService.atualizar.mockRejectedValue(erroHttp(500, { erro: 'Erro interno do servidor' }))
        await renderizar({ produtos: [PRODUTO_API] })

        fireEvent.click(within(linhaDe('Arroz Integral')).getByRole('button', { name: 'Editar' }))
        fireEvent.change(campo('Nome do Produto'), { target: { value: 'Arroz Alterado' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar o produto: Erro interno do servidor')
        expect(screen.queryByText(/atualizado com sucesso/)).not.toBeInTheDocument()
        fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }))
        expect(screen.queryByText('Arroz Alterado')).not.toBeInTheDocument()
        expect(screen.getByText('Arroz Integral')).toBeInTheDocument()
      })

      it('mostra a mensagem de permissao do interceptor (403) em vez de sucesso', async () => {
        produtoService.atualizar.mockRejectedValue(
          Object.assign(erroHttp(403, { erro: 'Acesso negado. Permissao insuficiente.' }), {
            userMessage: 'Você não tem permissão para acessar este recurso.',
          })
        )
        await renderizar({ produtos: [PRODUTO_API] })

        fireEvent.click(within(linhaDe('Arroz Integral')).getByRole('button', { name: 'Editar' }))
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(screen.getByRole('alert')).toHaveTextContent('Você não tem permissão para acessar este recurso.')
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

      it('produto do catalogo local (id textual) nao e removido: avisa que nao ha como excluir', async () => {
        await renderizar()

        await act(async () => {
          fireEvent.click(within(linhaDe('Arroz Branco Tipo 1')).getByRole('button', { name: 'Excluir' }))
        })

        expect(produtoService.remover).not.toHaveBeenCalled()
        expect(screen.getByText('Arroz Branco Tipo 1')).toBeInTheDocument()
        expect(screen.getByRole('alert')).toHaveTextContent(/catálogo local/)
        expect(screen.queryByText(/removido do catálogo/)).not.toBeInTheDocument()
      })

      it('se o backend falhar, mantem o produto na tabela e mostra o erro real', async () => {
        produtoService.remover.mockRejectedValue(erroHttp(409, { erro: 'Violacao de integridade de dados' }))
        await renderizar({ produtos: [PRODUTO_API] })

        await act(async () => {
          fireEvent.click(within(linhaDe('Arroz Integral')).getByRole('button', { name: 'Excluir' }))
        })

        expect(screen.getByText('Arroz Integral')).toBeInTheDocument()
        expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível excluir o produto: Violacao de integridade de dados')
        expect(screen.queryByText(/removido do catálogo/)).not.toBeInTheDocument()
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

    it('mercado vindo da API sem contagem nem data de coleta mostra traco, nao "undefined itens"', async () => {
      await renderizar({ mercados: [{ id: 5, name: 'Rede da API', address: 'Rua A', active: true, color: '#000' }] })
      abrirAba('Mercados')

      const linha = within(linhaDe('Rede da API'))
      expect(linha.queryByText(/undefined/)).not.toBeInTheDocument()
      expect(linha.getAllByText('—').length).toBeGreaterThanOrEqual(3) // cidade, produtos e última sincronização
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

      it('se o backend recusar, mostra o erro real e nao cadastra a rede', async () => {
        mercadoService.criar.mockRejectedValue(erroHttp(400, { erro: 'Mercado ja existe' }))
        await abrir({ mercados: [MERCADO_API] })

        fireEvent.change(campo('Nome da Rede / Supermercado'), { target: { value: 'Rede Recusada' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível cadastrar a rede: Mercado ja existe')
        expect(screen.queryByText(/cadastrado!/)).not.toBeInTheDocument()
        fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }))
        expect(screen.queryByText('Rede Recusada')).not.toBeInTheDocument()
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

      it('mercado do catalogo local (id textual) nao pode ser salvo: avisa e nao altera a tabela', async () => {
        await renderizar()
        abrirAba('Mercados')

        fireEvent.click(within(linhaDe('Fort Atacadista')).getByRole('button', { name: 'Editar' }))
        fireEvent.change(campo('Nome da Rede / Supermercado'), { target: { value: 'Fort Local' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(mercadoService.atualizar).not.toHaveBeenCalled()
        expect(screen.getByRole('alert')).toHaveTextContent(/catálogo local/)
        expect(screen.queryByText(/atualizada com sucesso/)).not.toBeInTheDocument()
        fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }))
        expect(screen.queryByText('Fort Local')).not.toBeInTheDocument()
      })

      it('se o backend falhar, mostra o erro real, nao altera a tabela e nao diz sucesso', async () => {
        mercadoService.atualizar.mockRejectedValue(erroHttp(500, { erro: 'Erro interno do servidor' }))
        await renderizar({ mercados: [MERCADO_API] })
        abrirAba('Mercados')

        fireEvent.click(within(linhaDe('Fort Atacadista')).getByRole('button', { name: 'Editar' }))
        fireEvent.change(campo('Nome da Rede / Supermercado'), { target: { value: 'Fort Alterado' } })
        await act(async () => {
          fireEvent.submit(modal().querySelector('form'))
        })

        expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar a rede: Erro interno do servidor')
        expect(screen.queryByText(/atualizada com sucesso/)).not.toBeInTheDocument()
        fireEvent.click(within(modal()).getByRole('button', { name: 'Cancelar' }))
        expect(screen.queryByText('Fort Alterado')).not.toBeInTheDocument()
        expect(screen.getByText('Fort Atacadista')).toBeInTheDocument()
      })
    })

    describe('botao Sincronizar', () => {
      it('esta desabilitado e a tela diz que o disparo manual da coleta esta indisponivel', async () => {
        await renderizar({ mercados: [{ ...MERCADO_API, products: 0 }] })
        abrirAba('Mercados')

        const botao = within(linhaDe('Fort Atacadista')).getByRole('button', { name: 'Sincronizar' })
        expect(botao).toBeDisabled()
        expect(screen.getByText(/indisponível por enquanto/i)).toBeInTheDocument()
      })

      it('nunca simula a execucao do scraper: nada muda e nenhum sucesso aparece', async () => {
        await renderizar({ mercados: [{ ...MERCADO_API, products: 0 }] })
        abrirAba('Mercados')
        jest.useFakeTimers()

        fireEvent.click(within(linhaDe('Fort Atacadista')).getByRole('button', { name: 'Sincronizar' }))
        act(() => {
          jest.advanceTimersByTime(5000)
        })

        expect(screen.queryByText(/Scraper executado/)).not.toBeInTheDocument()
        const linha = within(linhaDe('Fort Atacadista'))
        expect(linha.getByText('0 itens')).toBeInTheDocument()
        expect(linha.getByText('Ontem')).toBeInTheDocument()
        expect(linha.queryByText(/Hoje às/)).not.toBeInTheDocument()
      })
    })
  })

  describe('aba de usuarios', () => {
    it('lista os usuarios devolvidos pela API com papel e status', async () => {
      await renderizar({ usuarios: USUARIOS_API })
      abrirAba('Usuários')

      const linha = within(linhaDe('Maria Santos'))
      expect(linha.getByText('maria@email.com')).toBeInTheDocument()
      expect(linha.getByText('USUÁRIO')).toBeInTheDocument()
      expect(linha.getByText('7')).toBeInTheDocument()
      expect(linha.getByText('ATIVO')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Novo/ })).not.toBeInTheDocument()
    })

    it('nao mostra contagem de administradores inventada no cartao de usuarios', async () => {
      await renderizar({ usuarios: USUARIOS_API })

      expect(screen.queryByText(/\+3 administradores/)).not.toBeInTheDocument()
      expect(kpi('Usuários Totais')).toHaveTextContent(String(USUARIOS_API.content.length))
    })

    it('se a listagem falhar, mostra o erro real e NAO exibe usuarios ficticios nem botoes de alterar papel', async () => {
      adminService.listarUsuarios.mockRejectedValue(erroHttp(500, { erro: 'Erro interno do servidor' }))
      produtoService.buscarCatalogoComPrecos.mockResolvedValue([])
      mercadoService.listar.mockResolvedValue([])
      adminService.obterPainel.mockResolvedValue(null)
      await act(async () => {
        render(<AdminPage />)
      })
      abrirAba('Usuários')

      expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os usuários: Erro interno do servidor')
      expect(screen.queryByText('Davi Souza')).not.toBeInTheDocument()
      expect(screen.queryByText('Gilbert Lima')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Alterar Papel' })).not.toBeInTheDocument()
      expect(adminService.alterarPapel).not.toHaveBeenCalled()
    })

    it('"Tentar novamente" recarrega a listagem de usuarios', async () => {
      adminService.listarUsuarios.mockRejectedValueOnce(erroHttp(429, { erro: 'Muitas requisicoes' }))
      produtoService.buscarCatalogoComPrecos.mockResolvedValue([])
      mercadoService.listar.mockResolvedValue([])
      adminService.obterPainel.mockResolvedValue(null)
      await act(async () => {
        render(<AdminPage />)
      })
      abrirAba('Usuários')
      adminService.listarUsuarios.mockResolvedValue(USUARIOS_API)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
      })

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    })

    it('filtra por nome ou e-mail', async () => {
      await renderizar({ usuarios: USUARIOS_API })
      abrirAba('Usuários')
      const filtro = screen.getByPlaceholderText('Filtrar usuarios...')

      fireEvent.change(filtro, { target: { value: 'joao@' } })
      expect(screen.getByText('João Lima')).toBeInTheDocument()
      expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument()

      fireEvent.change(filtro, { target: { value: 'davi' } })
      expect(screen.getByText('Davi Souza')).toBeInTheDocument()
    })

    it('alterna o papel no backend, na tabela e avisa', async () => {
      await renderizar({ usuarios: USUARIOS_API })
      abrirAba('Usuários')

      await act(async () => {
        fireEvent.click(within(linhaDe('Maria Santos')).getByRole('button', { name: 'Alterar Papel' }))
      })

      expect(adminService.alterarPapel).toHaveBeenCalledWith(4, 'ADMIN')
      expect(within(linhaDe('Maria Santos')).getByText('ADMINISTRADOR')).toBeInTheDocument()
      expect(screen.getByText('Papel do usuário Maria Santos alterado para ADMIN.')).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(within(linhaDe('Maria Santos')).getByRole('button', { name: 'Alterar Papel' }))
      })
      expect(adminService.alterarPapel).toHaveBeenLastCalledWith(4, 'USER')
      expect(within(linhaDe('Maria Santos')).getByText('USUÁRIO')).toBeInTheDocument()
    })

    it('se o backend falhar, mantem o papel antigo na tabela e mostra o erro real, sem toast de sucesso', async () => {
      adminService.alterarPapel.mockRejectedValue(erroHttp(400, { erro: 'Nao e possivel rebaixar o ultimo administrador' }))
      await renderizar({ usuarios: USUARIOS_API })
      abrirAba('Usuários')

      await act(async () => {
        fireEvent.click(within(linhaDe('Davi Souza')).getByRole('button', { name: 'Alterar Papel' }))
      })

      expect(within(linhaDe('Davi Souza')).getByText('ADMINISTRADOR')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível alterar o papel de Davi Souza: Nao e possivel rebaixar o ultimo administrador'
      )
      expect(screen.queryByText(/alterado para/)).not.toBeInTheDocument()
    })

    it('Suspender/Ativar nao tem endpoint: botoes desabilitados, aviso na tela e status inalterado', async () => {
      await renderizar({ usuarios: USUARIOS_API })
      abrirAba('Usuários')

      const botao = within(linhaDe('João Lima')).getByRole('button', { name: 'Suspender' })
      expect(botao).toBeDisabled()
      fireEvent.click(botao)

      expect(screen.getByText(/Suspender ou ativar usuários está indisponível por enquanto/)).toBeInTheDocument()
      expect(within(linhaDe('João Lima')).getByText('ATIVO')).toBeInTheDocument()
      expect(screen.queryByText(/Status do usuário/)).not.toBeInTheDocument()
    })
  })

  it('o aviso de sucesso some sozinho depois de 3,5 segundos', async () => {
    await renderizar({ usuarios: USUARIOS_API })
    abrirAba('Usuários')
    jest.useFakeTimers()

    await act(async () => {
      fireEvent.click(within(linhaDe('Maria Santos')).getByRole('button', { name: 'Alterar Papel' }))
    })
    expect(screen.getByText(/Papel do usuário Maria Santos/)).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(3500)
    })
    expect(screen.queryByText(/Papel do usuário Maria Santos/)).not.toBeInTheDocument()
  })
})
