import { useState, useEffect } from 'react'
import { MARKETS, PRODUCTS } from '../data'

const C = {
  navy: '#0D2137', green: '#22A95E', teal: '#1DB4A3',
  greenDark: '#17864A', bg: '#F4FAF7', muted: '#6B8A7A',
  border: '#D4E8DC', white: '#FFFFFF', error: '#D63B3B',
}

function getList() {
  try { return JSON.parse(sessionStorage.getItem('sm_list') || '{}') } catch { return {} }
}
function saveList(l) { sessionStorage.setItem('sm_list', JSON.stringify(l)) }

function compareMarkets(list) {
  return MARKETS.map(market => {
    let total = 0, available = 0
    const missing = []
    Object.entries(list).forEach(([productId, qty]) => {
      const product = PRODUCTS.find(p => p.id === productId)
      if (!product) return
      const price = product.prices[market.id]
      if (price !== null && price !== undefined) { total += price * qty; available++ }
      else missing.push(product.name)
    })
    return { marketId: market.id, total, available, missing }
  }).sort((a, b) => a.total - b.total)
}

export default function ShoppingListPage() {
  const [list, setList] = useState(getList)
  const [compared, setCompared] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => { saveList(list) }, [list])

  const items = Object.entries(list).map(([id, qty]) => ({ product: PRODUCTS.find(p => p.id === id), qty })).filter(i => i.product)

  function setQty(id, qty) {
    if (qty <= 0) { const next = { ...list }; delete next[id]; setList(next) }
    else setList({ ...list, [id]: qty })
    setCompared(false)
  }
  function clear() { setList({}); setCompared(false) }
  function compare() { setResults(compareMarkets(list)); setCompared(true) }

  const totalItems = Object.values(list).reduce((a, b) => a + b, 0)
  const winner = results[0]
  const winnerMarket = winner ? MARKETS.find(m => m.id === winner.marketId) : null
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
        {items.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={clear} style={{ padding: '9px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.white, color: C.muted, fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Limpar lista
            </button>
            <button onClick={compare} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${C.green}, ${C.teal})`, color: C.white, fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 12px rgba(34,169,94,0.30)' }}>
              📊 Comparar preços
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: items.length > 0 ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* List */}
        <div>
          {items.length === 0 ? (
            <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '48px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: '40px', margin: '0 0 16px' }}>🛒</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: C.navy, margin: '0 0 8px' }}>Lista vazia</p>
              <p style={{ fontSize: '14px', color: C.muted, margin: '0 0 20px' }}>Vá ao catálogo e adicione produtos para comparar preços.</p>
              <a href="/catalog" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '12px', background: `linear-gradient(135deg, ${C.green}, ${C.teal})`, color: C.white, textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
                Ver catálogo
              </a>
            </div>
          ) : (
            <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: C.navy }}>{items.length} produto{items.length !== 1 ? 's' : ''}</span>
                <a href="/catalog" style={{ fontSize: '12px', color: C.green, fontWeight: 600, textDecoration: 'none' }}>+ Adicionar mais</a>
              </div>
              {items.map(({ product, qty }) => (
                <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '28px' }}>{product.image}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.muted }}>{product.brand} · {product.unit}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => setQty(product.id, qty - 1)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.white, color: C.navy, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.navy, minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => setQty(product.id, qty + 1)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: `1.5px solid ${C.green}`, background: '#F0FDF4', color: C.green, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                  </div>
                  <button onClick={() => setQty(product.id, 0)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#C4D4CC', fontSize: '16px' }} title="Remover">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comparison */}
        {compared && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {winnerMarket && (
              <div style={{ background: `linear-gradient(135deg, ${C.green}, ${C.teal})`, borderRadius: '16px', padding: '20px 24px', color: C.white, boxShadow: '0 4px 20px rgba(34,169,94,0.35)' }}>
                <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>🏆 Melhor opção para sua lista</p>
                <p style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.3px' }}>{winnerMarket.name}</p>
                <p style={{ margin: '0 0 12px', fontSize: '28px', fontWeight: 800 }}>R$ {winner.total.toFixed(2)}</p>
                {savings > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.20)', borderRadius: '10px', padding: '8px 14px', display: 'inline-block' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>💰 Você economiza R$ {savings.toFixed(2)} vs. o mais caro</span>
                  </div>
                )}
              </div>
            )}
            <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: C.navy }}>Comparativo completo</span>
              </div>
              {results.map((r, i) => {
                const market = MARKETS.find(m => m.id === r.marketId)
                const isWinner = i === 0
                const diff = i > 0 ? r.total - results[0].total : 0
                return (
                  <div key={r.marketId} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : 'none', background: isWinner ? '#F0FDF4' : C.white }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isWinner ? C.green : C.border, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: market.color }} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: C.navy }}>{market.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: isWinner ? C.green : C.navy }}>R$ {r.total.toFixed(2)}</p>
                      {diff > 0 && <p style={{ margin: 0, fontSize: '11px', color: C.muted }}>+R$ {diff.toFixed(2)} a mais</p>}
                      {r.missing.length > 0 && <p style={{ margin: '2px 0 0', fontSize: '10px', color: C.error }}>{r.missing.length} item{r.missing.length > 1 ? 'ns' : ''} indisponível{r.missing.length > 1 ? 'is' : ''}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
