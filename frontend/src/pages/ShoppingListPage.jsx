import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { MARKETS, PRODUCTS } from "../data"
import {
  Button,
  Card,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "../components/ui"

// Cesta sugerida inicial para que a página nunca abra vazia em testes de primeira viagem
const INITIAL_DEMO_LIST = {
  p1: 2, // 2x Arroz Branco Tio João 5kg
  p3: 2, // 2x Feijão Carioca Camil 1kg
  p9: 6, // 6x Leite Integral Italac 1L
  p14: 3, // 3x Óleo Liza 900ml
  p17: 2, // 2x Café Pilão 500g
}

function getStoredList() {
  try {
    const stored = sessionStorage.getItem("sm_list")
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Object.keys(parsed).length > 0) return parsed
    }
  } catch {
    // fallback
  }
  try {
    sessionStorage.setItem("sm_list", JSON.stringify(INITIAL_DEMO_LIST))
  } catch {
    // fallback
  }
  return INITIAL_DEMO_LIST
}

function persistList(list) {
  try {
    sessionStorage.setItem("sm_list", JSON.stringify(list))
  } catch {
    // fallback
  }
}

/**
 * Realiza o cálculo comparativo em todos os supermercados parceiros
 */
function calculateMarketComparison(list) {
  const activeEntries = Object.entries(list).filter(([, qty]) => qty > 0)
  const totalListProducts = activeEntries.length

  const results = MARKETS.map((market) => {
    let total = 0
    let availableCount = 0
    const missingItems = []
    const itemBreakdown = []

    activeEntries.forEach(([productId, qty]) => {
      const product = PRODUCTS.find((p) => p.id === productId)
      if (!product) return

      const unitPrice = product.prices?.[market.id]
      if (unitPrice !== null && unitPrice !== undefined) {
        const itemTotal = unitPrice * qty
        total += itemTotal
        availableCount++
        itemBreakdown.push({
          product,
          qty,
          unitPrice,
          itemTotal,
        })
      } else {
        missingItems.push(product.name)
      }
    })

    const isComplete = totalListProducts > 0 && availableCount === totalListProducts

    return {
      marketId: market.id,
      market,
      total,
      availableCount,
      totalListProducts,
      missingItems,
      isComplete,
      itemBreakdown,
    }
  })

  // Ordenação inteligente e justa para o consumidor:
  // 1º Cesta completa (100% dos produtos da lista disponíveis) ordenada pelo MENOR total.
  // 2º Mercados com itens em falta (cesta parcial), ordenados pela maior disponibilidade e depois menor total.
  return [...results].sort((a, b) => {
    if (a.isComplete !== b.isComplete) {
      return a.isComplete ? -1 : 1
    }
    if (a.availableCount !== b.availableCount) {
      return b.availableCount - a.availableCount
    }
    return a.total - b.total
  })
}

export default function ShoppingListPage() {
  const [list, setList] = useState(getStoredList)
  const [showItemDetails, setShowItemDetails] = useState(false)
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(""), 3000)
  }

  // Lista de itens formatada com os dados dos produtos
  const items = useMemo(() => {
    return Object.entries(list)
      .map(([id, qty]) => ({
        product: PRODUCTS.find((p) => p.id === id),
        qty,
      }))
      .filter((i) => i.product && i.qty > 0)
  }, [list])

  // Total de itens individuais na lista
  const totalUnits = useMemo(() => {
    return Object.values(list).reduce((acc, curr) => acc + curr, 0)
  }, [list])

  // Resultados comparativos ranqueados
  const comparisonResults = useMemo(() => {
    if (items.length === 0) return []
    return calculateMarketComparison(list)
  }, [list, items.length])

  // Vencedor (1º colocado mais barato, priorizando cesta completa)
  const winner = comparisonResults[0]
  // Segundo colocado estritamente diferente do vencedor
  const runnerUp = comparisonResults.find((r) => r.marketId !== winner?.marketId)
  const worst = comparisonResults[comparisonResults.length - 1]

  // Economia total em relação ao mais caro
  const maxSavings =
    worst && winner && worst.marketId !== winner.marketId ? worst.total - winner.total : 0
  const savingsVsRunnerUp =
    runnerUp && winner && runnerUp.marketId !== winner.marketId ? runnerUp.total - winner.total : 0

  /* ── Ações na Lista com Atualização Funcional Atômica ──────── */
  const updateQuantity = (productId, newQty) => {
    setList((prev) => {
      const updated = { ...prev }
      if (newQty <= 0) {
        delete updated[productId]
        showToast("Item removido da lista.")
      } else {
        updated[productId] = newQty
      }
      persistList(updated)
      return updated
    })
  }

  const handleClearList = () => {
    setList({})
    persistList({})
    setClearModalOpen(false)
    showToast("Sua lista de compras foi limpa.")
  }

  const handleLoadDemoList = () => {
    setList(INITIAL_DEMO_LIST)
    persistList(INITIAL_DEMO_LIST)
    showToast("Cesta de compras sugerida carregada!")
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full font-sans">
      {/* Toast Notifier */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-navy text-white px-5 py-3 rounded-2xl shadow-xl border border-brand-green/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Principal da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-navy tracking-tight">
              Minha Lista de Compras
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-brand-green">
              {items.length} produtos · {totalUnits} unidades
            </span>
          </div>
          <p className="text-sm text-brand-muted mt-1">
            Cálculo comparativo em tempo real do carrinho total entre todos os supermercados.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearModalOpen(true)}
              className="text-xs text-brand-muted hover:text-brand-error"
            >
              Limpar Lista
            </Button>
          )}
          <Link to="/catalog">
            <Button variant="primary" size="sm" leftIcon={<span>+</span>}>
              Adicionar Mais Produtos
            </Button>
          </Link>
        </div>
      </div>

      {/* Se a lista estiver vazia (Empty State do Figma) */}
      {items.length === 0 ? (
        <Card className="p-12 text-center max-w-lg mx-auto flex flex-col items-center justify-center my-12">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-brand-green flex items-center justify-center text-4xl mb-4 shadow-xs">
            🛒
          </div>
          <h2 className="text-xl font-bold text-brand-navy mb-1">Sua lista está vazia</h2>
          <p className="text-xs text-brand-muted max-w-sm mx-auto mb-6 leading-relaxed">
            Navegue pelo catálogo para adicionar itens que você precisa comprar ou carregue uma
            cesta padrão sugerida para ver a comparação de preços.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full justify-center">
            <Link to="/catalog" className="flex-1">
              <Button variant="primary" className="w-full">
                Explorar Catálogo
              </Button>
            </Link>
            <Button variant="outline" className="flex-1" onClick={handleLoadDemoList}>
              Carregar Cesta Sugerida
            </Button>
          </div>
        </Card>
      ) : (
        /* Layout Grid de Duas Colunas: Lista (Esquerda) e Painel Comparativo (Direita) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUNA ESQUERDA: ITENS DA LISTA (7 colunas no desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <Card variant="elevated" className="overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-brand-border/60 flex items-center justify-between bg-slate-50/50">
                <span className="text-sm font-bold text-brand-navy">
                  Itens Selecionados ({items.length})
                </span>
                <span className="text-xs text-brand-muted">
                  Ajuste as quantidades para recalcular
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {items.map(({ product, qty }) => {
                  return (
                    <div
                      key={product.id}
                      className="p-4 sm:p-5 flex items-center gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Emoji / Imagem */}
                      <span className="text-3xl shrink-0">{product.image || "📦"}</span>

                      {/* Informações do Produto */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-brand-navy truncate">
                          {product.name}
                        </h4>
                        <p className="text-xs text-brand-muted mt-0.5">
                          {product.brand} · {product.unit}
                        </p>
                      </div>

                      {/* Controles de Quantidade */}
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, qty - 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-brand-border text-brand-navy font-bold text-sm flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
                          title="Diminuir"
                        >
                          −
                        </button>

                        <span className="w-7 text-center text-xs font-bold text-brand-navy">
                          {qty}
                        </span>

                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, qty + 1)}
                          className="w-7 h-7 rounded-lg bg-brand-green text-white font-bold text-sm flex items-center justify-center hover:bg-brand-green-hover active:scale-95 transition-all shadow-xs"
                          title="Aumentar"
                        >
                          +
                        </button>
                      </div>

                      {/* Botão de Excluir Item */}
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, 0)}
                        className="text-slate-300 hover:text-brand-error p-1 rounded-lg transition-colors"
                        title="Remover produto da lista"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Ação de Adicionar Mais Itens */}
            <Link to="/catalog">
              <Button variant="outline" className="w-full py-3 text-xs font-semibold" leftIcon={<span>+</span>}>
                Adicionar Mais Produtos do Catálogo
              </Button>
            </Link>
          </div>

          {/* COLUNA DIREITA: PAINEL COMPARATIVO DE PREÇOS (5 colunas no desktop) */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky top-6">
            {/* CARD 1: DESTAQUE DO SUPERMERCADO MAIS BARATO (VENCEDOR) */}
            {winner && (
              <div
                className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-brand-green via-brand-green-hover to-brand-teal text-white shadow-xl shadow-brand-green/20 relative overflow-hidden notranslate"
                translate="no"
              >
                {/* Efeito sutil de brilho */}
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-extrabold uppercase tracking-wider mb-3">
                    <span>🏆</span>
                    <span>Melhor Opção Para Sua Lista</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-1">
                    {winner.market.name}
                  </h3>

                  <div className="my-4">
                    <span className="text-xs uppercase tracking-wider text-emerald-100 font-semibold block">
                      Total estimado da cesta
                    </span>
                    <p className="text-3xl sm:text-4xl font-extrabold mt-0.5 tracking-tight">
                      R$ {winner.total.toFixed(2)}
                    </p>
                  </div>

                  {/* Tag de Economia Real */}
                  {maxSavings > 0 && (
                    <div className="p-3 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-xs text-xs font-bold flex items-center gap-2">
                      <span className="text-base">💰</span>
                      <span>
                        Você economiza até{" "}
                        <strong className="underline decoration-white">
                          R$ {maxSavings.toFixed(2)}
                        </strong>{" "}
                        em relação ao concorrente mais caro!
                      </span>
                    </div>
                  )}

                  {runnerUp && runnerUp.marketId !== winner.marketId && savingsVsRunnerUp > 0 && (
                    <p className="text-[11px] text-emerald-100 mt-2 font-medium">
                      R$ {savingsVsRunnerUp.toFixed(2)} mais barato que o 2º colocado ({runnerUp.market.name}).
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* CARD 2: COMPARATIVO COMPLETO ENTRE TODAS AS REDES */}
            <Card variant="elevated" className="overflow-hidden notranslate" translate="no">
              <div className="p-4 sm:p-5 border-b border-brand-border/60 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                  Ranking Geral por Supermercado
                </span>
                <span className="text-[11px] text-brand-muted font-medium">
                  {MARKETS.length} redes monitoradas
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {comparisonResults.map((res, index) => {
                  const isFirst = index === 0
                  const difference = res.total - winner.total

                  return (
                    <div
                      key={res.marketId}
                      className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
                        isFirst ? "bg-emerald-50/60" : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Posição no Ranking */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                          isFirst
                            ? "bg-brand-green text-white shadow-xs"
                            : "bg-slate-200 text-brand-navy"
                        }`}
                      >
                        {index + 1}º
                      </div>

                      {/* Nome e Indicador do Mercado */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: res.market.color }}
                          />
                          <h4 className="text-sm font-bold text-brand-navy truncate">
                            {res.market.name}
                          </h4>
                          {isFirst && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-brand-green text-white">
                              MAIS BARATO
                            </span>
                          )}
                          {!res.isComplete && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700">
                              CESTA PARCIAL
                            </span>
                          )}
                        </div>

                        {res.missingItems.length > 0 && (
                          <p className="text-[10px] text-brand-error mt-0.5 font-semibold">
                            ⚠️ {res.missingItems.length} item indisponível nesta loja ({res.missingItems.join(", ")})
                          </p>
                        )}
                      </div>

                      {/* Preço e Diferença Monetária */}
                      <div className="text-right shrink-0">
                        <p
                          className={`text-base font-extrabold ${
                            isFirst ? "text-brand-green" : "text-brand-navy"
                          }`}
                        >
                          R$ {res.total.toFixed(2)}
                        </p>
                        {difference > 0 && (
                          <p className="text-[10px] font-bold text-brand-muted mt-0.5">
                            + R$ {difference.toFixed(2)} (+
                            {winner.total > 0 ? ((difference / winner.total) * 100).toFixed(1) : "0"}%)
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Toggle de Detalhamento por Item */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setShowItemDetails(!showItemDetails)}
                  className="text-xs text-brand-green font-bold hover:underline"
                >
                  {showItemDetails
                    ? "▲ Ocultar detalhes item a item"
                    : "▼ Ver quanto custa cada item por mercado"}
                </button>
              </div>

              {/* Tabela Detalhada Item a Item (Expansível) */}
              {showItemDetails && (
                <div className="p-4 border-t border-slate-100 bg-white overflow-x-auto animate-in fade-in duration-200">
                  <table className="w-full text-left text-xs notranslate" translate="no">
                    <thead>
                      <tr className="border-b border-slate-200 text-brand-muted text-[10px] uppercase font-bold">
                        <th className="pb-2">Item</th>
                        <th className="pb-2 text-center">Qtd</th>
                        {MARKETS.map((m) => (
                          <th key={m.id} className="pb-2 text-right">
                            {m.name.split(" ")[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map(({ product, qty }) => (
                        <tr key={product.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 font-medium text-brand-navy truncate max-w-[130px]">
                            {product.name}
                          </td>
                          <td className="py-2.5 text-center font-bold text-brand-navy">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-brand-navy text-[11px] font-bold">
                              {qty}x
                            </span>
                          </td>
                          {MARKETS.map((m) => {
                            const unitPrice = product.prices?.[m.id]
                            const subtotal =
                              unitPrice !== null && unitPrice !== undefined
                                ? unitPrice * qty
                                : null
                            return (
                              <td key={m.id} className="py-2.5 text-right font-semibold">
                                {subtotal !== null ? (
                                  <div>
                                    <span className="text-brand-navy block">
                                      R$ {subtotal.toFixed(2)}
                                    </span>
                                    {qty > 1 && (
                                      <span className="text-[10px] text-brand-muted font-normal block">
                                        R$ {unitPrice.toFixed(2)} un
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-brand-muted/60">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 font-extrabold text-brand-navy bg-slate-50/70">
                      <tr>
                        <td className="py-3 font-bold uppercase text-[10px] tracking-wider text-brand-muted">
                          Total por Loja
                        </td>
                        <td className="py-3 text-center text-[11px] text-brand-muted font-bold">
                          {totalUnits} un
                        </td>
                        {MARKETS.map((m) => {
                          const marketRes = comparisonResults.find((r) => r.marketId === m.id)
                          const total = marketRes ? marketRes.total : 0
                          const isWinner = winner && winner.marketId === m.id
                          return (
                            <td
                              key={m.id}
                              className={`py-3 text-right text-xs ${
                                isWinner ? "text-brand-green font-black" : "text-brand-navy font-bold"
                              }`}
                            >
                              R$ {total.toFixed(2)}
                            </td>
                          )
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Limpar Lista */}
      <Modal isOpen={clearModalOpen} onClose={() => setClearModalOpen(false)} size="sm">
        <ModalHeader>
          <ModalTitle>Limpar Lista de Compras?</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="text-xs text-brand-muted leading-relaxed">
            Tem certeza que deseja remover todos os <strong>{items.length} produtos</strong> da sua
            lista de compras? Esta ação não pode ser desfeita.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setClearModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" onClick={handleClearList}>
            Sim, Limpar Tudo
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
