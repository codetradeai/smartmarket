import { createContext } from "react"

/**
 * De onde a distância mostrada nos cartões foi medida: "cep" (a base, padrão) ou "navegador" (a posição
 * atual do usuário, só em memória). Só muda a dica e o texto falado; o catálogo o coloca no contexto para
 * os chips de loja não precisarem receber a prop por todos os componentes do caminho.
 */
export const OrigemDistanciaContext = createContext("cep")
