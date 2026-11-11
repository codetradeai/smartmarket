import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RaioXCorredor } from './RaioXCorredor'
import { calcularComparacoes, dispersaoDoSetor } from '../utils/dispersaoPrecos'

const setor = { id: 'cafe', label: 'Café e Matinais', icon: '☕' }
const produtos = [
  { id: 'p1', name: 'Café Torrado 500g', brand: 'Uniao', category: 'cafe', unit: '500g', prices: { asun: 16.9 } },
  { id: 'p2', name: 'Café Torrado 500g', brand: 'Uniao', category: 'cafe', unit: '500g', prices: { fort: 23.5 } },
  { id: 'p3', name: 'Café Torrado 500g', brand: 'Uniao', category: 'cafe', unit: '500g', prices: { stok: 20.9 } },
  { id: 'p4', name: 'Achocolatado 400g', brand: 'Nescau', category: 'cafe', unit: '400g', prices: { asun: 8 } },
  { id: 'p5', name: 'Achocolatado 400g', brand: 'Nescau', category: 'cafe', unit: '400g', prices: { master: 10 } },
]
const grupos = [
  { id: 'g1', confianca: 'confirmado', camada: 'T1', itens: ['p1', 'p2', 'p3'] },
  { id: 'g2', confianca: 'confirmado', camada: 'T1', itens: ['p4', 'p5'] },
]
const comparacoes = calcularComparacoes(produtos, grupos)

function montar(props = {}) {
  return render(
    <MemoryRouter>
      <RaioXCorredor
        setor={setor}
        dispersao={dispersaoDoSetor(comparacoes, 'cafe')}
        carregando={false}
        erro={false}
        onTentarNovamente={() => {}}
        nomeDaRede={(id) => ({ asun: 'Asun Supermercados', stok: 'Stok Center' })[id] || id}
        autenticado={false}
        caminhoCadastro={(intent, termo) => `/auth?intent=${intent}${termo ? `&q=${encodeURIComponent(termo)}` : ''}`}
        caminhoCatalogo="/catalog"
        totalAnuncios={9277}
        {...props}
      />
    </MemoryRouter>
  )
}

describe('RaioXCorredor', () => {
  it('cabeçalho: setor, quantos produtos foram comparados e a dispersão real', () => {
    montar()

    expect(screen.getByRole('region', { name: 'Raio-X de preços: Café e Matinais' })).toBeInTheDocument()
    expect(screen.getByText(/Comparação disponível · 2 produtos comparados/)).toBeInTheDocument()
    expect(screen.getByText(/de variação entre redes/)).toHaveTextContent('Até 28%')
    expect(screen.getByText(/Variação média do setor: 24%/)).toBeInTheDocument()
  })

  it('cada linha mostra produto, marca e unidade, menor e maior preço, economia e % de diferença', () => {
    montar()
    const linhas = screen.getAllByRole('listitem')
    expect(linhas).toHaveLength(2)

    const cafe = linhas[0]
    expect(within(cafe).getByText('Café Torrado 500g')).toBeInTheDocument()
    expect(cafe).toHaveTextContent('Uniao · 500g')
    expect(cafe).toHaveTextContent(/R\$\s*16,90/)
    expect(cafe).toHaveTextContent(/R\$\s*23,50/)
    expect(cafe).toHaveTextContent(/Economize R\$\s*6,60 · 28% de diferença/)
    expect(within(cafe).getByRole('img', { name: /Menor preço R\$\s*16,90, maior preço R\$\s*23,50: diferença de R\$\s*6,60, 28%/ })).toBeInTheDocument()
  })

  it('só aviso de limitação quando há menos de 3 produtos, e o aviso de que não é economia garantida', () => {
    montar()
    expect(screen.getByText(/Mostrando 2 de 3: este setor só tem 2 produtos/)).toBeInTheDocument()
    expect(screen.getByText(/Não é uma economia garantida na compra completa/)).toBeInTheDocument()
  })

  it('visitante: rede mais barata trancada, "Revelar rede" leva ao cadastro e a barra convida a criar conta', () => {
    montar()
    const primeira = screen.getAllByRole('listitem')[0]

    expect(within(primeira).getByText('Rede Mais Barata 🔒')).toBeInTheDocument()
    expect(primeira).not.toHaveTextContent('Asun Supermercados')
    expect(within(primeira).getByRole('link', { name: /Revelar rede/ })).toHaveAttribute(
      'href',
      '/auth?intent=busca&q=Caf%C3%A9%20Torrado%20500g'
    )
    expect(screen.getByText('Descubra onde comprar mais barato.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Criar conta grátis e liberar tudo/ })).toHaveAttribute('href', '/auth?intent=catalogo')
    expect(screen.getByRole('link', { name: 'Já tenho conta' })).toHaveAttribute('href', '/auth?mode=login')
    expect(screen.getByText(/libera os 9\.277 anúncios do catálogo/)).toBeInTheDocument()
  })

  it('o preço de visitante continua visível: menor, maior e diferença não ficam atrás de cadastro', () => {
    montar()
    expect(screen.getByText(/R\$\s*16,90/)).toBeVisible()
    expect(screen.getByText(/R\$\s*23,50/)).toBeVisible()
  })

  it('logado: revela o nome da rede mais barata e troca a barra pelo atalho do catálogo', () => {
    montar({ autenticado: true })
    const primeira = screen.getAllByRole('listitem')[0]

    expect(primeira).toHaveTextContent('Asun Supermercados')
    expect(screen.queryByRole('link', { name: /Revelar rede/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Já tenho conta' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Abrir Catálogo Completo/ })).toHaveAttribute('href', '/catalog')
  })

  it('setor sem comparação confirmada explica e mantém o convite, sem números', () => {
    montar({ dispersao: dispersaoDoSetor(comparacoes, 'padaria') })

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.getByText(/Ainda não há comparação confirmada do mesmo produto/)).toBeInTheDocument()
    expect(screen.queryByText(/de variação entre redes/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Criar conta grátis e liberar tudo/ })).toBeInTheDocument()
  })

  it('carregando e erro usam os estados padrão do catálogo', () => {
    const { unmount } = montar({ carregando: true })
    expect(screen.getByRole('status')).toHaveTextContent('Carregando o catálogo')
    unmount()

    montar({ erro: true })
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o catálogo')
  })
})
