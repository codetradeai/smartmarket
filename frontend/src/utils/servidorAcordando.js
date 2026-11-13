// Detecta "servidor acordando": o backend no plano Free do Render hiberna e, na primeira chamada
// depois disso, leva de 1 a ~3 min para responder. Uma chamada que passa de ATRASO_AVISO_MS sem
// resposta é tratada como provável cold start e liga o aviso; ele some quando essa chamada termina
// (resposta, erro ou cancelamento). Estado de módulo, lido pelo hook useServidorAcordando.
//
// Limite conhecido: não distingue cold start de um endpoint que está só lento (acima de 8 s). Nos
// dois casos o usuário está esperando, e o texto do aviso fala em "pode levar alguns minutos".

/** Tempo sem resposta a partir do qual a chamada conta como "servidor acordando". */
export const ATRASO_AVISO_MS = 8000

let lentasEmAndamento = 0
const ouvintes = new Set()

function notificar() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

/**
 * Marca o início de uma chamada à API. Devolve a função que a encerra (chamar uma vez, em qualquer
 * desfecho; repetir é inofensivo). Se a chamada passar de ATRASO_AVISO_MS aberta, o aviso liga.
 */
export function iniciarChamada() {
  let lenta = false
  let encerrada = false
  const temporizador = setTimeout(() => {
    if (encerrada) return
    lenta = true
    lentasEmAndamento += 1
    if (lentasEmAndamento === 1) notificar()
  }, ATRASO_AVISO_MS)

  return function encerrar() {
    if (encerrada) return
    encerrada = true
    clearTimeout(temporizador)
    if (lenta) {
      lentasEmAndamento -= 1
      if (lentasEmAndamento === 0) notificar()
    }
  }
}

/** Há alguma chamada à API esperando resposta há mais de ATRASO_AVISO_MS? */
export function servidorAcordando() {
  return lentasEmAndamento > 0
}

/** Registra um ouvinte das mudanças do aviso (liga/desliga). Devolve a função que o remove. */
export function assinarServidorAcordando(ouvinte) {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}
