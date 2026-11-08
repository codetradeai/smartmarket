// Envia ao Object Storage da Neon (S3): as fotos dos produtos e o catálogo em JSON.
//   npm run simular    mostra o que seria enviado, sem enviar
//   npm run enviar     envia o que ainda não está no bucket (fotos) e sempre o catálogo
// Flags: --so-imagens | --so-catalogo | --cors | --simular
// Credenciais: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION, lidas do
// .env.local (escrito por `neon deploy` / `neon env pull`). Nunca são impressas.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { S3Client, PutObjectCommand, ListObjectsV2Command, PutBucketCorsCommand } from "@aws-sdk/client-s3"
import { NodeHttpHandler } from "@smithy/node-http-handler"
import { HttpsProxyAgent } from "https-proxy-agent"

const args = new Set(process.argv.slice(2))
const simular = args.has("--simular")
const soImagens = args.has("--so-imagens")
const soCatalogo = args.has("--so-catalogo")
const BUCKET = process.env.BUCKET ?? "smartmarket-assets"

const aqui = path.dirname(fileURLToPath(import.meta.url))
const pastaFotos = path.resolve(aqui, "../../frontend/public/images/produtos")
const pastaSaida = path.resolve(aqui, "saida")

// As credenciais vêm SÓ do arquivo .env.local (escrito por `neon deploy` / `neon env pull`), e não do
// ambiente do shell. Assim, uma chave AWS de verdade que esteja no seu ambiente nunca é enviada à Neon.
function lerEnv(arquivo) {
  if (!existsSync(arquivo)) return {}
  return Object.fromEntries(
    readFileSync(arquivo, "utf8").split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] }),
  )
}
const cfg = lerEnv(process.env.ENV_FILE ?? path.resolve(aqui, "../../.env.local"))
for (const v of ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_ENDPOINT_URL_S3", "AWS_REGION"]) {
  if (!cfg[v]) { console.error(`Falta ${v} no .env.local. Rode \`neon env pull\` na raiz do repositório.`); process.exit(1) }
}

// Atrás de proxy corporativo, use HTTPS_PROXY. A Neon exige endereço no estilo "path" (forcePathStyle).
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy
const s3 = new S3Client({
  forcePathStyle: true,
  endpoint: cfg.AWS_ENDPOINT_URL_S3,
  region: cfg.AWS_REGION,
  credentials: { accessKeyId: cfg.AWS_ACCESS_KEY_ID, secretAccessKey: cfg.AWS_SECRET_ACCESS_KEY },
  ...(proxy ? { requestHandler: new NodeHttpHandler({ httpsAgent: new HttpsProxyAgent(proxy) }) } : {}),
})

const TIPOS = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".avif": "image/avif" }

function listarArquivos(pasta, base = pasta) {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const abs = path.join(pasta, e.name)
    return e.isDirectory() ? listarArquivos(abs, base) : [{ abs, rel: path.relative(base, abs).split(path.sep).join("/") }]
  })
}

async function chavesExistentes(prefixo) {
  const mapa = new Map()
  let token
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefixo, ContinuationToken: token }))
    for (const o of r.Contents ?? []) mapa.set(o.Key, o.Size)
    token = r.IsTruncated ? r.NextContinuationToken : undefined
  } while (token)
  return mapa
}

async function enviarEmLotes(itens, paralelo, fn) {
  let i = 0, feitos = 0, falhas = []
  async function trabalhador() {
    while (i < itens.length) {
      const item = itens[i++]
      try { await fn(item) } catch (e) { falhas.push(`${item.key}: ${e.name}`) }
      feitos++
      if (feitos % 100 === 0) console.log(`  ${feitos}/${itens.length}`)
    }
  }
  await Promise.all(Array.from({ length: paralelo }, trabalhador))
  return falhas
}

if (args.has("--cors")) {
  // Leitura pública de dados públicos: qualquer origem pode fazer GET/HEAD. Escrita continua exigindo credencial.
  if (simular) console.log("[simular] aplicaria CORS GET/HEAD para qualquer origem")
  else {
    await s3.send(new PutBucketCorsCommand({ Bucket: BUCKET, CORSConfiguration: { CORSRules: [{ AllowedMethods: ["GET", "HEAD"], AllowedOrigins: ["*"], AllowedHeaders: ["*"], MaxAgeSeconds: 3600 }] } }))
    console.log("CORS aplicado (GET/HEAD, qualquer origem).")
  }
}

let falhou = false

if (!soCatalogo) {
  const fotos = listarArquivos(pastaFotos).map((f) => ({ ...f, key: `images/produtos/${f.rel}`, tamanho: statSync(f.abs).size }))
  const existentes = await chavesExistentes("images/produtos/")
  const pendentes = fotos.filter((f) => existentes.get(f.key) !== f.tamanho)
  const mb = (pendentes.reduce((s, f) => s + f.tamanho, 0) / 1048576).toFixed(1)
  console.log(`Fotos: ${fotos.length} locais, ${existentes.size} já no bucket, ${pendentes.length} a enviar (${mb} MB).`)
  if (!simular && pendentes.length) {
    const falhas = await enviarEmLotes(pendentes, 8, (f) => s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: f.key, Body: readFileSync(f.abs),
      ContentType: TIPOS[path.extname(f.abs).toLowerCase()] ?? "application/octet-stream",
      // Só nomes com hash de conteúdo (ex.: 1000269_2ed176c231ac.jpg) ficam em cache "para sempre".
      // Galeria e frames 360 (foto_0_frente.webp, frame_00.webp) não têm hash: cache de 1 dia.
      CacheControl: /_[0-9a-f]{12}\.[a-z0-9]+$/i.test(f.rel)
        ? "public, max-age=31536000, immutable"
        : "public, max-age=86400",
    })))
    if (falhas.length) { falhou = true; console.error(`${falhas.length} falhas (primeiras 5):`, falhas.slice(0, 5)) }
    else console.log("Fotos enviadas.")
  }
}

if (!soImagens) {
  const gz = path.join(pastaSaida, "produtos.json.gz")
  if (!existsSync(gz)) { console.error("Falta saida/produtos.json.gz. Rode `npm run catalogo` antes."); process.exit(1) }
  const corpo = readFileSync(gz)
  console.log(`Catálogo: produtos.json.gz, ${(corpo.length / 1048576).toFixed(2)} MB.`)
  if (!simular) {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: "catalogo/produtos.json", Body: corpo,
      ContentType: "application/json", ContentEncoding: "gzip",
      // O nome é fixo (o app sempre lê o mesmo endereço), então o cache é curto.
      CacheControl: "public, max-age=300",
    }))
    console.log("Catálogo enviado.")
  }
}

if (falhou) process.exit(1)
