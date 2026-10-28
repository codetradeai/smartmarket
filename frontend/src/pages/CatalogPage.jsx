import { useState, useEffect, useRef, useMemo } from "react";
import {
  CATEGORIES,
  MARKETS as DEFAULT_MARKETS,
  PRODUCTS as DEFAULT_PRODUCTS,
} from "../data";
import { produtoService, mercadoService, favoritoService } from "../services";
import { ProductImage, ProductDetailModal, Product360HoverPreview } from "../components/ui";

// Cores e Tokens oficiais SmartMarket (consistentes com index.css e Figma)
const C = {
  navy: "#0D2137",
  navyLight: "#16324F",
  green: "#22A95E",
  greenHover: "#1B8C4D",
  greenLight: "#E8F8F0",
  teal: "#1DB4A3",
  tealLight: "#E6F7F5",
  bg: "#F4FAF7",
  card: "#FFFFFF",
  muted: "#6B8A7A",
  border: "#D4E8DC",
  amber: "#F59E0B",
  coral: "#FF6B4A",
  coralLight: "#FFF1EE",
};

// Mapeamento visual autêntico das categorias com banners verticais temáticos (253x453 do Asun e Fort)
const CATEGORY_META = {
  graos: {
    bannerVertical: "/images/categorias/banner_vertical_graos.jpg",
    subtitulo: "Arroz gaúcho, feijões nobres, farinhas e grãos essenciais",
    cor: "#00863F",
  },
  leites: {
    bannerVertical: "/images/categorias/banner_vertical_laticinios.webp",
    subtitulo: "Leites UHT integrais e desnatados, queijos e derivados",
    cor: "#1A63B9",
  },
  oleos: {
    bannerVertical: "/images/categorias/banner_vertical_oleos.jpg",
    subtitulo: "Óleos de soja, azeites de oliva extravirgem e vinagres",
    cor: "#D97706",
  },
  cafe: {
    bannerVertical: "/images/categorias/banner_vertical_matinais.png",
    subtitulo: "Cafés tradicionais e torrados, chás e achocolatados",
    cor: "#78350F",
  },
  bebidas: {
    bannerVertical: "/images/categorias/banner_vertical_bebidas.webp",
    subtitulo: "Refrigerantes, sucos, cervejas e águas minerais",
    cor: "#2563EB",
  },
  carnes: {
    bannerVertical: "/images/categorias/banner_vertical_carnes.webp",
    subtitulo: "Cortes bovinos nobres, aves e linguiças selecionadas",
    cor: "#DC2626",
  },
  higiene: {
    bannerVertical: "/images/categorias/banner_vertical_higiene.webp",
    subtitulo: "Itens de higiene pessoal, sabonetes, xampus e cremes dentais",
    cor: "#0D9488",
  },
  biscoitos: {
    bannerVertical: "/images/categorias/banner_vertical_biscoitos.png",
    subtitulo: "Biscoitos doces, salgados, wafers e chocolates",
    cor: "#EA580C",
  },
  mercearia: {
    bannerVertical: "/images/categorias/banner_vertical_mercearia.webp",
    subtitulo: "Molhos, massas, condimentos, conservas e itens de despensa",
    cor: "#4B5563",
  },
  hortifruti: {
    bannerVertical: "/images/categorias/banner_vertical_hortifruti.webp",
    subtitulo: "Frutas frescas, legumes, verduras e produtos da horta",
    cor: "#16A34A",
  },
  limpeza: {
    bannerVertical: "/images/categorias/banner_vertical_limpeza.webp",
    subtitulo: "Detergentes, sabão em pó, desinfetantes e alvejantes",
    cor: "#0284C7",
  },
  padaria: {
    bannerVertical: "/images/categorias/banner_vertical_padaria.webp",
    subtitulo: "Pães frescos, bolos, tortas, doces e salgados",
    cor: "#D97706",
  },
  congelados: {
    bannerVertical: "/images/categorias/banner_vertical_congelados.webp",
    subtitulo: "Pizzas, hambúrgueres e pratos prontos congelados",
    cor: "#0284C7",
  },
  petshop: {
    bannerVertical: "/images/categorias/banner_vertical_petshop.webp",
    subtitulo: "Rações balanceadas, petiscos e cuidados para pets",
    cor: "#059669",
  },
  bazar: {
    bannerVertical: "/images/categorias/banner_vertical_bazar.webp",
    subtitulo: "Panelas, utilidades domésticas e descartáveis",
    cor: "#475569",
  },
};

// Persistência local da lista de compras
function getList() {
  try {
    return JSON.parse(sessionStorage.getItem("sm_list") || "{}");
  } catch {
    return {};
  }
}
function saveList(l) {
  sessionStorage.setItem("sm_list", JSON.stringify(l));
}

// Extrai o preço do produto para uma rede específica
function getPriceForMarket(product, market) {
  if (!product || !product.prices) return null;
  const mId = market.id?.toString().toLowerCase();
  const mName = market.name?.toLowerCase() || "";

  if (product.prices[mId] !== undefined) return product.prices[mId];

  for (const [key, val] of Object.entries(product.prices)) {
    const k = key.toLowerCase();
    if (mId && (k === mId || mId.includes(k) || k.includes(mId))) return val;
    if (mName && (mName.includes(k) || k.includes(mName.split(" ")[0]))) return val;
  }
  return null;
}

// Identifica a melhor oferta e a variação de preço
function getProductPricing(product, markets) {
  if (!product || !product.prices) return null;
  const valid = markets
    .map((m) => ({ market: m, price: getPriceForMarket(product, m) }))
    .filter((item) => item.price !== null && item.price !== undefined && Number(item.price) > 0);

  if (valid.length === 0) return null;

  valid.sort((a, b) => Number(a.price) - Number(b.price));
  const cheapest = valid[0];
  const mostExpensive = valid[valid.length - 1];
  const economia = mostExpensive.price - cheapest.price;

  return {
    bestMarket: cheapest.market,
    bestPrice: Number(cheapest.price),
    highestPrice: Number(mostExpensive.price),
    economia,
    allPrices: valid,
  };
}

// -----------------------------------------------------------------------------
// Ícones SVG minimalistas
// -----------------------------------------------------------------------------
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="#6B8A7A" strokeWidth="1.6" />
      <path d="M12 12l3.5 3.5" stroke="#6B8A7A" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconStar({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill={filled ? "#F59E0B" : "none"}>
      <path
        d="M7.5 1.5l1.72 3.49 3.85.56-2.79 2.71.66 3.84L7.5 10.27l-3.44 1.83.66-3.84L1.93 5.55l3.85-.56L7.5 1.5z"
        stroke={filled ? "#F59E0B" : "#9BB8AA"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconCart() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M1 1h2.2l1.6 7.2h6.8l1.4-5H4.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="12.5" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="12.5" r="1.1" fill="currentColor" />
    </svg>
  );
}
function IconHeart({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill={filled ? "#E11D48" : "none"}>
      <path
        d="M7.5 13S2 9.5 2 5.5A3.5 3.5 0 0 1 7.5 3 3.5 3.5 0 0 1 13 5.5C13 9.5 7.5 13 7.5 13z"
        stroke={filled ? "#E11D48" : "#9BB8AA"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Componente: Fita de Mercados Favoritos com Destaque
// -----------------------------------------------------------------------------
function FavMarketsStrip({ markets, favs, onToggle }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-border/70 p-3 sm:p-3.5 flex items-center gap-2.5 flex-wrap shadow-xs">
      <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-brand-border/60">
        <span className="text-amber-500 text-sm">⭐</span>
        <span className="text-xs font-bold text-brand-navy whitespace-nowrap">
          Redes do RS:
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {markets.map((m) => {
          const isFav = favs.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => onToggle(m.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                isFav
                  ? "bg-amber-50 text-amber-900 border-amber-300 shadow-xs"
                  : "bg-brand-bg text-brand-navy border-brand-border/80 hover:bg-white hover:border-brand-green/40"
              }`}
              title={isFav ? "Remover dos favoritos" : "Marcar como favorito"}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: m.color || C.navy }}
              />
              <span>{m.name}</span>
              <IconStar filled={isFav} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Componente: Card de Produto (Compacto, Rico e Ergonômico)
// -----------------------------------------------------------------------------
function ProductCard({
  product,
  markets,
  favMarkets,
  isFavProduct,
  onToggleFavProduct,
  onAdd,
  onUpdateQty,
  quantity = 0,
  onOpenDetail,
  isShelf = false,
}) {
  const [justAdded, setJustAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pricing = useMemo(() => getProductPricing(product, markets), [product, markets]);

  const imgSrc =
    product.imageLocal ||
    product.imagem_local ||
    product.imageUrl ||
    product.imagem_url ||
    (typeof product.image === "string" && product.image.startsWith("http")
      ? product.image
      : null);

  function handleAddClick(e) {
    e.stopPropagation();
    onAdd(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  function handleIncrement(e) {
    e.stopPropagation();
    onUpdateQty(product.id, quantity + 1);
  }

  function handleDecrement(e) {
    e.stopPropagation();
    onUpdateQty(product.id, Math.max(0, quantity - 1));
  }

  return (
    <div
      onClick={() => {
        setIsHovered(false);
        if (onOpenDetail) onOpenDetail(product);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative bg-white rounded-2xl border border-brand-border/70 p-3 sm:p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:border-brand-green/50 hover:-translate-y-1 cursor-pointer select-none ${
        isShelf
          ? "w-[230px] sm:w-[250px] shrink-0 snap-start"
          : "w-full"
      }`}
    >
      {/* Botão de Favoritar Produto */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavProduct(product.id);
        }}
        className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          isFavProduct
            ? "bg-rose-50 text-rose-600 border border-rose-200"
            : "bg-white/80 backdrop-blur-xs text-brand-muted hover:text-rose-500 border border-slate-200/70 opacity-0 group-hover:opacity-100 sm:opacity-70"
        }`}
        title={isFavProduct ? "Remover dos favoritos" : "Salvar nos favoritos"}
      >
        <IconHeart filled={isFavProduct} />
      </button>

      {/* Área da Imagem do Produto com Suporte a Preview 360° no Hover */}
      <div className="relative w-full h-40 bg-slate-50/60 rounded-xl overflow-hidden flex items-center justify-center p-2.5 mb-2.5 border border-slate-100 group-hover:bg-white transition-colors">
        <Product360HoverPreview
          product={product}
          alt={product.name}
          className="w-full h-full object-contain"
          fallbackIcon={product.image || "📦"}
          isCardHovered={isHovered}
        />

        {/* Badge de Oferta / Promoção */}
        {product.promo && (
          <span className="absolute top-2 left-2 bg-brand-coral text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
            Oferta
          </span>
        )}

        {/* Unidade / Medida */}
        <span className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-xs text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs pointer-events-none">
          {product.unit || "1 un"}
        </span>
      </div>

      {/* Informações Textuais */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-brand-muted font-bold uppercase tracking-wider">
          <span className="line-clamp-1">{product.brand || "Geral"}</span>
          <span className="text-slate-400 font-normal capitalize">
            {product.category}
          </span>
        </div>

        <h3 className="text-xs sm:text-sm font-bold text-brand-navy line-clamp-2 leading-snug min-h-[2.5rem] group-hover:text-brand-green transition-colors">
          {product.name}
        </h3>
      </div>

      {/* Bloco de Preços e Comparação */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
        {pricing ? (
          <div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[10px] text-brand-muted font-medium">
                Melhor preço:
              </span>
              {pricing.economia > 0 && (
                <span className="text-[10px] font-extrabold text-brand-green bg-emerald-50 px-1.5 py-0.2 rounded">
                  -R$ {pricing.economia.toFixed(2)}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-brand-green leading-tight">
                R$ {pricing.bestPrice.toFixed(2)}
              </span>
              <span className="text-[10px] text-brand-navy font-semibold truncate">
                no {pricing.bestMarket.name}
              </span>
            </div>

            {/* Mini fita comparativa com preços nas redes */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1.5">
              {pricing.allPrices.slice(0, 3).map((item) => (
                <span
                  key={item.market.id}
                  className={`text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap flex items-center gap-1 ${
                    item.market.id === pricing.bestMarket.id
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                  title={`${item.market.name}: R$ ${Number(item.price).toFixed(2)}`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.market.color || C.navy }}
                  />
                  <span>R$ {Number(item.price).toFixed(2)}</span>
                </span>
              ))}
              {pricing.allPrices.length > 3 && (
                <span className="text-[9px] text-brand-muted font-bold pl-0.5">
                  +{pricing.allPrices.length - 3}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-brand-muted font-medium py-1">
            Preço sob consulta
          </div>
        )}

        {/* Botão de Adicionar ou Controle de Quantidade */}
        <div className="pt-1">
          {quantity > 0 ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between bg-emerald-50 border border-brand-green/40 rounded-xl p-1 text-xs font-bold text-brand-navy"
            >
              <button
                type="button"
                onClick={handleDecrement}
                className="w-7 h-7 rounded-lg bg-white border border-brand-green/30 text-brand-green hover:bg-brand-green hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                title="Diminuir"
              >
                –
              </button>
              <span className="px-2 font-black text-brand-green">
                {quantity} na lista
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                className="w-7 h-7 rounded-lg bg-white border border-brand-green/30 text-brand-green hover:bg-brand-green hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                title="Aumentar"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddClick}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                justAdded
                  ? "bg-emerald-600 text-white"
                  : "bg-gradient-to-r from-brand-green to-brand-teal text-white hover:opacity-95 hover:shadow-md active:scale-98"
              }`}
            >
              {justAdded ? (
                <>✓ Adicionado!</>
              ) : (
                <>
                  <IconCart /> Adicionar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Componente: Prateleira Horizontal por Categoria (Inspirada no Fort & Asun)
// -----------------------------------------------------------------------------
function CategoryShelf({
  category,
  products,
  markets,
  favMarkets,
  favProducts,
  onToggleFavProduct,
  onAdd,
  onUpdateQty,
  listQuantities,
  onOpenDetail,
  onSelectCategory,
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const meta = CATEGORY_META[category.id] || {
    banner: null,
    subtitulo: `${products.length} itens disponíveis`,
    cor: C.navy,
  };

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", updateScrollButtons, { passive: true });
      window.addEventListener("resize", updateScrollButtons);
      return () => {
        el.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, [products]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -520 : 520;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="bg-white rounded-3xl border border-brand-border/70 p-4 sm:p-6 shadow-xs space-y-4">
      {/* Cabeçalho da Seção de Categoria idêntico às referências */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-brand-green border border-emerald-100 flex items-center justify-center text-xl shadow-xs shrink-0">
            {category.icon || "🛒"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-brand-navy tracking-tight">
                {category.label}
              </h2>
              <span className="text-[11px] font-bold text-brand-muted bg-brand-bg px-2.5 py-0.5 rounded-full border border-brand-border/70">
                {products.length} itens
              </span>
            </div>
            <p className="text-xs text-brand-muted mt-0.5">
              {meta.subtitulo}
            </p>
          </div>
        </div>

        {/* Controles de Navegação Lateral da Prateleira */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onSelectCategory(category.id)}
            className="text-xs font-bold text-brand-green hover:text-brand-green-hover hover:underline px-2 py-1"
          >
            Ver mais &rarr;
          </button>
          <div className="flex items-center gap-1.5 pl-2 border-l border-brand-border/60">
            <button
              type="button"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                canScrollLeft
                  ? "bg-white border-brand-border text-brand-navy hover:bg-brand-bg hover:border-brand-green/60 shadow-xs cursor-pointer"
                  : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
              }`}
              title="Voltar produtos"
            >
              <IconChevronLeft />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                canScrollRight
                  ? "bg-white border-brand-border text-brand-navy hover:bg-brand-bg hover:border-brand-green/60 shadow-xs cursor-pointer"
                  : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
              }`}
              title="Avançar produtos"
            >
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Prateleira Horizontal com o Detalhe Lateral Vertical 253x453 no início */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 px-0.5"
      >
        {/* DETALHE LATERAL VERTICAL DA CATEGORIA (253x453) - Idêntico às referências visuais */}
        {meta.bannerVertical && (
          <div
            onClick={() => onSelectCategory(category.id)}
            className="w-[190px] sm:w-[215px] md:w-[235px] shrink-0 self-stretch rounded-2xl overflow-hidden relative shadow-xs border border-brand-border/70 group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 snap-start bg-slate-50 flex items-center justify-center"
            style={{ minHeight: "380px" }}
            title={`Ver todos os produtos de ${category.label}`}
          >
            <img
              src={meta.bannerVertical}
              alt={`Departamento ${category.label}`}
              loading="lazy"
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-103"
              onError={(e) => {
                e.currentTarget.src =
                  "https://edge.osuper.com.br/A7OpgT2DfMtAB4B3wwXrE5fMcic=/253x453/smart/https://osuper-ecommerce-asun.s3.sa-east-1.amazonaws.com/f683d8f8-bfb3c2f9padariaeconfeitaria.webp";
              }}
            />
            {/* Tag flutuante sutil apenas no hover para indicar ação */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between text-white text-xs font-bold">
              <span>Explorar {category.label}</span>
              <span className="text-emerald-300 font-extrabold">&rarr;</span>
            </div>
          </div>
        )}

        {/* CARDS DE PRODUTOS DA CATEGORIA */}
        {products.map((prod) => (
          <ProductCard
            key={prod.id}
            product={prod}
            markets={markets}
            favMarkets={favMarkets}
            isFavProduct={favProducts.includes(prod.id)}
            onToggleFavProduct={onToggleFavProduct}
            onAdd={onAdd}
            onUpdateQty={onUpdateQty}
            quantity={listQuantities[prod.id] || 0}
            onOpenDetail={onOpenDetail}
            isShelf={true}
          />
        ))}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// PÁGINA PRINCIPAL DO CATÁLOGO SMARTMARKET
// -----------------------------------------------------------------------------
export default function CatalogPage() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [markets, setMarkets] = useState(DEFAULT_MARKETS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("todos");
  const [mktFilter, setMktFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("relevancia");
  const [viewMode, setViewMode] = useState("prateleiras"); // 'prateleiras' | 'grade'
  const [favMarkets, setFavMarkets] = useState([]);
  const [favProducts, setFavProducts] = useState([]);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  // Quantidades na lista de compras
  const [listQuantities, setListQuantities] = useState(() => getList());
  const listCount = useMemo(
    () => Object.values(listQuantities).reduce((acc, curr) => acc + curr, 0),
    [listQuantities]
  );

  // Carrega produtos da API com fallback robusto
  useEffect(() => {
    async function carregarDados() {
      try {
        setLoading(true);
        const [prodsData, mktsData, favMktsData, favProdsData] = await Promise.all([
          produtoService.buscarCatalogoComPrecos().catch(() => null),
          mercadoService.listar().catch(() => null),
          favoritoService.listarMercados().catch(() => []),
          favoritoService.listarProdutos().catch(() => []),
        ]);
        if (prodsData && prodsData.length > 0) setProducts(prodsData);
        if (mktsData && mktsData.length > 0) setMarkets(mktsData);
        if (Array.isArray(favMktsData)) {
          setFavMarkets(favMktsData.map((f) => f.mercadoId || f.id || f));
        }
        if (Array.isArray(favProdsData)) {
          setFavProducts(favProdsData.map((f) => f.produtoId || f.id || f));
        }
      } catch {
        // Fallback mantém DEFAULT_PRODUCTS e DEFAULT_MARKETS
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  // Gestão de favoritos
  async function toggleFavProduct(id) {
    const isFav = favProducts.includes(id);
    const next = isFav ? favProducts.filter((f) => f !== id) : [...favProducts, id];
    setFavProducts(next);
    try {
      if (isFav) await favoritoService.desfavoritarProduto(id);
      else await favoritoService.favoritarProduto(id);
    } catch {
      // silencioso fallback
    }
  }

  async function toggleFavMarket(id) {
    const isFav = favMarkets.includes(id);
    const next = isFav ? favMarkets.filter((f) => f !== id) : [...favMarkets, id];
    setFavMarkets(next);
    try {
      if (isFav) await favoritoService.desfavoritarMercado(id);
      else await favoritoService.favoritarMercado(id);
    } catch {
      // silencioso fallback
    }
  }

  // Gestão de itens na lista
  function handleAddToList(prod) {
    const next = { ...listQuantities, [prod.id]: (listQuantities[prod.id] || 0) + 1 };
    setListQuantities(next);
    saveList(next);
  }

  function handleUpdateQty(prodId, qty) {
    const next = { ...listQuantities };
    if (qty <= 0) {
      delete next[prodId];
    } else {
      next[prodId] = qty;
    }
    setListQuantities(next);
    saveList(next);
  }

  // Filtragem e ordenação inteligente dos produtos
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Filtro de Categoria
      if (
        selectedCat !== "todos" &&
        p.category?.toLowerCase() !== selectedCat.toLowerCase() &&
        !p.category?.toLowerCase().includes(selectedCat.toLowerCase())
      ) {
        return false;
      }
      // Filtro de Rede
      if (mktFilter !== "todos") {
        const price = getPriceForMarket(p, { id: mktFilter });
        if (price === null || price === undefined || Number(price) <= 0) return false;
      }
      // Filtro de Texto (Nome, Marca ou Descrição)
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(term);
        const matchBrand = p.brand?.toLowerCase().includes(term);
        const matchDesc = p.descricao?.toLowerCase().includes(term);
        if (!matchName && !matchBrand && !matchDesc) return false;
      }
      return true;
    });

    // Ordenação
    if (sortBy === "menor-preco") {
      result.sort((a, b) => {
        const pA = getProductPricing(a, markets)?.bestPrice || 99999;
        const pB = getProductPricing(b, markets)?.bestPrice || 99999;
        return pA - pB;
      });
    } else if (sortBy === "maior-economia") {
      result.sort((a, b) => {
        const pA = getProductPricing(a, markets)?.economia || 0;
        const pB = getProductPricing(b, markets)?.economia || 0;
        return pB - pA;
      });
    } else if (sortBy === "nome") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return result;
  }, [products, selectedCat, mktFilter, search, sortBy, markets]);

  // Agrupamento por categorias para o layout horizontal de prateleiras
  const groupedCategories = useMemo(() => {
    const catsToRender =
      selectedCat === "todos"
        ? CATEGORIES.filter((c) => c.id !== "todos")
        : CATEGORIES.filter((c) => c.id === selectedCat);

    return catsToRender
      .map((category) => {
        const prods = filteredProducts.filter((p) => {
          const catP = (p.category || "").toLowerCase();
          return catP === category.id.toLowerCase() || catP.includes(category.id.toLowerCase());
        });
        return { category, products: prods };
      })
      .filter((group) => group.products.length > 0);
  }, [filteredProducts, selectedCat]);

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-brand-navy">
      {/* 1. TOPO FIXO E CONTROLES DE NAVEGAÇÃO */}
      <header className="bg-white border-b border-brand-border/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
          {/* Linha 1: Título, Busca Rápida e Botão Minha Lista */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-brand-navy tracking-tight">
                  Catálogo SmartMarket
                </h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-brand-green border border-emerald-200">
                  RS
                </span>
              </div>
              <p className="text-xs text-brand-muted mt-0.5">
                {loading
                  ? "Sincronizando prateleiras..."
                  : `8 Redes do RS integradas · ${filteredProducts.length} produtos disponíveis`}
              </p>
            </div>

            {/* Input de Busca Especializada */}
            <div className="relative flex-1 max-w-lg">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <IconSearch />
              </div>
              <input
                type="text"
                placeholder="Buscar arroz, leite, café, marca ou categoria…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-brand-border/80 bg-brand-bg text-sm text-brand-navy placeholder:text-brand-muted focus:outline-none focus:border-brand-green focus:bg-white transition-all shadow-2xs font-sans"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-navy text-xs font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Botão de Acesso à Minha Lista */}
            <a
              href="/list"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-green to-brand-teal text-white text-xs font-bold shadow-sm hover:shadow-md transition-all shrink-0 self-start md:self-auto"
            >
              <IconCart />
              <span>Minha Lista</span>
              {listCount > 0 && (
                <span className="bg-white/25 px-2 py-0.5 rounded-full text-[11px] font-black">
                  {listCount}
                </span>
              )}
            </a>
          </div>

          {/* Linha 2: Fita de Mercados Favoritos */}
          <FavMarketsStrip
            markets={markets}
            favs={favMarkets}
            onToggle={toggleFavMarket}
          />

          {/* Linha 3: Filtro Horizontal de Categorias (Pills) e Filtros Rápidos */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar pt-1">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCat("todos")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  selectedCat === "todos"
                    ? "bg-brand-navy text-white border-brand-navy shadow-xs"
                    : "bg-white text-brand-navy border-brand-border/80 hover:bg-slate-50"
                }`}
              >
                <span>🏪</span>
                <span>Todos</span>
              </button>
              {CATEGORIES.filter((c) => c.id !== "todos").map((c) => {
                const active = selectedCat === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCat(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                      active
                        ? "bg-brand-navy text-white border-brand-navy shadow-xs font-bold"
                        : "bg-white text-brand-navy border-brand-border/80 hover:bg-slate-50"
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label.split(",")[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Controles de Ordenação e Alternância de Visualização */}
            <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-brand-border/60">
              {/* Filtro por Supermercado */}
              <select
                value={mktFilter}
                onChange={(e) => setMktFilter(e.target.value)}
                className="bg-white border border-brand-border/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-brand-navy focus:outline-none cursor-pointer"
                title="Filtrar por rede"
              >
                <option value="todos">Todas as redes</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {/* Ordenar */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-brand-border/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-brand-navy focus:outline-none cursor-pointer hidden sm:block"
                title="Critério de ordenação"
              >
                <option value="relevancia">Relevância</option>
                <option value="menor-preco">Menor Preço</option>
                <option value="maior-economia">Maior Economia</option>
                <option value="nome">Nome (A-Z)</option>
              </select>

              {/* Toggle: Prateleiras vs Grade */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-brand-border/70">
                <button
                  type="button"
                  onClick={() => setViewMode("prateleiras")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "prateleiras"
                      ? "bg-white text-brand-navy shadow-xs"
                      : "text-brand-muted hover:text-brand-navy"
                  }`}
                  title="Visualização em prateleiras horizontais por categoria"
                >
                  Prateleiras
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grade")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "grade"
                      ? "bg-white text-brand-navy shadow-xs"
                      : "text-brand-muted hover:text-brand-navy"
                  }`}
                  title="Visualização em grade contínua"
                >
                  Grade
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL DO CATÁLOGO */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Banner de Contexto de Busca Ativa */}
        {search.trim() && (
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-brand-muted">Resultados da busca para:</p>
              <h2 className="text-base font-extrabold text-brand-navy">
                &ldquo;{search}&rdquo;
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs font-bold text-brand-green hover:underline"
            >
              Limpar busca
            </button>
          </div>
        )}

        {/* MODO A: PRATELEIRAS HORIZONTAIS POR CATEGORIA (REFERÊNCIA FORT & ASUN) */}
        {viewMode === "prateleiras" && (
          <div className="space-y-8">
            {groupedCategories.length > 0 ? (
              groupedCategories.map(({ category, products: catProds }) => (
                <CategoryShelf
                  key={category.id}
                  category={category}
                  products={catProds}
                  markets={markets}
                  favMarkets={favMarkets}
                  favProducts={favProducts}
                  onToggleFavProduct={toggleFavProduct}
                  onAdd={handleAddToList}
                  onUpdateQty={handleUpdateQty}
                  listQuantities={listQuantities}
                  onOpenDetail={setSelectedProductDetail}
                  onSelectCategory={(id) => setSelectedCat(id)}
                />
              ))
            ) : (
              <div className="bg-white rounded-3xl border border-brand-border p-12 text-center space-y-3">
                <div className="text-4xl">🔍</div>
                <h3 className="text-base font-extrabold text-brand-navy">
                  Nenhum produto encontrado com os filtros aplicados
                </h3>
                <p className="text-xs text-brand-muted max-w-sm mx-auto">
                  Tente alterar o termo digitado ou redefinir a rede selecionada.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCat("todos");
                    setMktFilter("todos");
                  }}
                  className="mt-2 px-4 py-2 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-brand-green-hover"
                >
                  Restaurar Catálogo Completo
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODO B: GRADE GERAL DE PRODUTOS */}
        {viewMode === "grade" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">
                Mostrando {filteredProducts.length} produtos
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  markets={markets}
                  favMarkets={favMarkets}
                  isFavProduct={favProducts.includes(prod.id)}
                  onToggleFavProduct={toggleFavProduct}
                  onAdd={handleAddToList}
                  onUpdateQty={handleUpdateQty}
                  quantity={listQuantities[prod.id] || 0}
                  onOpenDetail={setSelectedProductDetail}
                  isShelf={false}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 3. MODAL DE DETALHES 360º DO PRODUTO */}
      <ProductDetailModal
        product={selectedProductDetail}
        allProducts={products}
        onSelectProduct={setSelectedProductDetail}
        markets={markets}
        isOpen={Boolean(selectedProductDetail)}
        onClose={() => setSelectedProductDetail(null)}
        onAddToList={handleAddToList}
        isFavorite={selectedProductDetail ? favProducts.includes(selectedProductDetail.id) : false}
        onToggleFavorite={toggleFavProduct}
      />
    </div>
  );
}
