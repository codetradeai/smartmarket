export const CHAVES = {
  token: "sm_token",
  user: "sm_user",
  owner: "sm_owner",
  favProducts: "sm_fav_products",
  favMarkets: "sm_fav_markets",
  priceAlerts: "sm_price_alerts",
}

const CHAVES_PRIVADAS_LOCAL = [CHAVES.favProducts, CHAVES.favMarkets, CHAVES.priceAlerts]
const CHAVE_SESSAO_PRIVADA = "sm_list"

export function limparDadosPrivados() {
  CHAVES_PRIVADAS_LOCAL.forEach((k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      // fallback
    }
  })
  try {
    sessionStorage.removeItem(CHAVE_SESSAO_PRIVADA)
  } catch {
    // fallback
  }
}
