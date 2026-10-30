import { useEffect, useMemo, useRef, useState } from "react"
import { CATEGORIES } from "../../data"
import { Input } from "./Input"

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

function fold(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function menorPreco(product) {
  const values = Object.values(product.prices || {}).filter((value) => typeof value === "number" && value > 0)
  if (!values.length) return null
  return Math.min(...values)
}

function categoriaLabel(id) {
  return CATEGORIES.find((category) => category.id === id)?.label || ""
}

const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "e", "em", "com", "para", "a", "o"])

function buildSuggestions(products, query) {
  const typed = query.trim()
  const q = fold(typed)
  if (q.length < 2) return []

  const counts = new Map()
  const display = new Map()

  const add = (label, weight = 1) => {
    const text = String(label || "").replace(/\s+/g, " ").trim()
    const key = fold(text)
    if (key.length < 2 || key.length > 34 || key === q) return
    if (STOPWORDS.has(key.split(" ")[0])) return
    counts.set(key, (counts.get(key) || 0) + weight)
    if (!display.has(key)) display.set(key, text)
  }

  const once = new Set()
  products.forEach((product) => {
    const name = product.name || ""
    const brand = product.brand || ""
    const category = categoriaLabel(product.category)
    if (!fold(`${name} ${brand} ${category}`).includes(q)) return

    const tokens = name
      .split(/\s+/)
      .filter((word) => word && !/\d/.test(word) && fold(word).length > 1)

    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const phrase = tokens.slice(index, index + size).join(" ")
        if (fold(phrase).includes(q)) add(phrase)
      }
    }

    const brandKey = fold(brand)
    if (brandKey.includes(q) && !once.has(brandKey)) {
      once.add(brandKey)
      add(brand, 3)
    }
    const categoryKey = fold(category)
    if (categoryKey.includes(q) && !once.has(categoryKey)) {
      once.add(categoryKey)
      add(category, 3)
    }
  })

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
  const picked = []
  ranked.forEach(([key]) => {
    if (picked.length >= 5) return
    const nested = picked.some((chosen) => key.startsWith(`${chosen} `) || chosen.startsWith(`${key} `))
    if (!nested) picked.push(key)
  })

  return [typed, ...picked.map((key) => display.get(key))]
}

function matchingProducts(products, query) {
  const q = fold(query.trim())
  if (q.length < 2) return []

  const ranked = products
    .map((product) => {
      const name = fold(product.name)
      const brand = fold(product.brand)
      const category = fold(categoriaLabel(product.category))
      const haystack = `${name} ${brand} ${category}`
      if (!haystack.includes(q)) return null
      const rank = name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2
      return { product, rank, price: menorPreco(product) }
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || (a.price ?? Infinity) - (b.price ?? Infinity))

  const picked = []
  const seen = new Set()
  ranked.forEach((item) => {
    if (picked.length >= 4) return
    const tokens = fold(item.product.name)
      .split(/\s+/)
      .filter((token) => token && !STOPWORDS.has(token) && !/\d/.test(token))
    const extra = tokens.filter((token) => !q.includes(token))
    const key = extra[0] || tokens[0] || fold(item.product.name)
    if (seen.has(key)) return
    seen.add(key)
    picked.push(item)
  })

  return picked
}

export function SearchSuggest({
  id,
  value,
  onChange,
  onSubmit,
  onAdd,
  products = [],
  placeholder = "Buscar produtos...",
  variant = "field",
  wide = false,
}) {
  const rootRef = useRef(null)
  const [active, setActive] = useState(false)
  const [box, setBox] = useState({ place: "below", maxHeight: 440 })
  const suggestions = useMemo(() => buildSuggestions(products, value), [products, value])
  const results = useMemo(() => matchingProducts(products, value), [products, value])
  const open = active && fold(value).length >= 2

  useEffect(() => {
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setActive(false)
    }
    const onKey = (event) => {
      if (event.key === "Escape") setActive(false)
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    let frame = 0
    const fit = () => {
      const node = rootRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const gap = 12
      const below = window.innerHeight - rect.bottom - gap
      const above = rect.top - gap
      const next = below >= 300 || below >= above
        ? { place: "below", maxHeight: Math.round(Math.min(460, Math.max(220, below))) }
        : { place: "above", maxHeight: Math.round(Math.min(460, Math.max(220, above))) }
      setBox((current) => (
        current.place === next.place && current.maxHeight === next.maxHeight ? current : next
      ))
      frame = requestAnimationFrame(fit)
    }
    frame = requestAnimationFrame(fit)
    return () => cancelAnimationFrame(frame)
  }, [open])

  function escrever(next) {
    onChange(next)
    setActive(true)
  }

  function escolherSugestao(text) {
    escrever(text)
  }

  function verTodos() {
    setActive(false)
    onSubmit?.(value)
  }

  const panel = open && (
    <div
      className={`absolute z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_24px_60px_-28px_rgba(13,33,55,0.55)] ${
        box.place === "above" ? "bottom-[calc(100%+0.55rem)]" : "top-[calc(100%+0.55rem)]"
      } ${wide ? "left-1/2 w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2" : "left-0 w-full"}`}
      style={{ maxHeight: box.maxHeight }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto sm:grid-cols-[11.5rem_1fr]">
        <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
          <p className="text-sm font-extrabold text-brand-navy">Sugestões de Pesquisa</p>
          <ul className="mt-3 space-y-1.5">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => escolherSugestao(suggestion)}
                  className="w-full rounded-lg px-1 py-1 text-left text-sm text-slate-600 hover:bg-brand-green-light hover:text-brand-navy"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4">
          <p className="text-sm font-extrabold text-brand-navy">Produtos</p>
          {results.length === 0 ? (
            <p className="mt-4 text-sm text-brand-muted">Nenhum produto com esse nome no catálogo.</p>
          ) : (
            <ul className="mt-2">
              {results.map(({ product, price }) => {
                const desconto = price != null && product.precoNormal > price
                  ? Math.round((1 - price / product.precoNormal) * 100)
                  : null
                return (
                  <li key={product.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                      {product.imageLocal ? (
                        <img src={product.imageLocal} alt="" className="h-11 w-11 object-contain" />
                      ) : (
                        <span className="text-lg" aria-hidden="true">{product.image || "🛒"}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold leading-snug text-brand-navy">{product.name}</span>
                      {product.isClube && (
                        <span className="mt-1 inline-block rounded bg-brand-navy px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                          Clube
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right leading-tight">
                      {price != null && (
                        <span className="block text-sm font-extrabold text-brand-green">{moeda.format(price)}</span>
                      )}
                      {desconto > 0 && (
                        <span className="mt-0.5 flex items-center justify-end gap-1">
                          <span className="rounded bg-brand-navy px-1 py-0.5 text-[10px] font-bold text-white">{desconto}%</span>
                          <span className="text-[11px] text-slate-400 line-through">{moeda.format(product.precoNormal)}</span>
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdd?.(product)}
                      className="shrink-0 whitespace-nowrap rounded-md bg-brand-green px-3 py-2 text-xs font-extrabold text-white hover:bg-[#1b8c4d]"
                    >
                      + Adicionar
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={verTodos}
        className="w-full shrink-0 border-t border-slate-100 py-3 text-sm font-extrabold text-brand-green hover:bg-brand-green-light"
      >
        Ver todos os resultados
      </button>
    </div>
  )

  if (variant === "hero") {
    return (
      <div ref={rootRef} className="relative">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            verTodos()
          }}
        >
          <label htmlFor={id} className="sr-only">Buscar no catálogo</label>
          <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.65)]">
            <input
              id={id}
              name="q"
              type="text"
              role="searchbox"
              autoComplete="off"
              value={value}
              onChange={(event) => escrever(event.target.value)}
              onFocus={() => setActive(true)}
              placeholder={placeholder}
              className="sm-search-input min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-medium text-brand-navy placeholder:text-brand-muted focus:outline-none"
            />
            {value && (
              <button
                type="button"
                onClick={() => escrever("")}
                className="px-2 text-xs font-bold text-brand-muted hover:text-brand-navy"
                aria-label="Limpar busca"
              >
                ✕
              </button>
            )}
            <button type="submit" className="sm-cta shrink-0">
              Buscar
            </button>
          </div>
        </form>
        {panel}
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          verTodos()
        }}
      >
        <Input
          isSearch
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(event) => escrever(event.target.value)}
          onFocus={() => setActive(true)}
          onClear={() => escrever("")}
          autoComplete="off"
          className="h-10 text-xs bg-slate-50 border-brand-border/60 hover:bg-white"
        />
      </form>
      {panel}
    </div>
  )
}

export default SearchSuggest
