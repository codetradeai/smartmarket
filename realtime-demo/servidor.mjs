// Backend da demonstração: sela a live query e grava mensagens.
// Roda com:  npm run servidor   (lê ../.env.local)
import http from "node:http"
import { createRealtime, rawSql } from "@neon/realtime/server"
import { neon } from "@neondatabase/serverless"

const PORTA = Number(process.env.PORTA ?? 8787)
const { DATABASE_URL, NEON_REALTIME_SECRET } = process.env
if (!DATABASE_URL || !NEON_REALTIME_SECRET) {
  console.error("Faltam DATABASE_URL e NEON_REALTIME_SECRET (rode `neon env pull --service postgres --service realtime`).")
  process.exit(1)
}

// "db" é o nome do banco que está na connection string.
const realtime = createRealtime({ secret: NEON_REALTIME_SECRET, db: new URL(DATABASE_URL).pathname.slice(1) })
const sql = neon(DATABASE_URL)

// Consulta de leitura, determinística, sem ponto e vírgula. Seleciona a chave primária (id).
// Atenção: não use now() aqui; valores variáveis entram como parâmetro ($1).
const ultimasMensagens = () =>
  rawSql(`SELECT id, mensagem, criado_em FROM realtime_demo ORDER BY id DESC LIMIT 20`)

function lerJson(req) {
  return new Promise((resolve, reject) => {
    let corpo = ""
    req.on("data", (pedaco) => { corpo += pedaco; if (corpo.length > 10_000) req.destroy() })
    req.on("end", () => { try { resolve(corpo ? JSON.parse(corpo) : {}) } catch (e) { reject(e) } })
    req.on("error", reject)
  })
}

function responder(res, status, objeto) {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(JSON.stringify(objeto))
}

const servidor = http.createServer(async (req, res) => {
  try {
    // O cliente nunca vê nem altera o SQL: recebe só a consulta selada (um "token ao portador").
    if (req.method === "POST" && req.url === "/api/live") {
      // Numa aplicação real, autentique o usuário ANTES de selar e ponha a autorização na própria consulta.
      return responder(res, 200, await realtime.seal({ query: ultimasMensagens() }))
    }
    if (req.method === "POST" && req.url === "/api/mensagens") {
      const { mensagem } = await lerJson(req)
      if (typeof mensagem !== "string" || mensagem.trim() === "" || mensagem.length > 280) {
        return responder(res, 400, { erro: "mensagem deve ser um texto de 1 a 280 caracteres" })
      }
      // O txid vem do próprio INSERT (RETURNING), numa única ida ao banco.
      const [linha] = await sql.query(
        "INSERT INTO realtime_demo (mensagem) VALUES ($1) RETURNING id::text AS id, pg_current_xact_id()::text AS txid",
        [mensagem.trim()],
      )
      return responder(res, 201, { kind: "committed", id: linha.id, txid: linha.txid })
    }
    responder(res, 404, { erro: "não encontrado" })
  } catch (erro) {
    console.error("erro:", erro?.message ?? erro)
    responder(res, 500, { erro: "erro interno" })
  }
})

servidor.listen(PORTA, "127.0.0.1", () => console.log(`servidor pronto em http://127.0.0.1:${PORTA}`))
process.once("SIGTERM", () => servidor.close())
