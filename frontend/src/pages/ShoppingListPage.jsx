import { useState, useEffect, useMemo } from "react";
import {
  MARKETS as DEFAULT_MARKETS,
  PRODUCTS as DEFAULT_PRODUCTS,
} from "../data";
import { produtoService, mercadoService } from "../services";
import { ProductImage, ProductDetailModal } from "../components/ui";
import logoFort from "../../logo/logo-fort.png";
import logoAsun from "../../logo/logo-asun.png";
import logoStok from "../../logo/logo-stok.png";
import logoAtacadao from "../../logo/logo-atacadao.png";
import logoCarrefour from "../../logo/logo-carrefour.png";
import logoRissul from "../../logo/logo-rissul,.png";
import logoZaffari from "../../logo/zaffari-bourbon-logo.png";
import logoMaster from "../../logo/mastersupermercados-logo.png";

const MARKET_LOGOS = {
  fort: logoFort,
  asun: logoAsun,
  stok: logoStok,
  atacadao: logoAtacadao,
  carrefour: logoCarrefour,
  rissul: logoRissul,
  zaffari: logoZaffari,
  master: logoMaster,
};

const MARKET_LOGO_OPTICAL_CLASS = {
  zaffari: "max-h-7 scale-[1.15]",
  rissul: "max-h-8 scale-[1.75]",
  asun: "max-h-8 scale-[1.32]",
  stok: "max-h-8 scale-[1.35]",
  atacadao: "max-h-7 scale-[1.12]",
  master: "max-h-7 scale-[1.14]",
  fort: "max-h-8 scale-[1.4]",
  carrefour: "max-h-8 scale-[1.4]",
};

const C = {
  navy: "#0D2137",
  green: "#22A95E",
  teal: "#1DB4A3",
  bg: "#F4FAF7",
  muted: "#6B8A7A",
  border: "#D4E8DC",
  white: "#FFFFFF",
  amber: "#F59E0B",
  red: "#EF4444",
};

// Cesta sugerida inicial para que a página nunca abra vazia em testes de primeira viagem
const INITIAL_DEMO_LIST = {
  p1: 2, // 2x Arroz Branco Tio João 5kg
  p3: 2, // 2x Feijão Carioca Camil 1kg
  p9: 6, // 6x Leite Integral Italac 1L
  p14: 3, // 3x Óleo Liza 900ml
  p17: 2, // 2x Café Pilão 500g
};

function getStoredList() {
  try {
    const stored = JSON.parse(sessionStorage.getItem("sm_list") || "{}");
    if (Object.keys(stored).length > 0) return stored;
    return INITIAL_DEMO_LIST;
  } catch {
    return INITIAL_DEMO_LIST;
  }
}
function saveStoredList(l) {
  sessionStorage.setItem("sm_list", JSON.stringify(l));
}

function getPriceForMarket(product, market) {
  if (!product || !product.prices) return null;
  return (
    product.prices[market.id] ??
    product.prices[market.id?.toString()] ??
    product.prices[
      market.name?.toLowerCase().includes("fort")
        ? "fort"
        : market.name?.toLowerCase().includes("carrefour")
          ? "carrefour"
          : "big"
    ] ??
    null
  );
}

function getBestMarketPrice(product, markets) {
  let best = null;
  markets.forEach((m) => {
    const p = getPriceForMarket(product, m);
    if (p !== null && p !== undefined && Number(p) > 0) {
      const val = Number(p);
      if (!best || val < best.price) {
        best = { price: val, market: m };
      }
    }
  });
  return best;
}

function compareMarkets(list, products, markets) {
  return markets
    .map((market) => {
      let total = 0,
        available = 0;
      const missing = [];
      const itemBreakdown = [];
      Object.entries(list).forEach(([productId, qty]) => {
        const product = products.find(
          (p) => p.id?.toString() === productId?.toString(),
        );
        if (!product) return;
        const price = getPriceForMarket(product, market);
        if (price !== null && price !== undefined && Number(price) > 0) {
          const unitPrice = Number(price);
          const lineTotal = unitPrice * Number(qty);
          total += lineTotal;
          available++;
          itemBreakdown.push({
            id: product.id,
            name: product.name,
            qty: Number(qty),
            unitPrice,
            lineTotal,
          });
        } else {
          missing.push(product.name);
        }
      });
      return {
        marketId: market.id,
        marketName: market.name,
        color: market.color,
        total,
        available,
        missing,
        itemBreakdown,
      };
    })
    .filter((r) => r.available > 0)
    .sort((a, b) => a.total - b.total);
}

export default function ShoppingListPage() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [markets, setMarkets] = useState(DEFAULT_MARKETS);
  const [list, setList] = useState(getStoredList);
  const [compared, setCompared] = useState(true);
  const [chartMode, setChartMode] = useState("total"); // 'total' | 'diferenca'
  const [selectedMarketId, setSelectedMarketId] = useState(null);
  const [animateBars, setAnimateBars] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  const results = useMemo(
    () => compareMarkets(list, products, markets),
    [list, products, markets],
  );

  useEffect(() => {
    setAnimateBars(false);
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimateBars(true));
    });
    return () => cancelAnimationFrame(timer);
  }, [list, chartMode, compared]);

  useEffect(() => {
    saveStoredList(list);
  }, [list]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const [prodsData, mktsData] = await Promise.all([
          produtoService.buscarCatalogoComPrecos(),
          mercadoService.listar(),
        ]);
        if (prodsData && prodsData.length > 0) {
          const apiMap = new Map(prodsData.map((item) => [String(item.id), item]));
          const merged = DEFAULT_PRODUCTS.map((defItem) =>
            apiMap.has(String(defItem.id)) ? { ...defItem, ...apiMap.get(String(defItem.id)) } : defItem
          );
          setProducts(merged);
        }
        if (mktsData && mktsData.length > 0) setMarkets(mktsData);
      } catch {
        // Fallback
      }
    }
    carregarDados();
  }, []);

  const items = Object.entries(list)
    .map(([id, qty]) => ({
      product: products.find((p) => p.id?.toString() === id?.toString()),
      qty,
    }))
    .filter((i) => i.product);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  }

  function setQty(id, qty) {
    if (qty <= 0) {
      const next = { ...list };
      delete next[id];
      setList(next);
      showToast("Item removido da lista.");
    } else {
      setList({ ...list, [id]: qty });
    }
  }

  function clear() {
    setList({});
    showToast("Lista de compras limpa.");
  }

  function compare() {
    setCompared(true);
    setAnimateBars(false);
    setTimeout(() => setAnimateBars(true), 40);
    showToast("Gráfico comparativo atualizado!");
  }

  const totalUnits = Object.values(list).reduce((a, b) => a + b, 0);
  const winner = results[0];
  const winnerMarket = winner
    ? markets.find((m) => m.id === winner.marketId)
    : null;
  const savings =
    results.length >= 2
      ? results[results.length - 1].total - results[0].total
      : 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1720px] mx-auto w-full font-sans">
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
              {items.length} {items.length === 1 ? "item diferente" : "itens diferentes"}
            </span>
          </div>
          <p className="text-sm text-brand-muted mt-1">
            Cálculo comparativo em tempo real do carrinho total entre todos os
            supermercados.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {items.length > 0 && (
            <button
              onClick={clear}
              style={{
                padding: "9px 18px",
                borderRadius: "10px",
                border: `1px solid ${C.border}`,
                background: C.white,
                color: C.muted,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Limpar lista
            </button>
          )}
          <a
            href="/catalog"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 18px",
              borderRadius: "10px",
              border: "none",
              background: C.bg,
              color: C.navy,
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "Poppins, sans-serif",
              outline: `1px solid ${C.border}`,
            }}
          >
            + Adicionar produtos
          </a>
        </div>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            background: C.white,
            borderRadius: "16px",
            border: `1px solid ${C.border}`,
            padding: "48px 32px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "32px", margin: "0 0 12px" }}>🛒</p>
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: C.navy,
              margin: "0 0 6px",
            }}
          >
            Sua lista está vazia
          </h2>
          <p style={{ fontSize: "13px", color: C.muted, margin: "0 0 20px" }}>
            Adicione produtos no catálogo para comparar os preços entre os
            mercados.
          </p>
          <a
            href="/catalog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${C.green}, ${C.teal})`,
              color: C.white,
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 2px 10px rgba(34,169,94,0.28)",
            }}
          >
            Ir ao Catálogo
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Lista de itens ampliada (7 colunas no desktop) */}
          <div className="xl:col-span-7 bg-white rounded-3xl border border-brand-border/80 shadow-xs overflow-hidden">
            <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-brand-border/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-brand-navy">
                  Itens da Lista ({items.length})
                </h2>
                <p className="text-xs text-brand-muted mt-0.5">
                  Clique em qualquer produto para abrir as fotos e o comparativo entre as 8 redes
                </p>
              </div>
              <button
                type="button"
                onClick={compare}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-green to-brand-teal text-white text-sm font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                ⚡ Comparar Cestas
              </button>
            </div>

            <div className="divide-y divide-brand-border/70">
              {items.map(({ product, qty }) => {
                const imgSrc =
                  product.imageLocal ||
                  product.imagem_local ||
                  product.imageUrl ||
                  product.imagem_url ||
                  (typeof product.image === "string" && product.image.startsWith("http")
                    ? product.image
                    : null);
                const best = getBestMarketPrice(product, markets);
                const subtotal = best ? best.price * qty : null;

                return (
                  <div
                    key={product.id}
                    className="group flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-7 p-5 sm:p-7 hover:bg-emerald-50/25 transition-colors"
                  >
                    {/* Bloco Esquerdo: Imagem Grande + Informações do Produto */}
                    <div
                      onClick={() => setSelectedProductDetail(product)}
                      className="flex items-center gap-5 sm:gap-6 flex-1 min-w-0 cursor-pointer"
                      title="Ver foto e detalhes do produto"
                    >
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-50 border border-brand-border/80 flex items-center justify-center text-4xl shrink-0 overflow-hidden p-3 shadow-xs group-hover:bg-white group-hover:border-brand-green/50 transition-all">
                        {imgSrc ? (
                          <ProductImage
                            src={imgSrc}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                            fallbackIcon={product.image || "📦"}
                          />
                        ) : (
                          <span>{product.image || "📦"}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {product.category && (
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-green bg-brand-green-light px-3 py-0.5 rounded-full">
                              {product.category}
                            </span>
                          )}
                          <span className="text-xs sm:text-sm font-semibold text-brand-muted">
                            {product.brand || "Geral"} · {product.unit || "1 un"}
                          </span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-extrabold text-brand-navy leading-snug group-hover:text-brand-green transition-colors line-clamp-2">
                          {product.name}
                        </h3>

                        {best ? (
                          <div className="inline-flex flex-wrap items-center gap-2.5 bg-brand-green-light/60 border border-brand-green/20 px-3.5 py-1.5 rounded-xl">
                            <span className="text-xs sm:text-sm text-brand-navy font-medium">
                              Menor preço unitário:{" "}
                              <strong className="text-brand-green font-black text-sm sm:text-base">
                                R$ {best.price.toFixed(2)}
                              </strong>{" "}
                              no <strong className="text-brand-navy font-extrabold">{best.market.name}</strong>
                            </span>
                            <span className="text-xs font-bold text-brand-green group-hover:underline">
                              Ver comparativo &rarr;
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-brand-muted">
                            Clique para ver detalhes do produto
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bloco Direito: Subtotal + Controle de Quantidade Ampliado */}
                    <div className="flex items-center justify-between md:justify-end gap-5 sm:gap-7 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                      {subtotal !== null && (
                        <div className="text-left md:text-right">
                          <span className="block text-xs font-bold uppercase tracking-wider text-brand-muted">
                            Subtotal ({qty} {qty === 1 ? "un" : "uns"})
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-brand-green">
                            R$ {subtotal.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2.5 bg-brand-bg rounded-2xl p-2 border border-brand-border">
                        <button
                          type="button"
                          onClick={() => setQty(product.id, qty - 1)}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-brand-border/80 text-brand-navy hover:bg-brand-green hover:text-white hover:border-brand-green font-black text-xl flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title="Diminuir quantidade"
                          aria-label="Diminuir quantidade"
                        >
                          −
                        </button>
                        <span className="text-lg sm:text-xl font-black text-brand-navy min-w-[36px] text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(product.id, qty + 1)}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-brand-border/80 text-brand-navy hover:bg-brand-green hover:text-white hover:border-brand-green font-black text-xl flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title="Aumentar quantidade"
                          aria-label="Aumentar quantidade"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setQty(product.id, 0)}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer text-base font-bold"
                        title="Remover item da lista"
                        aria-label="Remover item da lista"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Painel Interativo de Comparação com Gráfico Animado (5 colunas no desktop) */}
          {compared && results.length > 0 && (
            <div className="xl:col-span-5 flex flex-col gap-5">
              {/* Card Vencedor — Explicação Direta para o Cidadão */}
              {winner && winnerMarket && (
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D2137] via-[#133250] to-[#0D2137] text-white p-6 shadow-lg border border-emerald-400/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 px-3 py-1 text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                        🏆 Onde sua compra sai mais barata
                      </span>
                      <h3 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
                        {winnerMarket.name}
                      </h3>
                      <p className="text-xs text-white/70 mt-0.5">
                        {winner.available} de {items.length} produtos disponíveis
                      </p>
                    </div>

                    {MARKET_LOGOS[winnerMarket.id] && (
                      <div className="w-24 h-13 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
                        <img
                          src={MARKET_LOGOS[winnerMarket.id]}
                          alt={winnerMarket.name}
                          className={`w-full object-contain ${MARKET_LOGO_OPTICAL_CLASS[winnerMarket.id] || "max-h-9"}`}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <span className="block text-xs text-white/70 font-medium">
                        Valor total da sua lista aqui:
                      </span>
                      <span className="text-3xl sm:text-4xl font-black text-[#4ADE80] tracking-tight">
                        R$ {winner.total.toFixed(2)}
                      </span>
                    </div>

                    {savings > 0 && (
                      <div className="rounded-2xl bg-emerald-500/20 border border-emerald-400/35 px-4 py-2.5 text-right">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                          Você economiza no bolso
                        </span>
                        <span className="text-xl font-black text-white">
                          até R$ {savings.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* GRÁFICO INTERATIVO E ANIMADO PARA LEITURA FÁCIL */}
              <div className="bg-white rounded-3xl border border-brand-border/80 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-border/70">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📊</span>
                      <h4 className="text-base sm:text-lg font-extrabold text-brand-navy">
                        Gráfico Comparativo de Preços
                      </h4>
                    </div>
                    <p className="text-xs text-brand-muted mt-0.5">
                      Quanto menor a barra, mais barato! Clique em um mercado para ver o preço de cada item lá.
                    </p>
                  </div>

                  {/* Alternador simples para o cidadão: Total vs Diferença */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-brand-border/70 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setChartMode("total")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartMode === "total"
                          ? "bg-white text-brand-navy shadow-xs"
                          : "text-brand-muted hover:text-brand-navy"
                      }`}
                    >
                      Valor Total (R$)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode("diferenca")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartMode === "diferenca"
                          ? "bg-white text-brand-navy shadow-xs"
                          : "text-brand-muted hover:text-brand-navy"
                      }`}
                    >
                      Quanto Pago a Mais
                    </button>
                  </div>
                </div>

                {/* Legenda estilo semáforo */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-brand-muted bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                    <strong className="text-brand-navy">Verde:</strong> Mais barato
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                    <strong className="text-brand-navy">Amarelo:</strong> Preço médio
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                    <strong className="text-brand-navy">Vermelho:</strong> Mais caro
                  </span>
                </div>

                {/* Barras Horizontais Animadas */}
                <div className="space-y-3">
                  {(() => {
                    const minTotal = results[0]?.total || 1;
                    const maxTotal = results[results.length - 1]?.total || minTotal;
                    const maxDiff = Math.max(0.01, maxTotal - minTotal);

                    return results.map((r, i) => {
                      const m = markets.find((x) => x.id === r.marketId);
                      if (!m) return null;
                      const diff = Math.max(0, r.total - minTotal);
                      const diffPct = minTotal > 0 ? (diff / minTotal) * 100 : 0;
                      const isWinner = i === 0;
                      const isWorst = i === results.length - 1 && results.length > 2;
                      const isSelected = selectedMarketId === r.marketId;

                      // Largura da barra animada (escala visual clara)
                      const targetWidthPct =
                        chartMode === "total"
                          ? maxTotal > minTotal
                            ? 52 + ((r.total - minTotal) / (maxTotal - minTotal)) * 48
                            : 100
                          : isWinner
                            ? 14
                            : 22 + (diff / maxDiff) * 78;

                      const barGradient = isWinner
                        ? "from-emerald-500 to-teal-500"
                        : isWorst || i >= Math.ceil(results.length * 0.65)
                          ? "from-rose-500 to-orange-500"
                          : "from-amber-400 to-amber-500";

                      const logoSrc = MARKET_LOGOS[m.id];
                      const opticalClass = MARKET_LOGO_OPTICAL_CLASS[m.id] || "max-h-7";

                      return (
                        <div
                          key={r.marketId}
                          onClick={() =>
                            setSelectedMarketId(isSelected ? null : r.marketId)
                          }
                          className={`group rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer select-none ${
                            isWinner
                              ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/60 shadow-2xs"
                              : isSelected
                                ? "bg-slate-50 border-brand-navy/40 shadow-xs"
                                : "bg-white border-brand-border/80 hover:border-brand-green/50 hover:bg-slate-50/60"
                          }`}
                          title="Clique para ver o preço de cada produto neste supermercado"
                        >
                          {/* Linha Superior: Posição, Logo, Nome e Valores */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                                  isWinner
                                    ? "bg-emerald-600 text-white"
                                    : isWorst
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-slate-200 text-brand-navy"
                                }`}
                              >
                                {i + 1}º
                              </span>

                              <div className="w-18 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center px-1.5 overflow-hidden shrink-0">
                                {logoSrc ? (
                                  <img
                                    src={logoSrc}
                                    alt={m.name}
                                    className={`w-full object-contain ${opticalClass}`}
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-brand-navy truncate">
                                    {m.name}
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <span className="text-xs sm:text-sm font-extrabold text-brand-navy block truncate">
                                  {m.name}
                                </span>
                                {isWinner ? (
                                  <span className="text-[10px] font-extrabold text-emerald-700">
                                    ★ Melhor escolha para o seu bolso
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-rose-600">
                                    +R$ {diff.toFixed(2)} mais caro (+{diffPct.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`text-base sm:text-lg font-black block ${
                                  isWinner
                                    ? "text-emerald-700"
                                    : isWorst
                                      ? "text-rose-600"
                                      : "text-brand-navy"
                                }`}
                              >
                                R$ {r.total.toFixed(2)}
                              </span>
                              <span className="text-[10px] font-bold text-brand-muted group-hover:text-brand-green">
                                {isSelected ? "▲ Ocultar itens" : "▼ Ver itens"}
                              </span>
                            </div>
                          </div>

                          {/* Barra do Gráfico com Animação Suave */}
                          <div className="w-full h-7 bg-slate-100 rounded-xl overflow-hidden p-0.5 border border-slate-200/60">
                            <div
                              style={{
                                width: animateBars ? `${targetWidthPct}%` : "6%",
                                transition:
                                  "width 850ms cubic-bezier(0.22, 1, 0.36, 1)",
                              }}
                              className={`h-full rounded-lg bg-gradient-to-r ${barGradient} flex items-center justify-end pr-2.5 text-[11px] font-extrabold text-white shadow-2xs whitespace-nowrap overflow-hidden`}
                            >
                              {chartMode === "total"
                                ? `R$ ${r.total.toFixed(2)}`
                                : isWinner
                                  ? "R$ 0,00 a mais (Mais barato!)"
                                  : `+R$ ${diff.toFixed(2)}`}
                            </div>
                          </div>

                          {r.missing.length > 0 && (
                            <p className="mt-1.5 text-[11px] font-semibold text-amber-700">
                              ⚠️ {r.missing.length} produto(s) sem cotação nesta rede
                            </p>
                          )}

                          {/* Raio-X Expansível ao clicar na barra do mercado */}
                          {isSelected && r.itemBreakdown.length > 0 && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="mt-3 pt-3 border-t border-slate-200/80 space-y-1.5 text-xs animate-in fade-in duration-150"
                            >
                              <p className="font-bold text-brand-navy mb-2">
                                Preço de cada item da sua lista no {m.name}:
                              </p>
                              {r.itemBreakdown.map((it) => (
                                <div
                                  key={it.id}
                                  className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-slate-50"
                                >
                                  <span className="text-brand-navy font-medium truncate">
                                    {it.qty}x {it.name}
                                  </span>
                                  <span className="font-extrabold text-brand-navy shrink-0">
                                    R$ {it.lineTotal.toFixed(2)}{" "}
                                    <span className="text-[10px] font-normal text-brand-muted">
                                      (R$ {it.unitPrice.toFixed(2)}/un)
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalhes e Fotos HD do Produto */}
      <ProductDetailModal
        product={selectedProductDetail}
        allProducts={products}
        onSelectProduct={setSelectedProductDetail}
        markets={markets}
        isOpen={Boolean(selectedProductDetail)}
        onClose={() => setSelectedProductDetail(null)}
        onAddToList={(prod) => {
          setQty(prod.id, (list[prod.id] || 0) + 1);
        }}
      />
    </div>
  );
}
