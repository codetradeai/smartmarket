import { useId, useState } from "react";
import { cepValido, mascararCep } from "../../utils/cep";
import { mensagemDeErro } from "../../utils/mensagemDeErro";
import { OPCOES_RAIO, RAIO_PADRAO, normalizarRaio } from "../../utils/raioLojas";

const ROTULOS_RAIO = {
  3: "Até 3 km",
  5: "Até 5 km",
  10: "Até 10 km",
  20: "Até 20 km",
  todos: "Todas as distâncias",
};

const botaoSecundario =
  "px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-brand-green text-brand-navy text-xs font-bold transition-all shadow-2xs cursor-pointer";
const botaoPrimario =
  "px-3 py-1.5 bg-brand-green text-white text-xs font-bold rounded-xl hover:bg-brand-green-hover transition-colors shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";
const botaoPerigo =
  "px-3 py-1.5 bg-brand-error text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";
const botaoTexto =
  "px-3 py-1.5 text-xs text-brand-muted hover:text-brand-navy font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";
const painelAbaixo = "mt-3 pt-3 border-t border-emerald-200/50";

/**
 * Cartão de localização do catálogo: mostra o CEP do usuário, deixa trocá-lo ou removê-lo e escolher
 * o raio das lojas. É só apresentação: quem busca e grava os dados (hook useLocalizacao) é o pai.
 */
export function SeletorCepRaio({
  localizacao = null,
  carregando = false,
  erro = null,
  raioKm = RAIO_PADRAO,
  onMudarRaio,
  onTrocarCep,
  onExcluir,
  className = "",
}) {
  const idCampoCep = useId();
  const idRaio = useId();
  // "ver" (só o cartão), "editando" (formulário de CEP) ou "removendo" (confirmação): um por vez.
  const [modo, setModo] = useState("ver");
  const [cepDigitado, setCepDigitado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [alerta, setAlerta] = useState(null);

  const cep = typeof localizacao?.cep === "string" ? localizacao.cep.trim() : "";
  const temCep = cep !== "";
  const resolvida = temCep && localizacao.resolvida === true;
  const lugar = [localizacao?.cidade, localizacao?.uf].filter(Boolean).join("/") || "você";

  function irPara(novoModo) {
    setModo(novoModo);
    setCepDigitado("");
    setAlerta(null);
  }

  function digitarCep(evento) {
    setCepDigitado(mascararCep(evento.target.value));
    setAlerta(null);
  }

  // Roda a ação do pai: sucesso volta ao cartão; falha mantém o painel aberto com a mensagem.
  async function executar(acao, mensagemPadrao) {
    setEnviando(true);
    setAlerta(null);
    try {
      await acao();
      irPara("ver");
    } catch (falha) {
      setAlerta(mensagemDeErro(falha, mensagemPadrao));
    } finally {
      setEnviando(false);
    }
  }

  function salvarCep(evento) {
    evento.preventDefault();
    if (!cepValido(cepDigitado)) {
      setAlerta("Digite um CEP com 8 dígitos.");
      return;
    }
    return executar(() => onTrocarCep?.(mascararCep(cepDigitado)), "Não foi possível alterar o CEP.");
  }

  function removerLocalizacao() {
    return executar(() => onExcluir?.(), "Não foi possível remover a localização.");
  }

  const mostrarAcoes = !carregando && modo === "ver";
  const mostrarRaio = !carregando && resolvida;

  return (
    <div className={`bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3 sm:p-4 text-brand-navy ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            aria-hidden="true"
            className="w-9 h-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0 font-bold text-base shadow-xs"
          >
            📍
          </div>
          <div className="min-w-0">
            {carregando && (
              <p role="status" className="text-xs font-black text-brand-navy tracking-tight">
                Carregando sua localização…
              </p>
            )}
            {!carregando && !temCep && erro && (
              <p role="status" className="text-xs font-black text-brand-navy tracking-tight">
                Não foi possível carregar sua localização agora. O catálogo continua funcionando.
              </p>
            )}
            {!carregando && !temCep && !erro && (
              <p className="text-xs font-black text-brand-navy tracking-tight">
                Informe seu CEP para ver a loja mais próxima de cada rede.
              </p>
            )}
            {!carregando && temCep && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  {resolvida && (
                    <span className="text-xs font-black text-brand-navy tracking-tight">{`Lojas perto de ${lugar}`}</span>
                  )}
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-600">
                    {`CEP: ${mascararCep(cep)}`}
                  </span>
                </div>
                {!resolvida && (
                  <p className="text-[11px] text-brand-muted mt-0.5">
                    Não conseguimos localizar esse CEP; mostrando as lojas padrão.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {(mostrarAcoes || mostrarRaio) && (
          <div className="flex flex-wrap items-center gap-2">
            {mostrarAcoes && (
              <>
                <button type="button" onClick={() => irPara("editando")} className={botaoSecundario}>
                  {temCep ? "Alterar CEP" : "Informar CEP"}
                </button>
                {temCep && (
                  <button type="button" onClick={() => irPara("removendo")} className={botaoSecundario}>
                    Remover minha localização
                  </button>
                )}
              </>
            )}
            {mostrarRaio && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <label htmlFor={idRaio} className="text-[11px] text-brand-muted font-bold whitespace-nowrap">
                  Raio
                </label>
                <select
                  id={idRaio}
                  value={normalizarRaio(raioKm)}
                  onChange={(evento) => onMudarRaio?.(normalizarRaio(evento.target.value))}
                  className="bg-transparent text-xs font-extrabold text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green rounded cursor-pointer"
                >
                  {OPCOES_RAIO.map((valor) => (
                    <option key={valor} value={valor}>
                      {ROTULOS_RAIO[valor]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {mostrarRaio && (
        <p className="text-[11px] text-brand-muted mt-2">Lojas sem distância calculada continuam aparecendo.</p>
      )}

      {!carregando && modo === "editando" && (
        <form onSubmit={salvarCep} noValidate className={`flex flex-wrap items-end gap-2 ${painelAbaixo}`}>
          <div className="flex flex-col gap-1">
            <label htmlFor={idCampoCep} className="text-[11px] font-bold text-brand-muted">
              CEP
            </label>
            <input
              id={idCampoCep}
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={9}
              placeholder="00000-000"
              value={cepDigitado}
              onChange={digitarCep}
              aria-invalid={alerta ? "true" : undefined}
              className="w-32 px-2.5 py-1.5 bg-white border border-brand-green rounded-xl text-xs font-mono font-bold text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green shadow-2xs"
            />
          </div>
          <button type="submit" disabled={enviando} className={botaoPrimario}>
            {enviando ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" onClick={() => irPara("ver")} disabled={enviando} className={botaoTexto}>
            Cancelar
          </button>
          {alerta && <Alerta>{alerta}</Alerta>}
        </form>
      )}

      {!carregando && modo === "removendo" && (
        <div role="group" aria-label="Remover localização" className={`flex flex-col gap-2 ${painelAbaixo}`}>
          <p className="text-xs text-brand-navy">
            Usamos seu CEP só para indicar a loja mais próxima de cada rede. Ao remover, apagamos o CEP, a cidade e as
            coordenadas da sua conta.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={removerLocalizacao} disabled={enviando} className={botaoPerigo}>
              {enviando ? "Removendo…" : "Remover"}
            </button>
            <button type="button" onClick={() => irPara("ver")} disabled={enviando} className={botaoTexto}>
              Cancelar
            </button>
          </div>
          {alerta && <Alerta>{alerta}</Alerta>}
        </div>
      )}

      <p className="text-[11px] text-brand-muted mt-2.5 pt-2.5 border-t border-emerald-200/50">
        O preço é o mesmo em toda a rede. A loja mais próxima aparece só como referência.
      </p>
    </div>
  );
}

// Mensagem de erro de uma ação, em caixa branca para manter o contraste do texto vermelho.
function Alerta({ children }) {
  return (
    <p
      role="alert"
      className="w-full rounded-lg bg-white border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-brand-error"
    >
      {children}
    </p>
  );
}

export default SeletorCepRaio;
