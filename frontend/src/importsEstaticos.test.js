import fs from 'fs'
import path from 'path'

// Guarda de desempenho: a Home e a Navbar não podem alcançar o data.js (32 MB) por import estático,
// nem direto nem pelos módulos que importam (o barrel components/ui incluso). O catálogo entra só
// por import() dinâmico (utils/carregarProdutos).
const RAIZ = __dirname
const DATA = path.join(RAIZ, 'data.js')

const resolver = (de, spec) => {
  if (!spec.startsWith('.')) return null
  const base = path.resolve(path.dirname(de), spec)
  const candidatos = [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js'), path.join(base, 'index.jsx')]
  return candidatos.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null
}

// import/export ... from '...' (estáticos); import('...') dinâmico fica de fora.
const ESTATICO = /(?:import|export)\s*(?:[\s\S]*?\s*from\s*)?['"]([^'"]+)['"]/g

function caminhoAteData(inicio) {
  const anterior = new Map([[inicio, null]])
  const pilha = [inicio]
  while (pilha.length) {
    const atual = pilha.pop()
    const codigo = fs.readFileSync(atual, 'utf8')
    for (const m of codigo.matchAll(ESTATICO)) {
      const alvo = resolver(atual, m[1])
      if (!alvo || anterior.has(alvo)) continue
      anterior.set(alvo, atual)
      if (alvo === DATA) {
        const cadeia = []
        for (let x = alvo; x; x = anterior.get(x)) cadeia.unshift(path.relative(RAIZ, x))
        return cadeia
      }
      if (/\.(jsx?|mjs)$/.test(alvo)) pilha.push(alvo)
    }
  }
  return null
}

describe('imports estáticos do data.js', () => {
  it.each([
    ['pages/Home.jsx'],
    ['components/ui/Navbar.jsx'],
  ])('%s não alcança o data.js por import estático', (arquivo) => {
    const cadeia = caminhoAteData(path.join(RAIZ, arquivo))
    expect(cadeia && cadeia.join(' -> ')).toBeNull()
  })
})

// Depois da etapa 1, nenhum código da aplicação (fora de testes e fixtures) lê o data.js: o catálogo
// vem de /catalogo/produtos.<hash>.json e os frames 360° de /catalogo/frames/<versao>/<id>.json (gerados no build).
describe('data.js fora do código da aplicação', () => {
  const arquivos = []
  const varrer = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      const caminho = path.join(dir, nome)
      if (fs.statSync(caminho).isDirectory()) varrer(caminho)
      else if (/\.(jsx?|mjs)$/.test(nome) && !/\.test\.|dataFixture/.test(nome) && caminho !== DATA) arquivos.push(caminho)
    }
  }
  varrer(RAIZ)

  it('nenhum módulo da aplicação importa o data.js (estático ou dinâmico)', () => {
    const importadores = arquivos.filter((a) => /(?:from\s*|import\s*\(\s*)['"](?:\.\.?\/)+data['"]/.test(fs.readFileSync(a, 'utf8')))
    expect(importadores.map((a) => path.relative(RAIZ, a))).toEqual([])
  })
})
