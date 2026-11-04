import cestaDemo from "../data/cesta-demo.json"

/** Produtos da "Cesta de demonstração" (scraper/gerar_cesta_demo.py), por id do catálogo. */
const PRODUTOS_DA_CESTA = new Map((cestaDemo?.produtos || []).map((p) => [String(p.id), p]))

export function produtoDaCesta(produtoId, cesta = PRODUTOS_DA_CESTA) {
  return cesta.get(String(produtoId)) || null
}

// "2026-11-03T22:37:24-03:00" -> "03/11/2026 22:37". Lê o texto direto, sem conversão de fuso,
// para mostrar exatamente o horário de Brasília gravado pelo gerador.
export function formatarDataColeta(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || "")
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : null
}
