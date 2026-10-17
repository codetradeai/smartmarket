import { useState, useEffect } from 'react'
import { MARKETS as DEFAULT_MARKETS, PRODUCTS as DEFAULT_PRODUCTS } from '../data'
import { produtoService, mercadoService } from '../services'

const C = {
  navy: '#0D2137', green: '#22A95E', teal: '#1DB4A3',
  greenDark: '#17864A', bg: '#F4FAF7', muted: '#6B8A7A',
  border: '#D4E8DC', white: '#FFFFFF', error: '#D63B3B',
}

function getStoredList() {
  try { return JSON.parse(sessionStorage.getItem('sm_list') || '{}') } catch { return {} }
}
function saveStoredList(l) { sessionStorage.setItem('sm_list', JSON.stringify(l)) }

function getPriceForMarket(product, market) {
  if (!product || !product.prices) return null
  return product.prices[market.id] ?? product.prices[market.id?.toString()] ?? product.prices[market.name?.toLowerCase().includes('fort') ? 'fort' : market.name?.toLowerCase().includes('carrefour') ? 'carrefour' : 'big'] ?? null
}

function compareMarkets(list, products, markets) {
  return markets.map(market => {
    let total = 0, available = 0
    const missing = []
    Object.entries(list).forEach(([productId, qty]) => {
      const product = products.find(p => p.id?.toString() === productId?.toString())
      if (!product) return
      const price = getPriceForMarket(product, market)
      if (price !== null && price !== undefined) {
        total += Number(price) * Number(qty)
        available++
      } else {
        missing.push(product.name)
      }
    })
    return { marketId: market.id, marketName: market.name, color: market.color, total, available, missing }
  }).sort((a, b) => a.total - b.total)
}

export default function ShoppingListPage() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS)
  const [markets, setMarkets] = useState(DEFAULT_MARKETS)
  const [list, setList] = useState(getStoredList)
  const [compared, setCompared] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => {
    saveStoredList(list)
  }, [list])

  useEffect(() => {
    async function carregarDados() {
      try {
        const [prodsData, mktsData] = await Promise.all([
          produtoService.buscarCatalogoComPrecos(),
          mercadoService.listar(),
        ])
        if (prodsData && prodsData.length > 0) setProducts(prodsData)
        if (mktsData && mktsData.length > 0) setMarkets(mktsData)
      } catch {
        // Fallback
      }
    }
    carregarDados()
  }, [])

  const items = Object.entries(list)
    .map(([id, qty]) => ({
      product: products.find(p => p.id?.toString() === id?.toString()),
      qty,
    }))
    .filter(i => i.product)

  function setQty(id, qty) {
    if (qty <= 0) {
      const next = { ...list }
      delete next[id]
      setList(next)
    } else {
      setList({ ...list, [id]: qty })
    }
    setCompared(false)
  }

  function clear() {
    setList({})
    setCompared(false)
  }

  function compare() {
    setResults(compareMarkets(list, products, markets))
    setCompared(true)
  }

  const totalItems = Object.values(list).reduce((a, b) => a + b, 0)
  const winner = results[0]
  const winnerMarket = winner ? markets.find(m => m.id === winner.marketId) : null
  const savings = results.length >= 2 ? results[results.length - 1].total - results[0].total : 0

  return (
    <div style={{ padding: '32px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.navy, margin: 0, letterSpacing: '-0.3px' }}>Minha Lista de Compras</h1>
          <p style={{ fontSize: '13px', color: C.muted, margin: '4px 0 0' }}>
            {totalItems} item{totalItems !== 1 ? 's' : ''} · Monte a lista e compare onde sai mais barato
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {items.length > 0 && (
            <button onClick={clear} style={{ padding: '9px 18px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              Limpar lista
            </button>
          )}
          <a href="/catalog" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', border: 'none', background: C.bg, color: C.navy, fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: 'Poppins, sans-serif', outline: `1px solid ${C.border}` }}>
            + Adicionar produtos
          </a>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '48px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', margin: '0 0 12px' }}>🛒</p>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: C.navy, margin: '0 0 6px' }}>Sua lista está vazia</h2>
          <p style={{ fontSize: '13px', color: C.muted, margin: '0 0 20px' }}>Adicione produtos no catálogo para comparar os preços entre os mercados.</p>
          <a href="/catalog" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '10px', background: `linear-gradient(135deg, ${C.green}, ${C.teal})`, color: C.white, fontSize: '13px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 10px rgba(34,169,94,0.28)' }}>
            Ir ao Catálogo
          </a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: compared ? '1fr 340px' : '1fr', gap: '24px', alignItems: 'start' }}>
          {/* Tabela de itens */}
          <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: C.navy }}>Itens da Lista ({items.length})</span>
              <button onClick={compare} style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${C.green}, ${C.teal})`, color: C.white, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', boxShadow: '0 2px 8px rgba(34,169,94,0.25)' }}>
                ⚡ Comparar Cestas
              </button>
            </div>
            <div style={{ divideY: `1px solid ${C.border}` }}>
              {items.map(({ product, qty }) => (
                <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    {product.image && product.image.length <= 4 ? product.image : '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.navy }}>{product.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.muted }}>{product.brand} · {product.unit}</p>
                  </div>
                  {/* Controle de quantidade */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.bg, borderRadius: '8px', padding: '4px 8px', border: `1px solid ${C.border}` }}>
                    <button onClick={() => setQty(product.id, qty - 1)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: C.white, cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.navy, minWidth: '18px', textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => setQty(product.id, qty + 1)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: C.white, cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Painel de Comparativo */}
          {compared && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Card Vencedor */}
              {winner && winnerMarket && (
                <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: C.green, color: C.white, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, marginBottom: '10px' }}>
                    🏆 Menor Preço Total
                  </div>
                  <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 800, color: C.navy }}>{winnerMarket.name}</h3>
                  <p style={{ margin: '0 0 12px', fontSize: '26px', fontWeight: 900, color: C.green }}>
                    R$ {winner.total.toFixed(2)}
                  </p>
                  {savings > 0 && (
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: C.greenDark }}>
                      Economia de até <strong>R$ {savings.toFixed(2)}</strong> em relação ao mercado mais caro!
                    </p>
                  )}
                </div>
              )}

              {/* Todos os mercados */}
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: C.navy }}>Comparação por Mercado</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {results.map((r, i) => {
                    const m = markets.find(x => x.id === r.marketId)
                    if (!m) return null
                    return (
                      <div key={r.marketId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: i === 0 ? '#F0FDF4' : C.bg, border: `1px solid ${i === 0 ? '#BBF7D0' : C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.color }} />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: C.navy }}>{m.name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: i === 0 ? C.green : C.navy }}>
                            R$ {r.total.toFixed(2)}
                          </span>
                          {r.missing.length > 0 && (
                            <p style={{ margin: 0, fontSize: '10px', color: C.error }}>{r.missing.length} indisponível</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
