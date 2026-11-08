import { readFileSync } from 'node:fs'
import path from 'node:path'

// WCAG 2.x: texto normal (< 18 px, ou < 14 px em negrito) exige razão de contraste >= 4,5:1 (AA).
const AA_TEXTO_NORMAL = 4.5

const css = readFileSync(path.resolve(__dirname, 'index.css'), 'utf8')
const bloco = (css.match(/@theme\s*\{([\s\S]*?)\n\}/) || [])[1] || ''
const token = (nome) => {
  const achado = bloco.match(new RegExp(`--color-${nome}:\\s*(#[0-9a-fA-F]{6})\\s*;`))
  if (!achado) throw new Error(`Token --color-${nome} não encontrado no @theme de index.css`)
  return achado[1]
}

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a, b) {
  const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (maior + 0.05) / (menor + 0.05)
}

const BRANCO = '#FFFFFF'

describe('contraste dos tokens de cor (WCAG AA)', () => {
  it('texto branco no botão primário (brand-green) e no hover tem pelo menos 4,5:1', () => {
    expect(contraste(BRANCO, token('brand-green'))).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
    expect(contraste(BRANCO, token('brand-green-hover'))).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
  })

  it('o hover continua mais escuro que a cor base', () => {
    expect(luminancia(token('brand-green-hover'))).toBeLessThan(luminancia(token('brand-green')))
    expect(luminancia(token('brand-green-dark'))).toBeLessThanOrEqual(luminancia(token('brand-green-hover')))
  })

  it('brand-green usado como cor de texto passa nos fundos da marca (branco, bg e green-light)', () => {
    for (const fundo of [BRANCO, token('brand-bg'), token('brand-green-light')]) {
      expect(contraste(token('brand-green'), fundo)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
    }
  })

  it('brand-muted (texto secundário padrão) passa nos fundos da marca', () => {
    for (const fundo of [BRANCO, token('brand-bg'), token('brand-green-light')]) {
      expect(contraste(token('brand-muted'), fundo)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
    }
  })

  it('text-slate-400 (usado em textos de 9 a 12 px) passa sobre branco e sobre o bg da marca', () => {
    for (const fundo of [BRANCO, token('brand-bg')]) {
      expect(contraste(token('slate-400'), fundo)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
    }
  })
})
