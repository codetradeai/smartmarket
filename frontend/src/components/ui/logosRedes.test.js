import { LOGOS_REDES } from './logosRedes'

const REDES = ['asun', 'atacadao', 'carrefour', 'fort', 'master', 'rissul', 'stok', 'zaffari']

describe('LOGOS_REDES', () => {
  it('tem imagem e tamanho de exibição para as 8 redes', () => {
    expect(Object.keys(LOGOS_REDES).sort()).toEqual(REDES)
    for (const id of REDES) {
      expect(LOGOS_REDES[id].src).toBeTruthy()
      expect(LOGOS_REDES[id].largura).toBeGreaterThan(0)
      expect(LOGOS_REDES[id].altura).toBeGreaterThan(0)
    }
  })

  it('respeita os tetos de largura e altura da faixa', () => {
    for (const id of REDES) {
      expect(LOGOS_REDES[id].largura).toBeLessThanOrEqual(208)
      expect(LOGOS_REDES[id].altura).toBeLessThanOrEqual(76)
    }
  })

  it('mantém o peso visual parecido: a área do maior logo não passa de 1,8x a do menor', () => {
    // Um logo quase quadrado e um muito largo têm proporções opostas; a área de exibição é que se iguala.
    const areas = REDES.map((id) => LOGOS_REDES[id].largura * LOGOS_REDES[id].altura)
    expect(Math.max(...areas) / Math.min(...areas)).toBeLessThanOrEqual(1.8)
  })
})
