// Content-Security-Policy do build estático (GitHub Pages não deixa configurar cabeçalhos HTTP, então a
// política vai numa <meta http-equiv>). O plugin só atua no `vite build`: no dev o HMR usa scripts inline
// e WebSocket, que a política bloquearia.
//
// Limitação das metas: `frame-ancestors`, `report-uri` e `sandbox` são ignorados quando vêm em <meta>.
// Proteção contra clickjacking exige cabeçalho (X-Frame-Options / frame-ancestors) no servidor que hospeda.

/** Origem (esquema + host + porta) de uma URL absoluta http(s); null se vazia, relativa ou inválida. */
export function origemDe(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const { protocol, origin } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? origin : null
  } catch {
    return null
  }
}

const unicas = (lista) => [...new Set(lista.filter(Boolean))]

/**
 * Monta a política. Recebe as mesmas URLs que o app usa em tempo de execução:
 * - apiUrl (VITE_API_URL): backend em outro domínio -> connect-src. "/api" relativo cai em 'self'.
 * - catalogoUrl (VITE_CATALOGO_URL): JSON do catálogo no bucket -> connect-src.
 * - assetsUrl (VITE_ASSETS_BASE_URL): fotos e vídeos no bucket -> img-src e media-src.
 * Só a origem entra na política (nunca o caminho), e valores que não sejam URL http(s) são descartados,
 * o que também impede que uma variável de ambiente injete outras diretivas.
 */
export function montarCsp({ apiUrl, catalogoUrl, assetsUrl } = {}) {
  const api = origemDe(apiUrl)
  const catalogo = origemDe(catalogoUrl)
  const assets = origemDe(assetsUrl)

  const diretivas = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    // React aplica estilos via atributo style=; sem 'unsafe-inline' em style-src eles seriam bloqueados.
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:'],
    // Fotos vêm do bucket e também de URLs https dos próprios mercados (campo imageUrl do catálogo).
    'img-src': unicas(["'self'", 'data:', assets, 'https:']),
    'media-src': unicas(["'self'", assets]),
    'connect-src': unicas(["'self'", api, catalogo]),
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }
  return Object.entries(diretivas)
    .map(([nome, valores]) => `${nome} ${valores.join(' ')}`)
    .join('; ')
}

/**
 * Plugin do Vite: injeta a <meta> da CSP no <head> do index.html, só no build.
 * Entra logo depois de <meta charset>, que precisa ficar nos primeiros 1024 bytes do documento (a CSP com
 * as URLs de produção passa de 700 bytes, então injetá-la antes empurraria o charset para fora desse limite).
 * A política vale para o que vem depois dela, então os scripts do Vite (que o build coloca mais abaixo) ficam cobertos.
 */
export function pluginCsp(env = {}) {
  return {
    name: 'smartmarket-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const content = montarCsp({
        apiUrl: env.VITE_API_URL,
        catalogoUrl: env.VITE_CATALOGO_URL,
        assetsUrl: env.VITE_ASSETS_BASE_URL,
      })
      const meta = `<meta http-equiv="Content-Security-Policy" content="${content}" />`
      if (/<meta\s+charset[^>]*>/i.test(html)) {
        return html.replace(/(<meta\s+charset[^>]*>)/i, `$1\n    ${meta}`)
      }
      return html.replace(/<head([^>]*)>/i, `<head$1>\n    ${meta}`)
    },
  }
}
