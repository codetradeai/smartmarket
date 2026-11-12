import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "./useAuth"
import lojaService from "../services/lojaService"
import { mensagemDeErro } from "../utils/mensagemDeErro"

const VAZIO = { localizacao: null, lojas: [], erro: null }

const buscarTudo = () => Promise.allSettled([lojaService.obterLocalizacao(), lojaService.lojasProximas()])

/**
 * Localização (CEP) do usuário logado e as lojas que o atendem. Só chama a API com `ativo` e login;
 * desligado, devolve o estado vazio. Falhas da carga viram `erro` (texto), nunca exceção; as ações
 * (trocarCep, excluir, definirLojaPreferida) relançam o erro para o componente mostrar.
 * Devolve { localizacao, lojas, carregando, erro, recarregar, trocarCep, excluir, definirLojaPreferida }.
 */
export function useLocalizacao({ ativo = true } = {}) {
  const { isAuthenticated } = useAuth()
  const ligado = ativo && isAuthenticated
  const [estado, setEstado] = useState(VAZIO)
  const [carregando, setCarregando] = useState(ligado)
  const [ligadoAntes, setLigadoAntes] = useState(ligado)
  // Sobe quando o hook desmonta ou desliga (logout): resposta de uma sessão anterior é descartada.
  const sessao = useRef(0)

  // Ao ligar ou desligar (login/logout), nada do estado anterior pode sobrar: o reset acontece
  // durante o render, antes de qualquer tela ver os dados do usuário que saiu.
  if (ligado !== ligadoAntes) {
    setLigadoAntes(ligado)
    setEstado(VAZIO)
    setCarregando(ligado)
  }

  const aplicarTudo = useCallback(([localizacao, lojas]) => {
    // Cada chamada falha sozinha: a que falhou fica vazia e a outra é usada.
    const primeiraFalha = [localizacao, lojas].find((r) => r.status === "rejected")
    setEstado({
      localizacao: localizacao.status === "fulfilled" ? localizacao.value : null,
      lojas: lojas.status === "fulfilled" ? lojas.value : [],
      erro: primeiraFalha ? mensagemDeErro(primeiraFalha.reason) : null,
    })
    setCarregando(false)
  }, [])

  useEffect(() => {
    if (!ligado) return undefined
    const minha = sessao.current
    buscarTudo().then((resultado) => {
      if (sessao.current === minha) aplicarTudo(resultado)
    })
    return () => {
      sessao.current += 1
    }
  }, [ligado, aplicarTudo])

  const recarregar = useCallback(async () => {
    const minha = sessao.current
    setCarregando(true)
    const resultado = await buscarTudo()
    if (sessao.current === minha) aplicarTudo(resultado)
  }, [aplicarTudo])

  const recarregarLojas = useCallback(async () => {
    const minha = sessao.current
    const [lojas] = await Promise.allSettled([lojaService.lojasProximas()])
    if (sessao.current !== minha) return
    setEstado((atual) => ({
      ...atual,
      lojas: lojas.status === "fulfilled" ? lojas.value : [],
      erro: lojas.status === "rejected" ? mensagemDeErro(lojas.reason) : null,
    }))
  }, [])

  // Chamada que devolve a localização atualizada: se der certo, guarda a resposta e refaz só as lojas;
  // se falhar, o erro sobe e o estado fica como estava.
  const atualizarLocalizacao = useCallback(
    async (chamada) => {
      const minha = sessao.current
      const resposta = await chamada()
      if (sessao.current !== minha) return resposta
      setEstado((atual) => ({ ...atual, localizacao: resposta }))
      await recarregarLojas()
      return resposta
    },
    [recarregarLojas],
  )

  const trocarCep = useCallback((cep) => atualizarLocalizacao(() => lojaService.trocarCep(cep)), [atualizarLocalizacao])

  const definirLojaPreferida = useCallback(
    (lojaId) => atualizarLocalizacao(() => lojaService.definirLojaPreferida(lojaId)),
    [atualizarLocalizacao],
  )

  const excluir = useCallback(async () => {
    await lojaService.excluirLocalizacao()
    await recarregar()
  }, [recarregar])

  return {
    ...(ligado ? estado : VAZIO),
    carregando: ligado && carregando,
    recarregar,
    trocarCep,
    excluir,
    definirLojaPreferida,
  }
}
