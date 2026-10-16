import { useState } from 'react'
import { CATEGORIES, MARKETS, PRODUCTS } from '../data'

const C = {
  navy: '#0D2137', green: '#22A95E', teal: '#1DB4A3',
  bg: '#F4FAF7', muted: '#6B8A7A', border: '#D4E8DC',
  white: '#FFFFFF', amber: '#F59E0B',
}

function getList() {
  try { return JSON.parse(sessionStorage.getItem('sm_list') || '{}') } catch { return {} }
}
function saveList(l) { sessionStorage.setItem('sm_list', JSON.stringify(l)) }
function getFavMarkets() {
  try { return JSON.parse(localStorage.getItem('sm_fav_markets') || '[]') } catch { return [] }
}
function saveFavMarkets(ids) { localStorage.setItem('sm_fav_markets', JSON.stringify(ids)) }
function getFavProducts() {
  try { return JSON.parse(localStorage.getItem('sm_fav_products') || '[]') } catch { return [] }
}
function saveFavProducts(ids) { localStorage.setItem('sm_fav_products', JSON.stringify(ids)) }

function cheapest(product) {
  const valid = Object.entries(product.prices).filter(([, v]) => v !== null)
  if (!valid.length) return null
  return valid.reduce((a, b) => b[1] < a[1] ? b : a)
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="#6B8A7A" strokeWidth="1.6"/>
      <path d="M12 12l3.5 3.5" stroke="#6B8A7A" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}
function IconStar({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill={filled ? '#F59E0B' : 'none'}>
      <path d="M7.5 1.5l1.72 3.49 3.85.56-2.79 2.71.66 3.84L7.5 10.27l-3.44 1.83.66-3.84L1.93 5.55l3.85-.56L7.5 1.5z"
        stroke={filled ? '#F59E0B' : '#9BB8AA'} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  )
}
function IconCart() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 1h2l1.6 7h6.5l1.4-5H4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="12" r="1" fill="currentColor"/>
      <circle cx="10" cy="12" r="1" fill="currentColor"/>
    </svg>
  )
}
function IconHeart({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill={filled ? '#E11D48' : 'none'}>
      <path d="M7.5 13S2 9.5 2 5.5A3.5 3.5 0 0 1 7.5 3 3.5 3.5 0 0 1 13 5.5C13 9.5 7.5 13 7.5 13z"
        stroke={filled ? '#E11D48' : '#9BB8AA'} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  )
}
function IconFilter() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1 3h13M3 7.5h9M5.5 12h4" stroke="#6B8A7A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function FavMarketsStrip({ favs, onToggle }) {
  return (
    <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 15 15" fill="#F59E0B"><path d="M7.5 1.5l1.72 3.49 3.85.56-2.79 2.71.66 3.84L7.5 10.27l-3.44 1.83.66-3.84L1.93 5.55l3.85-.56L7.5 1.5z" stroke="#F59E0B" strokeWidth="1.3" strokeLinejoin="round"/></svg>
        <span style={{ fontSize: '12px', fontWeight: 700, color: C.navy, whiteSpace: 'nowrap' }}>Mercados favoritos</span>
      </div>
      <div style={{ width: '1px', height: '20px', background: C.border, flexShrink: 0 }} />
      {MARKETS.map(m => {
        const isFav = favs.includes(m.id)
        return (
          <button key={m.id} onClick={() => onToggle(m.id)} style={{
            display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '20px', border: 'none',
            background: isFav ? '#FFFBEB' : C.bg, cursor: 'pointer', transition: 'all 0.18s',
            outline: isFav ? `1.5px solid ${C.amber}` : `1.5px solid ${C.border}`,
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.color }} />
            <span style={{ fontSize: '12px', fontWeight: isFav ? 700 : 500, color: isFav ? '#92400E' : C.navy, fontFamily: 'Poppins, sans-serif' }}>{m.name}</span>
            <IconStar filled={isFav} />
          </button>
        )
      })}
      {favs.length === 0 && (
        <span style={{ fontSize: '12px', color: C.muted, fontStyle: 'italic' }}>Clique em um mercado para favoritar</span>
      )}
    </div>
  )
}

function ProductCard({ product, favMarkets, isFavProduct, onToggleFavProduct, onAdd }) {
  const [added, setAdded] = useState(false)
  const best = cheapest(product)
  const bestMkt = best ? MARKETS.find(m => m.id === best[0]) : null

  const favBest = favMarkets.length > 0
    ? Object.entries(product.prices).filter(([id, v]) => favMarkets.includes(id) && v !== null).sort((a, b) => a[1] - b[1])[0]
    : null
  const favBestMkt = favBest ? MARKETS.find(m => m.id === favBest[0]) : null

  function handleAdd() {
    const list = getList(); list[product.id] = (list[product.id] || 0) + 1; saveList(list)
    onAdd(product.id)
    setAdded(true); setTimeout(() => setAdded(false), 1600)
  }

  return (
    <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(13,33,55,0.05)', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.18s, transform 0.18s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(13,33,55,0.12)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,33,55,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {product.promo && (
        <div style={{ position: 'absolute', top: 0, left: 0, background: C.amber, color: C.white, fontSize: '9px', fontWeight: 800, padding: '3px 10px', borderBottomRightRadius: '10px', letterSpacing: '0.06em' }}>OFERTA</div>
      )}
      <div style={{ background: C.bg, height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px', borderBottom: `1px solid ${C.border}`, position: 'relative' }}>
        {product.image}
        <button onClick={e => { e.stopPropagation(); onToggleFavProduct(product.id) }} title={isFavProduct ? 'Remover dos favoritos' : 'Favoritar produto'}
          style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', background: isFavProduct ? '#FFF1F3' : 'rgba(255,255,255,0.85)', border: `1.5px solid ${isFavProduct ? '#FECDD3' : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <IconHeart filled={isFavProduct} />
        </button>
      </div>
      <div style={{ padding: '14px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.navy, lineHeight: 1.3 }}>{product.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.muted }}>{product.brand} · {product.unit}</p>
        </div>
        {best && bestMkt && (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '9px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Menor preço</p>
              <p style={{ margin: '1px 0 0', fontSize: '18px', fontWeight: 800, color: C.green, letterSpacing: '-0.3px' }}>R$ {best[1].toFixed(2)}</p>
              <p style={{ margin: 0, fontSize: '10px', color: C.muted, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: bestMkt.color, display: 'inline-block' }} />
                {bestMkt.name}
              </p>
            </div>
            {favBest && favBestMkt && favBestMkt.id !== bestMkt.id && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '4px 8px', textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '9px', color: '#92400E', fontWeight: 700 }}>⭐ {favBestMkt.name}</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#92400E' }}>R$ {favBest[1].toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {MARKETS.map(m => {
            const price = product.prices[m.id]
            const isBest = best?.[0] === m.id
            const isFav = favMarkets.includes(m.id)
            return (
              <div key={m.id} title={m.name} style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: isBest ? 700 : 400, background: isBest ? '#F0FDF4' : isFav ? '#FFFBEB' : C.bg, color: isBest ? C.green : isFav ? '#92400E' : C.muted, border: `1px solid ${isBest ? '#BBF7D0' : isFav ? '#FDE68A' : C.border}`, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: m.color, display: 'inline-block' }} />
                {price ? `R$ ${price.toFixed(2)}` : '—'}
              </div>
            )
          })}
        </div>
        <button onClick={handleAdd} style={{ marginTop: 'auto', width: '100%', padding: '9px', borderRadius: '10px', border: 'none', background: added ? '#F0FDF4' : `linear-gradient(135deg, ${C.green}, ${C.teal})`, color: added ? C.green : C.white, fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: added ? 'none' : '0 2px 8px rgba(34,169,94,0.25)', outline: added ? `1.5px solid #BBF7D0` : 'none' }}>
          {added ? <>✓ Adicionado!</> : <><IconCart /> Adicionar à lista</>}
        </button>
      </div>
    </div>
  )
}

export default function CatalogPage() {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('todos')
  const [mktFilter, setMktFilter] = useState('todos')
  const [favMarkets, setFavMarkets] = useState(getFavMarkets)
  const [favProducts, setFavProducts] = useState(getFavProducts)
  const [listCount, setListCount] = useState(() => Object.values(getList()).reduce((a, b) => a + b, 0))

  function toggleFavProduct(id) {
    const next = favProducts.includes(id) ? favProducts.filter(f => f !== id) : [...favProducts, id]
    setFavProducts(next); saveFavProducts(next)
  }
  function toggleFavMarket(id) {
    const next = favMarkets.includes(id) ? favMarkets.filter(f => f !== id) : [...favMarkets, id]
    setFavMarkets(next); saveFavMarkets(next)
  }
  function onAdd() {
    setListCount(Object.values(getList()).reduce((a, b) => a + b, 0))
  }

  const filtered = PRODUCTS.filter(p => {
    if (cat !== 'todos' && p.category !== cat) return false
    if (mktFilter !== 'todos' && p.prices[mktFilter] === null) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.brand.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Top bar */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: C.navy, margin: 0, letterSpacing: '-0.3px' }}>Catálogo de Produtos</h1>
            <p style={{ fontSize: '11px', color: C.muted, margin: '1px 0 0' }}>Busca no banco SmartMarket · GET /api/produtos</p>
          </div>
          <div style={{ position: 'relative', flex: 1, maxWidth: '480px' }}>
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><IconSearch /></div>
            <input type="text" placeholder="Buscar produto, marca ou categoria…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: '14px', border: `1.5px solid ${search ? C.green : C.border}`, background: C.bg, color: C.navy, fontSize: '14px', fontFamily: 'Poppins, sans-serif', outline: 'none', transition: 'border-color 0.18s', boxSizing: 'border-box' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '16px', lineHeight: 1, padding: '2px' }}>✕</button>}
          </div>
          <a href="/list" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', textDecoration: 'none', background: `linear-gradient(135deg, ${C.green}, ${C.teal})`, color: C.white, fontSize: '13px', fontWeight: 700, boxShadow: '0 2px 10px rgba(34,169,94,0.28)', flexShrink: 0 }}>
            <IconCart />
            Minha lista
            {listCount > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '20px', padding: '1px 7px', fontSize: '11px', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>{listCount}</span>}
          </a>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.muted, flexShrink: 0 }}>
            <IconFilter />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Filtros:</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontWeight: cat === c.id ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s', background: cat === c.id ? C.navy : C.bg, color: cat === c.id ? C.white : C.navy, boxShadow: cat === c.id ? '0 2px 6px rgba(13,33,55,0.20)' : 'none', outline: cat === c.id ? 'none' : `1px solid ${C.border}` }}>
                {c.icon} {c.label.split(',')[0]}
              </button>
            ))}
          </div>
          <div style={{ width: '1px', height: '20px', background: C.border }} />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>Mercado:</span>
            <button onClick={() => setMktFilter('todos')} style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontWeight: mktFilter === 'todos' ? 700 : 500, cursor: 'pointer', background: mktFilter === 'todos' ? C.teal : C.bg, color: mktFilter === 'todos' ? C.white : C.navy, outline: mktFilter === 'todos' ? 'none' : `1px solid ${C.border}` }}>Todos</button>
            {MARKETS.map(m => (
              <button key={m.id} onClick={() => setMktFilter(mktFilter === m.id ? 'todos' : m.id)} style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontWeight: mktFilter === m.id ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s', background: mktFilter === m.id ? m.color : C.bg, color: mktFilter === m.id ? C.white : C.navy, outline: mktFilter === m.id ? 'none' : `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: mktFilter === m.id ? 'rgba(255,255,255,0.7)' : m.color, display: 'inline-block' }} />
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 28px', flex: 1 }}>
        <div style={{ marginBottom: '12px' }}>
          <FavMarketsStrip favs={favMarkets} onToggle={toggleFavMarket} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>
            {filtered.length === 0 ? 'Nenhum produto encontrado' : <><strong style={{ color: C.navy }}>{filtered.length}</strong> produto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</>}
          </p>
          {(search || cat !== 'todos' || mktFilter !== 'todos') && (
            <button onClick={() => { setSearch(''); setCat('todos'); setMktFilter('todos') }} style={{ background: 'none', border: 'none', color: C.green, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>✕ Limpar filtros</button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted }}>
            <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🔍</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: C.navy }}>Nenhum produto encontrado</p>
            <p style={{ fontSize: '14px', margin: '4px 0 0' }}>Tente outra busca ou remova os filtros</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '16px' }}>
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} favMarkets={favMarkets} isFavProduct={favProducts.includes(p.id)} onToggleFavProduct={toggleFavProduct} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
