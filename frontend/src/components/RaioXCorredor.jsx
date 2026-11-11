import { Link } from "react-router-dom"
import { ProductImage } from "./ui"
import { CatalogoCarregando, CatalogoErro } from "./ComCatalogo"
import { posicaoNaTrilha } from "../utils/dispersaoPrecos"

const brl = (valor) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const numero = (n) => n.toLocaleString("pt-BR")
const LIMITE = 3

/**
 * Painel do "Raio-X de Preços": para o setor ativo, mostra produtos reais com o menor e o maior preço
 * encontrados entre as redes para o MESMO produto, numa trilha proporcional aos valores.
 * Nada aqui é valor de exemplo: tudo vem de `dispersao` (ver utils/dispersaoPrecos.js).
 * Só o nome da rede mais barata depende de conta.
 */
export function RaioXCorredor({
  setor,
  dispersao,
  carregando,
  erro,
  onTentarNovamente,
  nomeDaRede,
  autenticado,
  caminhoCadastro,
  caminhoCatalogo,
  totalAnuncios,
}) {
  const { itens, total, maxPercentual, mediaPercentual } = dispersao

  return (
    <section
      aria-label={`Raio-X de preços: ${setor.label}`}
      className="overflow-hidden rounded-3xl border border-brand-border/80 bg-white shadow-2xs"
    >
      <header className="flex flex-col gap-3 border-b border-brand-border/70 px-4 py-4 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <h3 className="text-lg font-extrabold tracking-tight text-brand-navy sm:text-xl">{setor.label}</h3>
          {total > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-light px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-green-dark">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#0e7a46]" />
              Comparação disponível · {numero(total)} {total === 1 ? "produto comparado" : "produtos comparados"}
            </span>
          )}
        </div>
        {total > 0 && (
          <div className="md:max-w-sm md:text-right">
            <p className="text-sm font-bold text-brand-navy">
              Até <span className="text-lg font-black text-[#b42318]">{maxPercentual}%</span> de variação entre redes
              para o mesmo produto
            </p>
            <p className="text-xs text-brand-muted">Variação média do setor: {mediaPercentual}%</p>
          </div>
        )}
      </header>

      <div className="px-4 py-5 sm:px-6">
        {erro ? (
          <CatalogoErro onTentarNovamente={onTentarNovamente} />
        ) : carregando ? (
          <CatalogoCarregando className="py-12" />
        ) : itens.length === 0 ? (
          <p className="mx-auto max-w-md py-10 text-center text-sm leading-relaxed text-brand-muted">
            Ainda não há comparação confirmada do mesmo produto em mais de uma rede neste setor. Escolha outro setor
            ou crie sua conta para explorar o catálogo.
          </p>
        ) : (
          <div key={setor.id} className="sm-raiox-painel space-y-2">
            <ul className="divide-y divide-brand-border/60">
              {itens.map((item, i) => (
                <LinhaDeTensao
                  key={item.grupoId}
                  item={item}
                  indice={i}
                  setor={setor}
                  nomeDaRede={nomeDaRede}
                  autenticado={autenticado}
                  caminhoCadastro={caminhoCadastro}
                />
              ))}
            </ul>
            {itens.length < LIMITE && (
              <p className="text-xs text-brand-muted">
                Mostrando {itens.length} de {LIMITE}: este setor só tem {itens.length === 1 ? "1 produto" : `${itens.length} produtos`} com
                comparação confirmada.
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-brand-muted">
              A diferença é entre o menor e o maior preço encontrados para o mesmo produto nas redes do catálogo
              (percentual sobre o maior preço), na última coleta. Não é uma economia garantida na compra completa.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 bg-[#0b192c] px-4 py-6 text-white sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-1">
          <p className="text-base font-extrabold sm:text-lg">
            {autenticado ? "Compare tudo no catálogo." : "Descubra onde comprar mais barato."}
          </p>
          <p className="text-xs leading-relaxed text-white/80 sm:text-sm">
            {autenticado
              ? `Abra o catálogo completo e compare os ${numero(totalAnuncios)} anúncios do catálogo.`
              : `Crie sua conta gratuita e desbloqueie o catálogo completo: o acesso revela o nome de todos os mercados e libera os ${numero(totalAnuncios)} anúncios do catálogo.`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
          <Link
            to={autenticado ? caminhoCatalogo : caminhoCadastro("catalogo")}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#0e7a46] px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-[#0b6338] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {autenticado ? "Abrir Catálogo Completo" : "Criar conta grátis e liberar tudo"}
            <span aria-hidden="true">→</span>
          </Link>
          {!autenticado && (
            <Link
              to="/auth?mode=login"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-white/30 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Já tenho conta
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

function LinhaDeTensao({ item, indice, setor, nomeDaRede, autenticado, caminhoCadastro }) {
  const { produto, imagem, unidade, menor, maior, economia, percentual, redes } = item
  const intermediarios = redes.slice(1, -1)
  const detalhe = [produto.brand, unidade].filter(Boolean).join(" · ")

  return (
    <li
      style={{ "--i": indice }}
      className="sm-raiox-linha grid items-center gap-4 py-4 first:pt-1 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]"
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ProductImage
            src={imagem.imageLocal || imagem.imageUrl}
            alt=""
            fallbackIcon={setor.icon}
            className="h-full w-full"
          />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-brand-navy">{produto.name}</p>
          {detalhe && <p className="mt-0.5 truncate text-xs text-brand-muted">{detalhe}</p>}
        </div>
      </div>

      <div>
        <p className="mb-1 text-center">
          <span className="inline-block rounded-full bg-brand-navy px-3 py-1 text-[11px] font-extrabold text-white sm:text-xs">
            Economize {brl(economia)} · {percentual}% de diferença
          </span>
        </p>
        <div
          role="img"
          aria-label={`Menor preço ${brl(menor.preco)}, maior preço ${brl(maior.preco)}: diferença de ${brl(economia)}, ${percentual}% sobre o maior preço`}
          className="relative h-6"
        >
          <span
            aria-hidden="true"
            className="sm-raiox-trilha absolute inset-x-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#0e7a46] to-[#e5534b]"
          />
          {intermediarios.map((r) => (
            <span
              key={r.rede}
              aria-hidden="true"
              title={brl(r.preco)}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-500"
              style={{ left: `calc(0.5rem + (100% - 1rem) * ${posicaoNaTrilha(r.preco, menor.preco, maior.preco)})` }}
            />
          ))}
          <span
            aria-hidden="true"
            style={{ "--i": indice }}
            className="sm-raiox-ponto absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-[#0e7a46] shadow"
          />
          <span
            aria-hidden="true"
            className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-[#e5534b] shadow"
          />
        </div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Menor preço</p>
            <p className="text-lg font-black leading-tight text-brand-green-dark">{brl(menor.preco)}</p>
            <p className="text-[11px] font-bold text-brand-muted">
              {autenticado ? nomeDaRede(menor.rede) : "Rede Mais Barata 🔒"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Maior preço</p>
            <p className="text-lg font-black leading-tight text-[#b42318]">{brl(maior.preco)}</p>
            <p className="text-[11px] font-bold text-brand-muted">em outra rede</p>
          </div>
        </div>
      </div>

      {!autenticado && (
        <Link
          to={caminhoCadastro("busca", produto.name)}
          className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-[#0e7a46] px-3 py-2 text-xs font-extrabold text-brand-green-dark transition-colors hover:bg-brand-green-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e7a46]"
        >
          Revelar rede <span aria-hidden="true">→</span>
        </Link>
      )}
    </li>
  )
}
