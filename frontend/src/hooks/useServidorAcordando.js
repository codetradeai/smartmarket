import { useSyncExternalStore } from "react"
import { assinarServidorAcordando, servidorAcordando } from "../utils/servidorAcordando"

/** `true` enquanto alguma chamada à API espera resposta há mais de 8 s (provável cold start do servidor). */
export function useServidorAcordando() {
  // Sem servidor (SSR) o aviso fica desligado.
  return useSyncExternalStore(assinarServidorAcordando, servidorAcordando, () => false)
}
