import { useEffect, useState } from "react"
import { carregarProdutos } from "../utils/carregarProdutos"

/**
 * Carrega PRODUCTS sob demanda. Com `ativo = false` não baixa nada (a Home só pede o catálogo
 * quando o visitante escolhe um setor, busca ou abre um produto).
 * Devolve { produtos, carregando, erro, recarregar }.
 */
export function useProdutos(ativo = true) {
  const [resultado, setResultado] = useState({ produtos: null, erro: null })
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    if (!ativo) return undefined
    let vivo = true
    carregarProdutos()
      .then((produtos) => vivo && setResultado({ produtos, erro: null }))
      .catch((erro) => vivo && setResultado({ produtos: null, erro }))
    return () => {
      vivo = false
    }
  }, [ativo, tentativa])

  const { produtos, erro } = resultado
  return {
    produtos,
    erro,
    carregando: ativo && !produtos && !erro,
    recarregar: () => {
      setResultado({ produtos: null, erro: null })
      setTentativa((n) => n + 1)
    },
  }
}
