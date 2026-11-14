import { readFileSync } from 'node:fs'
import path from 'node:path'

// O botão "Usar minha localização atual" chama navigator.geolocation. Se o Nginx (imagem Docker) mandar
// `geolocation=()`, o navegador bloqueia a chamada em silêncio. Em cada bloco que repete o header (o
// add_header de um bloco anula o do servidor), a política tem de liberar só a própria origem.
const nginx = readFileSync(path.resolve(__dirname, '../nginx.conf'), 'utf8')
const linhas = nginx.split('\n').filter((linha) => /add_header\s+Permissions-Policy/i.test(linha))

describe('nginx.conf: Permissions-Policy', () => {
  it('define o header em 6 blocos (servidor e locations que repetem os cabeçalhos)', () => {
    expect(linhas).toHaveLength(6)
  })

  it.each(linhas.map((linha, i) => [i + 1, linha.trim()]))('bloco %i libera a geolocalização só para a própria origem', (_n, linha) => {
    expect(linha).toContain('geolocation=(self)')
    expect(linha).not.toMatch(/geolocation=\(\)/)
    expect(linha).not.toMatch(/geolocation=\*/)
  })

  it.each(linhas.map((linha, i) => [i + 1, linha.trim()]))('bloco %i continua bloqueando câmera, microfone e pagamento', (_n, linha) => {
    expect(linha).toContain('camera=()')
    expect(linha).toContain('microphone=()')
    expect(linha).toContain('payment=()')
  })
})
