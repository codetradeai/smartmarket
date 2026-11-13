export const CHAVES = {
  token: "sm_token",
  user: "sm_user",
  owner: "sm_owner",
  favProducts: "sm_fav_products",
  favMarkets: "sm_fav_markets",
  priceAlerts: "sm_price_alerts",
  // Raio (km) escolhido para filtrar as lojas do catálogo. Preferência de tela, NAO pessoal: fica
  // de fora de PRIVADAS_LOCAL de proposito (nao e arquivada por dono nem apagada no logout).
  // O CEP nunca vai para o navegador: ele mora na conta, via API.
  raioLojas: "sm_raio_lojas_km",
  // Marca que os dados antigos (sem namespace) ja foram adotados por alguem.
  migrado: "sm_dados_migrados",
}

// Favoritos, alertas e lista de compras existem SO no navegador (nao ha sincronizacao com o
// backend para os ids "p123" do catalogo nem para alertas). Por isso nunca sao apagados no
// logout nem no 401: sao GUARDADOS sob o namespace do dono ("<chave>:<e-mail>") e voltam
// quando a mesma conta entra de novo. As paginas continuam lendo as chaves "ativas"
// (sm_fav_products etc.), que sempre contem so os dados do usuario logado: o usuario B no
// mesmo navegador nunca ve os dados do usuario A.
const PRIVADAS_LOCAL = [CHAVES.favProducts, CHAVES.favMarkets, CHAVES.priceAlerts]
const PRIVADAS_SESSAO = ["sm_list"]

function armazenamentos() {
  const lista = []
  try {
    lista.push([localStorage, PRIVADAS_LOCAL])
  } catch {
    // sem localStorage
  }
  try {
    lista.push([sessionStorage, PRIVADAS_SESSAO])
  } catch {
    // sem sessionStorage
  }
  return lista
}

export function normalizarDono(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : ""
}

export function chaveDoDono(chave, dono) {
  return `${chave}:${normalizarDono(dono)}`
}

function lerLocal(chave) {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

// Dono dos dados ativos: sm_owner; para sessoes antigas sem sm_owner, o e-mail de sm_user.
function donoAtual() {
  const dono = normalizarDono(lerLocal(CHAVES.owner))
  if (dono) return dono
  try {
    return normalizarDono(JSON.parse(lerLocal(CHAVES.user))?.email)
  } catch {
    return ""
  }
}

function arquivar(dono) {
  armazenamentos().forEach(([storage, chaves]) => {
    chaves.forEach((chave) => {
      try {
        const valor = storage.getItem(chave)
        if (valor === null) return
        storage.setItem(chaveDoDono(chave, dono), valor)
        // So apaga o dado ativo depois de ele estar guardado.
        storage.removeItem(chave)
      } catch {
        // sem espaco/sem storage: o dado ativo fica como esta
      }
    })
  })
}

function removerAtivos() {
  armazenamentos().forEach(([storage, chaves]) => {
    chaves.forEach((chave) => {
      try {
        storage.removeItem(chave)
      } catch {
        // fallback
      }
    })
  })
}

// Devolve ao estado ativo o que o dono guardou. Nao sobrescreve dado ativo ja existente.
function restaurar(dono) {
  armazenamentos().forEach(([storage, chaves]) => {
    chaves.forEach((chave) => {
      try {
        const guardado = storage.getItem(chaveDoDono(chave, dono))
        if (guardado === null || storage.getItem(chave) !== null) return
        storage.setItem(chave, guardado)
        storage.removeItem(chaveDoDono(chave, dono))
      } catch {
        // fallback
      }
    })
  })
}

/**
 * Encerra a sessao local (logout, 401 ou token expirado) SEM destruir dados: guarda os dados
 * ativos no namespace do dono, deixa as chaves ativas vazias e remove o sm_owner. Nao mexe em
 * token nem usuario (quem chama decide). Sem dono identificavel, nao faz nada.
 */
export function guardarDadosPrivados() {
  const dono = donoAtual()
  if (!dono) return
  arquivar(dono)
  try {
    localStorage.removeItem(CHAVES.owner)
  } catch {
    // fallback
  }
}

/**
 * Prepara as chaves ativas para o usuario que acabou de entrar (login/cadastro):
 * - se sobraram dados de OUTRO dono (sessao nao encerrada), guarda-os no namespace dele;
 * - dados antigos sem dono (formato anterior a esta correcao) sao adotados pelo primeiro
 *   usuario que entrar, uma unica vez (sm_dados_migrados); depois disso, dado sem dono
 *   nao e atribuido a ninguem e e descartado;
 * - restaura o que este usuario tinha guardado e registra o dono.
 */
export function ativarDadosDoUsuario(email) {
  const novo = normalizarDono(email)
  if (!novo) return

  const atual = normalizarDono(lerLocal(CHAVES.owner))
  if (atual && atual !== novo) {
    arquivar(atual)
    // Se nao deu para guardar, a privacidade vem primeiro: nao entrega ao novo usuario.
    removerAtivos()
  } else if (!atual) {
    if (lerLocal(CHAVES.migrado) === null) {
      try {
        localStorage.setItem(CHAVES.migrado, "1")
      } catch {
        // fallback
      }
    } else {
      removerAtivos()
    }
  }

  restaurar(novo)
  try {
    localStorage.setItem(CHAVES.owner, String(email).trim())
  } catch {
    // fallback
  }
}
