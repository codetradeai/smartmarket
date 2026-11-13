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
  const { isAuthenticated, user } = useAuth()
  const ligado = ativo && isAuthenticated
  // Dono dos dados: null desligado; o e-mail do usuário ligado. Mudou a chave, mudou o dono.
  const chave = ligado ? (user?.email ?? "") : null
  const [estado, setEstado] = useState(VAZIO)
  const [carregando, setCarregando] = useState(ligado)
  const [chaveAntes, setChaveAntes] = useState(chave)
  // A mais nova vence: quem vai escrever no estado pega uma versão nova e só aplica o resultado
  // se ainda for a atual quando a resposta chegar.
  const versao = useRef(0)
  // Sobe quando o efeito é desfeito (logout, troca de usuário, desmonte). Uma ação (trocarCep...)
  // iniciada numa sessão anterior não escreve na seguinte, mesmo pegando versão nova ao terminar.
  const sessao = useRef(0)

  // Ao ligar, desligar ou trocar de usuário, nada do estado anterior pode sobrar: o reset acontece
  // durante o render, antes de qualquer tela ver os dados de quem saiu.
  if (chave !== chaveAntes) {
    setChaveAntes(chave)
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
    if (chave === null) return undefined
    const minha = ++versao.current
    buscarTudo().then((resultado) => {
      if (versao.current === minha) aplicarTudo(resultado)
    })
    return () => {
      versao.current += 1
      sessao.current += 1
    }
  }, [chave, aplicarTudo])

  const recarregar = useCallback(async () => {
    const minha = ++versao.current
    setCarregando(true)
    const resultado = await buscarTudo()
    if (versao.current === minha) aplicarTudo(resultado)
  }, [aplicarTudo])

  // Refaz só as lojas, com a versão da ação que a chamou.
  const recarregarLojas = useCallback(async (minha) => {
    const [lojas] = await Promise.allSettled([lojaService.lojasProximas()])
    if (versao.current !== minha) return
    setEstado((atual) => ({
      ...atual,
      lojas: lojas.status === "fulfilled" ? lojas.value : [],
      erro: lojas.status === "rejected" ? mensagemDeErro(lojas.reason) : null,
    }))
    setCarregando(false)
  }, [])

  // Chamada que devolve a localização atualizada. Se falhar, o erro sobe e nada muda (nem invalida
  // uma carga em andamento). Se der certo, pega uma versão nova (descartando cargas mais antigas),
  // guarda a resposta e refaz só as lojas.
  const atualizarLocalizacao = useCallback(
    async (chamada) => {
      const sessaoAntes = sessao.current
      const resposta = await chamada()
      if (sessao.current !== sessaoAntes) return resposta
      const minha = ++versao.current
      setEstado((atual) => ({ ...atual, localizacao: resposta }))
      setCarregando(false)
      await recarregarLojas(minha)
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
