require('@testing-library/jest-dom')
const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock @vercel/analytics
jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}))

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
