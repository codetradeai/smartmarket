import { diaDaColeta, formatarDataColeta, produtoDaCesta } from "../../utils/cestaDemo"

/**
 * Preços reais por rede da "Cesta de demonstração" (scraper/gerar_cesta_demo.py).
 *
 * Mostra só o que foi coletado: preço, data e hora da coleta (horário de Brasília) e, nas redes sem
 * preço na cesta, "sem preço nesta rede". Não calcula preço, diferença nem economia.
 */

function formatarPreco(valor) {
  return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`
}

export function CestaDemoPrecos({ produtoId, markets = [] }) {
  const item = produtoDaCesta(produtoId)
  if (!item) return null

  const comPreco = markets
    .filter((m) => item.precos[m.id])
    .map((m) => ({ market: m, ...item.precos[m.id] }))
    .sort((a, b) => a.preco - b.preco)
  const semPreco = markets.filter((m) => !item.precos[m.id])

  return (
    <section
      aria-labelledby="cesta-demo-titulo"
      className="pt-6 border-t border-slate-200/90 space-y-3"
      data-testid="cesta-demo"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="cesta-demo-titulo" className="text-base font-black text-slate-900 tracking-tight">
          Cesta de demonstração
        </h3>
        <span className="text-[11px] font-semibold text-slate-500">EAN {item.ean}</span>
      </div>
      <p className="text-xs text-slate-500">
        Preços reais coletados nas redes, com a data e a hora de cada coleta (horário de Brasília).
        Não são preços do dia.
      </p>
      <p role="note" className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Preços das lojas online de Master e Stok; filial não identificada. Foto da coleta de {diaDaColeta()}.
      </p>
      <ul className="space-y-2">
        {comPreco.map(({ market, preco, coletado_em: coletadoEm }) => (
          <li
            key={market.id}
            data-rede={market.id}
            className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
          >
            <span className="text-sm font-semibold text-slate-800 truncate">{market.name}</span>
            <span className="text-right shrink-0">
              <span className="block text-sm font-black text-slate-900">{formatarPreco(preco)}</span>
              <span className="block text-[11px] text-slate-500">coletado em {formatarDataColeta(coletadoEm)}</span>
            </span>
          </li>
        ))}
        {semPreco.map((market) => (
          <li
            key={market.id}
            data-rede={market.id}
            className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
          >
            <span className="text-xs text-slate-500 font-medium truncate">{market.name}</span>
            <span className="text-[11px] text-slate-400 italic">sem preço nesta rede</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
