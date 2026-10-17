import { useState, useEffect } from 'react'
import { CATEGORIES, MARKETS as DEFAULT_MARKETS, PRODUCTS as DEFAULT_PRODUCTS } from '../data'
import { produtoService, mercadoService, favoritoService } from '../services'

const C = {
  navy: '#0D2137', green: '#22A95E', teal: '#1DB4A3',
  bg: '#F4FAF7', muted: '#6B8A7A', border: '#D4E8DC',
  white: '#FFFFFF', amber: '#F59E0B',
}

function getList() {
  try { return JSON.parse(sessionStorage.getItem('sm_list') || '{}') } catch { return {} }
}
function saveList(l) { sessionStorage.setItem('sm_list', JSON.stringify(l)) }

function getPriceForMarket(product, market) {
  if (!product || !product.prices) return null
  return product.prices[market.id] ?? product.prices[market.id?.toString()] ?? product.prices[market.name?.toLowerCase().includes('fort') ? 'fort' : market.name?.toLowerCase().includes('carrefour') ? 'carrefour' : 'big'] ?? null
}

function cheapest(product, markets) {
  if (!product || !product.prices) return null
  const valid = markets
    .map(m => [m.id, getPriceForMarket(product, m)])
    .filter(([, v]) => v !== null && v !== undefined)
  if (!valid.length) return null
  return valid.reduce((a, b) => (b[1] < a[1] ? b : a))
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

function FavMarketsStrip({ markets, favs, onToggle }) {
  return (
    <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 15 15" fill="#F59E0B"><path d="M7.5 1.5l1.72 3.49 3.85.56-2.79 2.71.66 3.84L7.5 10.27l-3.44 1.83.66-3.84L1.93 5.55l3.85-.56L7.5 1.5z" stroke="#F59E0B" strokeWidth="1.3" strokeLinejoin="round"/></svg>
        <span style={{ fontSize: '12px', fontWeight: 700, color: C.navy, whiteSpace: 'nowrap' }}>Mercados favoritos</span>
      </div>
      <div style={{ width: '1px', height: '20px', background: C.border, flexShrink: 0 }} />
      {markets.map(m => {
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

function ProductCard({ product, markets, favMarkets, isFavProduct, onToggleFavProduct, onAdd }) {
  const [added, setAdded] = useState(false)
  const best = cheapest(product, markets)
  const bestMkt = best ? markets.find(m => m.id === best[0]) : null

  const favBest = favMarkets.length > 0
    ? markets
        .filter(m => favMarkets.includes(m.id))
        .map(m => [m.id, getPriceForMarket(product, m)])
        .filter(([, v]) => v !== null && v !== undefined)
        .sort((a, b) => a[1] - b[1])[0]
    : null
  const favBestMkt = favBest ? markets.find(m => m.id === favBest[0]) : null

  function handleAdd() {
    const list = getList()
    list[product.id] = (list[product.id] || 0) + 1
    saveList(list)
    setAdded(true)
    onAdd()
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div style={{
      background: C.white, borderRadius: '16px', border: `1px solid ${C.border}`,
      padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
      position: 'relative', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
      boxShadow: '0 1px 4px rgba(13,33,55,0.04)',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(13,33,55,0.09)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(13,33,55,0.04)' }}
    >
      <button onClick={() => onToggleFavProduct(product.id)} title={isFavProduct ? "Remover dos favoritos" : "Favoritar produto"}
        style={{ position: 'absolute', top: '12px', right: '12px', background: isFavProduct ? '#FFF1F2' : C.bg, border: `1px solid ${isFavProduct ? '#FECDD3' : C.border}`, borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s' }}>
        <IconHeart filled={isFavProduct} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
          {product.image && product.image.length <= 4 ? product.image : '📦'}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: '28px' }}>
          <p style={{ margin: 0, fontSize: '11px', color: C.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{product.brand || 'Geral'}</p>
          <h3 style={{ margin: '1px 0 0', fontSize: '14px', fontWeight: 700, color: C.navy, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</h3>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.muted }}>{product.unit}</p>
        </div>
      </div>

      <div style={{ height: '1px', background: C.border }} />

      {best && bestMkt && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '8px 12px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '10px', color: C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Melhor Preço</p>
            <p style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: C.green }}>R$ {Number(best[1]).toFixed(2)}</p>
            <p style={{ margin: 0, fontSize: '10px', color: C.muted, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: bestMkt.color, display: 'inline-block' }} />
              {bestMkt.name}
            </p>
          </div>
          {favBest && favBestMkt && favBestMkt.id !== bestMkt.id && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '4px 8px', textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '9px', color: '#92400E', fontWeight: 700 }}>⭐ {favBestMkt.name}</p>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#92400E' }}>R$ {Number(favBest[1]).toFixed(2)}</p>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {markets.map(m => {
          const price = getPriceForMarket(product, m)
          const isBest = best?.[0] === m.id
          const isFav = favMarkets.includes(m.id)
          return (
            <div key={m.id} title={m.name} style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: isBest ? 700 : 400, background: isBest ? '#F0FDF4' : isFav ? '#FFFBEB' : C.bg, color: isBest ? C.green : isFav ? '#92400E' : C.muted, border: `1px solid ${isBest ? '#BBF7D0' : isFav ? '#FDE68A' : C.border}`, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: m.color, display: 'inline-block' }} />
              {price !== null && price !== undefined ? `R$ ${Number(price).toFixed(2)}` : '—'}
            </div>
          )
        })}
      </div>

      <button onClick={handleAdd} style={{ marginTop: 'auto', width: '100%', padding: '9px', borderRadius: '10px', border: 'none', background: added ? '#F0FDF4' : `linear-gradient(135deg, ${C.green}, ${C.teal})`, color: added ? C.green : C.white, fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: added ? 'none' : '0 2px 8px rgba(34,169,94,0.25)', outline: added ? `1.5px solid #BBF7D0` : 'none' }}>
        {added ? <>✓ Adicionado!</> : <><IconCart /> Adicionar à lista</>}
      </button>
    </div>
  )
}

export default function CatalogPage() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS)
  const [markets, setMarkets] = useState(DEFAULT_MARKETS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('todos')
  const [mktFilter, setMktFilter] = useState('todos')
  const [favMarkets, setFavMarkets] = useState([])
  const [favProducts, setFavProducts] = useState([])
  const [listCount, setListCount] = useState(() => Object.values(getList()).reduce((a, b) => a + b, 0))

  useEffect(() => {
    async function carregarDados() {
      try {
        setLoading(true)
        const [prodsData, mktsData, favMktsData, favProdsData] = await Promise.all([
          produtoService.buscarCatalogoComPrecos(),
          mercadoService.listar(),
          favoritoService.listarMercados(),
          favoritoService.listarProdutos(),
        ])
        if (prodsData && prodsData.length > 0) setProducts(prodsData)
        if (mktsData && mktsData.length > 0) setMarkets(mktsData)
        if (Array.isArray(favMktsData)) {
          setFavMarkets(favMktsData.map(f => f.mercadoId || f.id || f))
        }
        if (Array.isArray(favProdsData)) {
          setFavProducts(favProdsData.map(f => f.produtoId || f.id || f))
        }
      } catch {
        // Fallback gracioso mantem dados padrao
      } finally {
        setLoading(false)
      }
    }
    carregarDados()
  }, [])

  async function toggleFavProduct(id) {
    const isFav = favProducts.includes(id)
    const next = isFav ? favProducts.filter(f => f !== id) : [...favProducts, id]
    setFavProducts(next)
    try {
      if (isFav) await favoritoService.desfavoritarProduto(id)
      else await favoritoService.favoritarProduto(id)
    } catch {
      // silencioso fallback
    }
  }

  async function toggleFavMarket(id) {
    const isFav = favMarkets.includes(id)
    const next = isFav ? favMarkets.filter(f => f !== id) : [...favMarkets, id]
    setFavMarkets(next)
    try {
      if (isFav) await favoritoService.desfavoritarMercado(id)
      else await favoritoService.favoritarMercado(id)
    } catch {
      // silencioso fallback
    }
  }

  function onAdd() {
    setListCount(Object.values(getList()).reduce((a, b) => a + b, 0))
  }

  const filtered = products.filter(p => {
    if (cat !== 'todos' && p.category?.toLowerCase() !== cat.toLowerCase() && !p.category?.toLowerCase().includes(cat.toLowerCase())) return false
    if (mktFilter !== 'todos') {
      const price = getPriceForMarket(p, { id: mktFilter })
      if (price === null || price === undefined) return false
    }
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.brand?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Top bar */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: C.navy, margin: 0, letterSpacing: '-0.3px' }}>Catálogo de Produtos</h1>
            <p style={{ fontSize: '11px', color: C.muted, margin: '1px 0 0' }}>
              {loading ? "Carregando catálogo..." : `SmartMarket API Conectada · ${products.length} itens encontrados`}
            </p>
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

        <FavMarketsStrip markets={markets} favs={favMarkets} onToggle={toggleFavMarket} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {CATEGORIES.map(c => {
            const active = cat === c.id
            return (
              <button key={c.id} onClick={() => setCat(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', border: 'none',
                background: active ? C.navy : C.bg, color: active ? C.white : C.navy,
                fontSize: '12px', fontWeight: active ? 700 : 500, fontFamily: 'Poppins, sans-serif',
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                outline: active ? 'none' : `1px solid ${C.border}`,
              }}>
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            )
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <IconFilter />
            <select value={mktFilter} onChange={e => setMktFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.bg, color: C.navy, fontSize: '12px', fontFamily: 'Poppins, sans-serif', cursor: 'pointer', outline: 'none' }}>
              <option value="todos">Todos os mercados</option>
              {markets.map(m => <option key={m.id} value={m.id}>Apenas {m.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 28px', background: C.bg }}>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: C.muted }}>
          Exibindo <strong>{filtered.length}</strong> de {products.length} produtos
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {filtered.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              markets={markets}
              favMarkets={favMarkets}
              isFavProduct={favProducts.includes(p.id)}
              onToggleFavProduct={toggleFavProduct}
              onAdd={onAdd}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
