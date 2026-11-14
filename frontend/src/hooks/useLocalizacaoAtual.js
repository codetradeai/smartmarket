import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "./useAuth"
import lojaService from "../services/lojaService"
import { dentroDoRS } from "../utils/dentroDoRS"

const OPCOES_POSICAO = { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }

// Códigos de GeolocationPositionError.
const PERMISSAO_NEGADA = 1

// Estado da SESSÃO (da página, até recarregar), de propósito fora do React: a lista pública de filiais é
// dado público e não precisa ser baixada de novo ao voltar ao CEP nem ao reabrir o catálogo; e, se o endpoint
// falhou, o botão fica oculto até recarregar (nenhuma retentativa, nem automática nem por clique).
// A POSIÇÃO do usuário nunca entra aqui: ela vive só em useState, e nada dela vai para storage, URL, log ou rede.
const sessao = { filiais: null, falhou: false }

/** Zera o que a sessão guardou (lista de filiais e falha). Usado pelos testes. */
export function reiniciarFiliaisDaSessao() {
  sessao.filiais = null
  sessao.falhou = false
}

class ErroDeGeolocalizacao extends Error {
  constructor(codigo) {
    super("Não foi possível obter a localização.")
    this.codigo = codigo
  }
}

const suportaGeolocalizacao = () => typeof navigator !== "undefined" && Boolean(navigator.geolocation)

// Uma leitura da posição (sem watchPosition). Só latitude e longitude saem daqui; a precisão e o resto
// do objeto do navegador são descartados. O erro rejeitado não carrega coordenada.
const lerPosicao = () =>
  new Promise((resolve, reject) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (posicao) => resolve({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude }),
        (erro) => reject(new ErroDeGeolocalizacao(erro?.code)),
        OPCOES_POSICAO,
      )
    } catch {
      reject(new ErroDeGeolocalizacao(undefined))
    }
  })

/**
 * Localização atual do navegador, como alternativa temporária ao CEP (só nesta sessão). O clique em `usar`
 * pede a posição (10 s), confere que ela está no RS e só então busca a lista pública de filiais (15 s, uma
 * vez por sessão). Qualquer falha cai no CEP com uma mensagem curta e sem tentar de novo; se a falha for do
 * endpoint de filiais (429, 5xx, rede ou tempo), o botão some até recarregar. Fora do RS não há posição
 * guardada, então nenhuma distância é calculada.
 *
 * Devolve { suportado, buscando, mensagem, botaoOculto, posicao, filiais, origem, usar, voltarAoCep }.
 * `temCep` só ajusta o texto ("Usando seu CEP." só faz sentido para quem tem CEP).
 */
export function useLocalizacaoAtual({ temCep = true } = {}) {
  const { isAuthenticated, user } = useAuth()
  const chave = isAuthenticated ? (user?.email ?? "") : null
  const [estado, setEstado] = useState({ posicao: null, filiais: [], mensagem: null })
  const [buscando, setBuscando] = useState(false)
  const [falhou, setFalhou] = useState(sessao.falhou)
  const [chaveAntes, setChaveAntes] = useState(chave)
  const emAndamento = useRef(false)
  // Sobe quando o usuário muda ou a tela é desmontada: uma busca em andamento não escreve no estado de outro.
  const versao = useRef(0)

  // Logout ou troca de usuário: a posição não pode sobrar. O reset acontece durante o render.
  if (chave !== chaveAntes) {
    setChaveAntes(chave)
    setEstado({ posicao: null, filiais: [], mensagem: null })
  }

  useEffect(
    () => () => {
      versao.current += 1
    },
    [],
  )

  useEffect(() => {
    versao.current += 1
  }, [chave])

  const complemento = temCep ? " Usando seu CEP." : ""
  const mensagens = {
    negada: `Sem permissão de localização.${complemento}`,
    indisponivel: `Não deu para obter sua localização.${complemento}`,
    foraDoRS: `Você parece estar fora do RS.${complemento}`,
    filiais: `Não foi possível usar sua localização agora.${complemento}`,
  }

  const usar = useCallback(async () => {
    if (emAndamento.current || sessao.falhou) return
    emAndamento.current = true
    const minha = versao.current
    const vale = () => versao.current === minha
    setBuscando(true)
    setEstado((atual) => ({ ...atual, mensagem: null }))
    try {
      const posicao = await lerPosicao()
      if (!dentroDoRS(posicao.latitude, posicao.longitude)) {
        if (vale()) setEstado({ posicao: null, filiais: [], mensagem: mensagens.foraDoRS })
        return
      }
      if (sessao.filiais === null) sessao.filiais = await lojaService.filiaisPublicas()
      if (vale()) setEstado({ posicao, filiais: sessao.filiais, mensagem: null })
    } catch (erro) {
      if (erro instanceof ErroDeGeolocalizacao) {
        const mensagem = erro.codigo === PERMISSAO_NEGADA ? mensagens.negada : mensagens.indisponivel
        if (vale()) setEstado({ posicao: null, filiais: [], mensagem })
      } else {
        // Falha do endpoint de filiais: uma tentativa só, e o botão some até recarregar.
        sessao.falhou = true
        if (vale()) {
          setFalhou(true)
          setEstado({ posicao: null, filiais: [], mensagem: mensagens.filiais })
        }
      }
    } finally {
      emAndamento.current = false
      if (vale()) setBuscando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temCep])

  const voltarAoCep = useCallback(() => {
    setEstado({ posicao: null, filiais: [], mensagem: null })
  }, [])

  return {
    suportado: suportaGeolocalizacao(),
    buscando,
    mensagem: estado.mensagem,
    botaoOculto: falhou || sessao.falhou,
    posicao: estado.posicao,
    filiais: estado.filiais,
    origem: estado.posicao ? "navegador" : "cep",
    usar,
    voltarAoCep,
  }
}
