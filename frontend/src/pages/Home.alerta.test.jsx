import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Home from './Home'
import { carregarProdutos } from '../utils/carregarProdutos'

// "Criar Alerta de Preço" da Home não grava nada: os alertas reais vivem em Favoritos (aba Alertas).
// O botão não pode confirmar um alerta que não existe; deve dizer a verdade e levar ao fluxo real.

jest.mock('../utils/carregarProdutos', () => ({ carregarProdutos: jest.fn() }))
jest.mock('../catalogoResumo', () => require('../test/resumoDe').resumoDe(require('../test/dataFixture')))
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, isAdmin: false, isLoading: false, user: { nome: 'Ana' } }),
}))

const { PRODUCTS } = jest.requireActual('../test/dataFixture')

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/favorites" element={<p>Pagina de favoritos</p>} />
      </Routes>
    </MemoryRouter>
  )
}

const abrirModal = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /Criar Alerta de Preço/ }))
  return screen.getByRole('dialog')
}

describe('Home: Criar Alerta de Preço (usuário logado)', () => {
  beforeEach(() => {
    carregarProdutos.mockReset()
    carregarProdutos.mockResolvedValue(PRODUCTS)
  })

  it('não oferece um preço alvo sem produto nem botão de salvar que não salva', async () => {
    renderizar()
    const dialogo = await abrirModal()

    expect(within(dialogo).queryByLabelText(/Preço Alvo/)).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole('button', { name: 'Salvar Alerta' })).not.toBeInTheDocument()
  })

  it('explica onde os alertas realmente são criados e como funcionam, sem prometer notificação', async () => {
    renderizar()
    const dialogo = await abrirModal()

    expect(dialogo).toHaveTextContent(/Favoritos/)
    expect(dialogo).toHaveTextContent(/ao abrir/i)
    expect(dialogo).not.toHaveTextContent(/será alertado/i)
    expect(dialogo).not.toHaveTextContent(/robô/i)
  })

  it('leva ao fluxo real de alertas em Favoritos e não mostra confirmação de sucesso', async () => {
    renderizar()
    const dialogo = await abrirModal()

    fireEvent.click(within(dialogo).getByRole('button', { name: /Ir para os alertas/ }))

    expect(screen.getByText('Pagina de favoritos')).toBeInTheDocument()
    expect(screen.queryByText(/configurado com sucesso/)).not.toBeInTheDocument()
  })

  it('fechar o modal não exibe nenhum toast de sucesso', async () => {
    renderizar()
    const dialogo = await abrirModal()

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByText(/configurado com sucesso/)).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
