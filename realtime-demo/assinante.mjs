// Cliente da demonstração: busca a consulta selada e assina as mudanças.
// Roda com:  npm run assinante
// (No navegador, omita o webSocketFactory: o WebSocket nativo é usado.)
import WebSocket from "ws"
import { createRealtimeClient } from "@neon/realtime/client"

const API = process.env.API ?? "http://127.0.0.1:8787"
const URL_REALTIME = process.env.NEON_REALTIME_URL
if (!URL_REALTIME) { console.error("Falta NEON_REALTIME_URL."); process.exit(1) }

async function buscarSelada() {
  const resposta = await fetch(`${API}/api/live`, { method: "POST" })
  if (!resposta.ok) throw new Error(`não foi possível buscar a consulta selada (${resposta.status})`)
  return resposta.json()
}

// Um cliente por aplicação: todas as assinaturas dividem a mesma conexão.
const client = createRealtimeClient({
  url: URL_REALTIME,
  logLevel: process.env.LOG_NIVEL ?? "silent", // "debug" mostra o diagnóstico do SDK
  webSocketFactory: (url, protocolos) => new WebSocket(url, protocolos),
})

const assinatura = client.subscribe(await buscarSelada())

assinatura.onStateChange((estado) => {
  console.log(`[estado] ${estado.status}`)
  // A consulta selada expira: peça outra igual para renovar.
  if (estado.status === "stale") buscarSelada().then((nova) => assinatura.renew(nova)).catch((e) => console.error("falha ao renovar:", e.message))
})

assinatura.onChange((foto) => {
  if (foto.data === undefined) return
  console.log(`[linhas] ${foto.data.length} -> ${foto.data.slice(0, 3).map((l) => `#${l.id} "${l.mensagem}"`).join(" | ")}`)
})

const encerrar = () => { assinatura.unsubscribe(); client.close(); process.exit(0) }
process.once("SIGINT", encerrar)
process.once("SIGTERM", encerrar)
