// Insere uma mensagem pela API e imprime o id e o txid devolvidos.
// Roda com:  npm run inserir -- "texto da mensagem"
const API = process.env.API ?? "http://127.0.0.1:8787"
const mensagem = process.argv.slice(2).join(" ") || "olá, Realtime"
const resposta = await fetch(`${API}/api/mensagens`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mensagem }),
})
console.log(resposta.status, JSON.stringify(await resposta.json()))
