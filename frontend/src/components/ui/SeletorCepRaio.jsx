import { useState, useEffect } from "react";
import { resolverCoordenadasCep, resolverCoordenadasCepSync } from "../../utils/proximidadeFiliais";

const CIDADES_RAPIDAS = [
  { nome: "Cachoeirinha", cep: "94910-000" },
  { nome: "Porto Alegre", cep: "90010-000" },
  { nome: "Canoas", cep: "92010-011" },
  { nome: "Gravataí", cep: "94010-001" },
];

const OPCOES_RAIO = [
  { label: "Até 3 km", valor: 3 },
  { label: "Até 5 km", valor: 5 },
  { label: "Até 10 km", valor: 10 },
  { label: "Até 20 km", valor: 20 },
  { label: "Todas as distâncias", valor: "todos" },
];

export function SeletorCepRaio({ onFiltroChange, className = "" }) {
  const [cep, setCep] = useState(() => {
    try {
      return localStorage.getItem("sm_user_cep") || "94910-000";
    } catch {
      return "94910-000";
    }
  });

  const [raioKm, setRaioKm] = useState(() => {
    try {
      const salvo = localStorage.getItem("sm_user_raio_km");
      return salvo ? (salvo === "todos" ? "todos" : Number(salvo)) : 15;
    } catch {
      return 15;
    }
  });

  const [geoInfo, setGeoInfo] = useState(() => resolverCoordenadasCepSync(cep));
  const [isEditando, setIsEditando] = useState(false);
  const [inputValor, setInputValor] = useState(cep);
  const [carregando, setCarregando] = useState(false);

  // Notifica pai na montagem e em alterações
  useEffect(() => {
    async function atualizarGeo() {
      setCarregando(true);
      try {
        const info = await resolverCoordenadasCep(cep);
        setGeoInfo(info);
        if (onFiltroChange) {
          onFiltroChange({
            cep,
            raioKm,
            cidade: info.cidade,
            lat: info.lat,
            lon: info.lon,
          });
        }
      } catch {
        const syncFallback = resolverCoordenadasCepSync(cep);
        setGeoInfo(syncFallback);
        if (onFiltroChange) {
          onFiltroChange({
            cep,
            raioKm,
            cidade: syncFallback.cidade,
            lat: syncFallback.lat,
            lon: syncFallback.lon,
          });
        }
      } finally {
        setCarregando(false);
      }
    }
    atualizarGeo();
  }, [cep, raioKm, onFiltroChange]);

  function aplicarCep(novoCep) {
    const limpo = String(novoCep).replace(/\D/g, "");
    if (limpo.length === 8) {
      const formatado = `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
      setCep(formatado);
      setInputValor(formatado);
      try {
        localStorage.setItem("sm_user_cep", formatado);
      } catch {
        // fallback
      }
      setIsEditando(false);
    }
  }

  function handleSalvarManual(e) {
    e.preventDefault();
    aplicarCep(inputValor);
  }

  function handleMudarRaio(e) {
    const val = e.target.value === "todos" ? "todos" : Number(e.target.value);
    setRaioKm(val);
    try {
      localStorage.setItem("sm_user_raio_km", String(val));
    } catch {
      // fallback
    }
  }

  return (
    <div className={`bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3 sm:p-4 text-brand-navy ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Bloco 1: Localização Atual */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0 font-bold text-base shadow-xs">
            📍
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-brand-navy tracking-tight">
                Filiais próximas a {geoInfo.cidade || "Cachoeirinha"}
              </span>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-600">
                CEP: {cep}
              </span>
              {carregando && (
                <span className="text-[10px] text-brand-muted animate-pulse font-bold">
                  localizando...
                </span>
              )}
            </div>
            <p className="text-[11px] text-brand-muted truncate mt-0.5">
              Preços e unidades ordenados pela sua distância física real
            </p>
          </div>
        </div>

        {/* Bloco 2: Controles de CEP e Raio */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Alterar CEP */}
          {isEditando ? (
            <form onSubmit={handleSalvarManual} className="flex items-center gap-1.5">
              <input
                type="text"
                value={inputValor}
                onChange={(e) => setInputValor(e.target.value)}
                placeholder="Ex: 94910-000"
                maxLength={9}
                className="w-28 px-2.5 py-1.5 bg-white border border-brand-green rounded-xl text-xs font-mono font-bold text-brand-navy focus:outline-none shadow-2xs"
                autoFocus
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-brand-green text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setIsEditando(false)}
                className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditando(true)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-brand-green text-brand-navy text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <span>Alterar CEP</span>
            </button>
          )}

          {/* Seletor de Raio Máximo */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] text-brand-muted font-bold whitespace-nowrap">
              Raio:
            </span>
            <select
              value={raioKm}
              onChange={handleMudarRaio}
              className="bg-transparent text-xs font-extrabold text-brand-green focus:outline-none cursor-pointer"
            >
              {OPCOES_RAIO.map((op) => (
                <option key={op.valor} value={op.valor}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Atalhos Rápidos de Cidades Metropolitanas */}
      <div className="flex items-center gap-1.5 pt-2.5 mt-2.5 border-t border-emerald-200/50 flex-wrap">
        <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider mr-1">
          Atalhos rápidos:
        </span>
        {CIDADES_RAPIDAS.map((c) => (
          <button
            key={c.nome}
            type="button"
            onClick={() => aplicarCep(c.cep)}
            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
              cep === c.cep
                ? "bg-brand-green text-white border-brand-green shadow-xs"
                : "bg-white/90 text-slate-600 border-emerald-200/70 hover:border-brand-green hover:text-brand-green"
            }`}
          >
            {c.nome}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SeletorCepRaio;

