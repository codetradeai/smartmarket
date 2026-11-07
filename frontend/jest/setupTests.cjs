require('@testing-library/jest-dom')
const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// jsdom não implementa window.matchMedia. Este stub simula um navegador de desktop sem
// preferências especiais (nenhuma media query casa) e suporta tanto addEventListener quanto
// o addListener legado. É uma função comum (não jest.fn) para sobreviver a jest.resetAllMocks().
// Um teste que precise de outro comportamento pode sobrescrever window.matchMedia.
//
// Com matchMedia presente, Home.jsx passa a tocar o vídeo (video.play?.().catch(...)). No jsdom,
// HTMLMediaElement.play() devolve undefined; num navegador devolve uma Promise. O stub abaixo
// reproduz o navegador para o componente não quebrar nos testes.
if (typeof window !== 'undefined' && window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.play = () => Promise.resolve()
  window.HTMLMediaElement.prototype.pause = () => {}
}
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query) => ({
      matches: false,
      media: String(query),
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// fetch() do catálogo: o app baixa /catalogo/produtos.json e /catalogo/frames.json (arquivos gerados
// no build). Nos testes, o stub abaixo responde com o módulo '../src/data' (que cada teste troca pela
// fixture via jest.mock) para que a interface leia os mesmos dados de antes. O require fica dentro da
// função para respeitar o jest.mock do teste. Um teste pode sobrescrever global.fetch por jest.fn.
if (typeof global !== 'undefined') {
  const resposta = (corpo, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  })
  global.fetch = async (url) => {
    const alvo = String(url)
    if (alvo.endsWith('/catalogo/produtos.json')) return resposta(require('../src/data').PRODUCTS)
    if (alvo.endsWith('/catalogo/frames.json')) {
      const mapa = {}
      for (const p of require('../src/data').PRODUCTS) {
        if (p.recursosVisuais?.frames?.length) mapa[p.id] = p.recursosVisuais.frames
      }
      return resposta(mapa)
    }
    return resposta({}, 404)
  }
}
