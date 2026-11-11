import { useEffect, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Package, Radar, Scale, Scan, ShieldCheck } from "lucide-react"
import { REDES_COM_COLETA_ATIVA } from "../utils/redesDoCatalogo"
import { useFramesDoProduto } from "../hooks/useFramesDoProduto"

/**
 * Seção "Sobre" da Home: blueprint interativo. Um núcleo central muda de estado conforme o pilar
 * selecionado; a telemetria e as conexões SVG acompanham. Tudo aqui é ilustração conceitual: não há
 * preço, percentual, status de API ou política de anúncios inventados (ver docs na PR).
 */

const VERDE = "#0e7a46"
const DESTAQUE = "#34d399"

// Títulos e textos dos pilares: preservados integralmente do material original.
const CAMADAS = [
  {
    titulo: "Coleta Automatizada RS",
    texto: "Robôs especializados que monitoram VTEX, VipCommerce e APIs oficiais das 8 maiores redes do RS.",
    Icone: Radar,
    rotulo: "COLETA",
    descricao: "Identificação e integração de fontes de dados.",
    chips: ["VTEX", "VipCommerce"],
  },
  {
    titulo: "Fotos e 360° em Alta Definição",
    texto: "Catálogo visual enriquecido com imagens originais em alta resolução e rotação 360° interativa.",
    Icone: Scan,
    rotulo: "VISUAL",
    descricao: "Enriquecimento visual do catálogo de produtos.",
    chips: ["Perspectiva 3D"],
  },
  {
    titulo: "Comparação Cesta a Cesta",
    texto: "Calculamos a economia líquida e apontamos o supermercado mais vantajoso para sua compra inteira.",
    Icone: Scale,
    rotulo: "COMPARAÇÃO",
    descricao: "Análise de preços considerando a cesta completa.",
    chips: ["Por produto", "Cesta completa"],
  },
  {
    titulo: "Transparência Total",
    texto: "Preços neutros, sem favorecimento de marcas, focados 100% no benefício do consumidor gaúcho.",
    Icone: ShieldCheck,
    rotulo: "TRANSPARÊNCIA",
    descricao: "Critérios claros e foco no consumidor.",
    chips: ["Comparação neutra"],
  },
]

const NUM = (i) => `LAYER 0${i + 1}`

// Posição de cada pilar na grade do desktop: dois à esquerda, dois à direita do núcleo.
const POSICAO_LG = [
  "lg:col-start-1 lg:row-start-1",
  "lg:col-start-1 lg:row-start-2",
  "lg:col-start-3 lg:row-start-1",
  "lg:col-start-3 lg:row-start-2",
]

/* ───────────── Estados do núcleo ───────────── */

function ProdutoEsquematico({ className = "", style, children }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-white/25 bg-white/[0.08] text-white ${className}`}
      style={style}
      aria-hidden="true"
    >
      {children ?? <Package size={34} strokeWidth={1.5} />}
    </div>
  )
}

function EstadoColeta({ ativo }) {
  const fontes = ["VTEX", "VipCommerce", "APIs oficiais"]
  const ativas = REDES_COM_COLETA_ATIVA.length
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-1 items-stretch">
        <ul className="flex flex-col justify-between py-1 text-[11px] font-bold text-white">
          {fontes.map((f) => (
            <li key={f} className="rounded-md border border-white/20 bg-white/[0.06] px-2 py-1.5">
              {f}
            </li>
          ))}
        </ul>
        <svg className="h-full w-10 shrink-0 sm:w-14" viewBox="0 0 48 100" preserveAspectRatio="none" aria-hidden="true">
          {["M0 17 C24 17 24 50 48 50", "M0 50 H48", "M0 83 C24 83 24 50 48 50"].map((d) => (
            <path key={d} d={d} fill="none" stroke={DESTAQUE} strokeOpacity="0.7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="relative my-auto overflow-hidden rounded-xl">
          <ProdutoEsquematico className="h-24 w-20 sm:h-28 sm:w-24" />
          {ativo && <span className="sm-bp-varredura absolute inset-x-0 top-0 h-0.5" style={{ background: DESTAQUE }} aria-hidden="true" />}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-white/70">
        {ativas} redes com coleta diária ativa hoje. Fontes identificadas, sem status em tempo real.
      </p>
    </div>
  )
}

function EstadoVisualEsquematico() {
  const [angulo, setAngulo] = useState(-14)
  const [sobre, setSobre] = useState(false)
  const girar = (delta) => setAngulo((a) => a + delta)

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-1 items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => girar(-45)}
          aria-label="Girar o produto para a esquerda"
          className="rounded-md p-2 text-white ring-1 ring-white/25 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34d399]"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <div
          className="flex h-full flex-1 items-center justify-center"
          style={{ perspective: "1000px" }}
          onMouseEnter={() => setSobre(true)}
          onMouseLeave={() => setSobre(false)}
        >
          <div
            className="relative h-24 w-20 transition-transform duration-500 ease-out motion-reduce:transition-none sm:h-28 sm:w-24"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${sobre ? -8 : 0}deg) rotateY(${angulo + (sobre ? 20 : 0)}deg)`,
            }}
            aria-hidden="true"
          >
            {/* camadas atrás dão espessura; só a da frente leva o ícone */}
            {[-16, -8, 0].map((z) => (
              <ProdutoEsquematico key={z} className="absolute inset-0" style={{ transform: `translateZ(${z}px)` }}>
                {z === 0 && <Package size={34} strokeWidth={1.5} />}
              </ProdutoEsquematico>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => girar(45)}
          aria-label="Girar o produto para a direita"
          className="rounded-md p-2 text-white ring-1 ring-white/25 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34d399]"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-white/70">
        Efeito de perspectiva ilustrativo. No catálogo, os produtos com 360° giram ao passar o mouse.
      </p>
    </div>
  )
}

// Imagem estática do produto, na mesma ordem de preferência do Product360HoverPreview.
function imagemEstatica(p) {
  return (
    p?.imageLocal ||
    p?.imagem_local ||
    p?.imageUrl ||
    p?.imagem_url ||
    (typeof p?.image === "string" && p.image.startsWith("http") ? p.image : null) ||
    null
  )
}

/** Foto 360° real de um produto do catálogo: mouse sobre a imagem ou setas trocam o quadro. */
function EstadoVisualReal({ produto, ativo }) {
  const frames = useFramesDoProduto(produto, ativo)
  const [indice, setIndice] = useState(0)
  const [falhou, setFalhou] = useState(false)
  const total = frames.length
  const tem360 = total >= 2
  const src = (tem360 && frames[indice % total]) || imagemEstatica(produto)
  const passo = Math.max(1, Math.round(total / 8))
  const nome = produto?.name || "Produto do catálogo"

  // Pré-carrega todos os quadros ao abrir a camada: sem isso, a primeira rotação baixa cada quadro só
  // quando o mouse chega nele e engasga. Respeita "economia de dados".
  useEffect(() => {
    if (!ativo || total < 2 || navigator.connection?.saveData) return
    for (const quadro of frames) {
      const img = new Image()
      img.decoding = "async"
      img.src = quadro
    }
  }, [ativo, frames, total])

  if (falhou || !src) return <EstadoVisualEsquematico />

  const girar = (delta) => setIndice((i) => (i + delta + total) % total)
  const aoMover = (e) => {
    if (!tem360) return
    const r = e.currentTarget.getBoundingClientRect()
    const pos = Math.min(0.999, Math.max(0, (e.clientX - r.left) / r.width))
    setIndice(Math.floor(pos * total))
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-1 items-center justify-between gap-2">
        <button
          type="button"
          disabled={!tem360}
          onClick={() => girar(-passo)}
          aria-label="Girar o produto para a esquerda"
          className="rounded-md p-2 text-white ring-1 ring-white/25 transition hover:bg-white/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34d399]"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <div
          className="relative h-40 w-40 overflow-hidden rounded-xl bg-white sm:h-44 sm:w-44"
          onMouseMove={aoMover}
          style={{ touchAction: "pan-y" }}
        >
          <img
            src={src}
            alt={`${nome}${tem360 ? `, vista ${(indice % total) + 1} de ${total}` : ""}`}
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={() => setFalhou(true)}
            className="h-full w-full select-none object-contain p-2"
          />
          {tem360 && (
            <span className="absolute left-2 top-2 rounded-md border border-slate-200 bg-slate-100/95 px-1.5 py-0.5 text-[10px] font-black leading-none text-slate-800">
              360°
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={!tem360}
          onClick={() => girar(passo)}
          aria-label="Girar o produto para a direita"
          className="rounded-md p-2 text-white ring-1 ring-white/25 transition hover:bg-white/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34d399]"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-white/70">
        {tem360
          ? `Fotos reais do catálogo (${nome}). Passe o mouse sobre a imagem ou use as setas para girar.`
          : `Foto real do catálogo (${nome}). Carregando a rotação 360°.`}
      </p>
    </div>
  )
}

function EstadoVisual({ produto, ativo }) {
  return produto && imagemEstatica(produto) ? <EstadoVisualReal produto={produto} ativo={ativo} /> : <EstadoVisualEsquematico />
}

function EstadoComparacao({ ativo }) {
  // Ilustração conceitual: nenhum preço, percentual ou ranking.
  const porProduto = ["#9BB8AA", "#5C7668", "#9BB8AA", "#5C7668"]
  const transicao = "transition-[width] duration-700 ease-out motion-reduce:transition-none"
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-5 pt-2">
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-white">Comparação por produto</p>
          <div className="flex gap-1">
            {porProduto.map((cor, i) => (
              <div key={i} className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${transicao}`} style={{ width: ativo ? "100%" : "0%", background: cor, transitionDelay: `${i * 90}ms` }} />
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-white/60">O menor preço muda de rede item a item.</p>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-white">Comparação da cesta completa</p>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${transicao}`}
              style={{ width: ativo ? "100%" : "0%", background: VERDE, boxShadow: `inset -3px 0 0 ${DESTAQUE}`, transitionDelay: "350ms" }}
            />
          </div>
          <p className="mt-1 text-[11px] text-white/60">O total da compra inteira define a rede mais vantajosa.</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-white/70">Ilustração conceitual, sem preços ou percentuais.</p>
    </div>
  )
}

function EstadoTransparencia() {
  const criterios = ["Preços neutros", "Sem favorecimento de marcas", "Foco no consumidor gaúcho"]
  return (
    <div className="flex h-full items-center gap-5">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#34d399]/60 bg-[#34d399]/10 text-[#34d399] sm:h-24 sm:w-24" aria-hidden="true">
        <ShieldCheck size={40} strokeWidth={1.5} />
      </div>
      <ul className="space-y-2.5 text-sm font-bold text-white">
        {criterios.map((c) => (
          <li key={c} className="flex items-start gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-[#34d399]" aria-hidden="true" />
            {c}
          </li>
        ))}
      </ul>
    </div>
  )
}

const ESTADOS = [EstadoColeta, EstadoVisual, EstadoComparacao, EstadoTransparencia]

/* ───────────── Conexões ───────────── */

function Conexoes({ ativa }) {
  // Barramento no vão entre as colunas (só desktop). Ficam sob os cartões, que são opacos.
  const esq = 32.3
  const dir = 67.7
  const alvos = [
    { x: 15, y: 25, meio: esq },
    { x: 15, y: 75, meio: esq },
    { x: 85, y: 25, meio: dir },
    { x: 85, y: 75, meio: dir },
  ]
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {alvos.map(({ x, y, meio }, i) => (
          <path
            key={i}
            d={`M50 50 H${meio} V${y} H${x}`}
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeWidth={i === ativa ? 2 : 1}
            strokeLinejoin="round"
            stroke={i === ativa ? DESTAQUE : "rgba(255,255,255,0.16)"}
            className={`transition-all duration-300 ${i === ativa ? "sm-bp-fluxo" : ""}`}
          />
        ))}
      </svg>
      {alvos.map(({ y, meio }, i) => (
        <span
          key={i}
          className="pointer-events-none absolute z-0 hidden h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300 lg:block"
          style={{ left: `${meio}%`, top: `${y}%`, background: i === ativa ? DESTAQUE : "rgba(255,255,255,0.3)" }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

/* ───────────── Seção ───────────── */

/** `produto`: item do catálogo com `recursosVisuais.has360` (opcional); sem ele o estado 02 usa a ilustração. */
export function AnatomiaSmartMarket({ produto = null }) {
  const [ativa, setAtiva] = useState(0)
  const atual = CAMADAS[ativa]

  return (
    <section id="sobre" className="scroll-mt-24 bg-white border-t border-brand-border/60 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-brand-green-light px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-green-dark">
            Sobre o SmartMarket
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl text-balance">
            Economia inteligente na palma da sua mão.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-brand-muted leading-relaxed">
            O SmartMarket nasceu com um propósito claro: eliminar o desperdício de tempo e dinheiro na comparação de preços em supermercados do Rio Grande do Sul.
          </p>
        </div>

        <div
          className="rounded-3xl bg-brand-navy p-4 sm:p-8 lg:p-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        >
          <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.25fr_1fr] lg:grid-rows-2 lg:gap-12">
            <Conexoes ativa={ativa} />

            {/* Núcleo central de inspeção */}
            <div className="relative z-10 flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-brand-navy-dark sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-white/60">
                <span>Núcleo de inspeção</span>
                <span className="flex gap-1.5" aria-hidden="true">
                  {CAMADAS.map((c, i) => (
                    <span key={c.rotulo} className="h-1.5 w-5 rounded-full transition-colors duration-300" style={{ background: i === ativa ? DESTAQUE : "rgba(255,255,255,0.2)" }} />
                  ))}
                </span>
              </div>

              <div className="grid flex-1 grid-cols-1 lg:min-h-72">
                {ESTADOS.map((Estado, i) => (
                  <div
                    key={CAMADAS[i].rotulo}
                    className={`col-start-1 row-start-1 min-h-64 p-5 transition-all duration-300 motion-reduce:transition-none ${
                      i === ativa ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"
                    }`}
                    aria-hidden={i !== ativa}
                    inert={i !== ativa}
                  >
                    <Estado ativo={i === ativa} produto={produto} />
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 bg-white/[0.04] px-5 py-4" aria-live="polite">
                <p className="font-mono text-xs font-bold tracking-widest" style={{ color: DESTAQUE }}>
                  {NUM(ativa)} — {atual.rotulo}
                </p>
                <p className="mt-1 text-sm text-white/80">{atual.descricao}</p>
              </div>
            </div>

            {/* Pilares */}
            {CAMADAS.map(({ titulo, texto, Icone, chips }, i) => {
              const lit = i === ativa
              return (
                <article
                  key={titulo}
                  className={`relative z-10 rounded-2xl border p-5 transition-all duration-300 motion-reduce:transition-none ${POSICAO_LG[i]} ${
                    lit ? "bg-[#1b3c5e]" : "bg-brand-navy-light opacity-90"
                  }`}
                  style={{ borderColor: lit ? DESTAQUE : "rgba(255,255,255,0.12)", boxShadow: lit ? `0 0 0 1px ${DESTAQUE}55` : "none" }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                      style={{ background: lit ? VERDE : "rgba(255,255,255,0.08)", color: "#fff" }}
                    >
                      <Icone size={20} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[11px] font-bold tracking-widest" style={{ color: lit ? DESTAQUE : "rgba(255,255,255,0.6)" }}>
                      {NUM(i)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-white">
                    <button
                      type="button"
                      aria-pressed={lit}
                      onClick={() => setAtiva(i)}
                      onMouseEnter={() => setAtiva(i)}
                      className="text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[#34d399]"
                    >
                      {titulo}
                    </button>
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/75">{texto}</p>
                  <p className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
                    {chips.map((c) => (
                      <span key={c} className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white/80">
                        {c}
                      </span>
                    ))}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
