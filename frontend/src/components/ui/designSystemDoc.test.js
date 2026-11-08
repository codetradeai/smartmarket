import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as ui from './index'

// O DESIGN-SYSTEM.md é copiado por quem cria telas novas: os exemplos precisam resolver de verdade.
const doc = readFileSync(path.resolve(__dirname, '../../../DESIGN-SYSTEM.md'), 'utf8')
const imports = [...doc.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)].map(([, nomes, origem]) => ({
  origem,
  nomes: nomes.split(',').map((n) => n.trim()).filter(Boolean),
}))

describe('DESIGN-SYSTEM.md (exemplos de import)', () => {
  it('não usa o alias "@/", que não existe no vite.config.js nem no jest.config.cjs', () => {
    expect(doc).not.toMatch(/from\s*["']@\//)
  })

  it('importa os componentes de ui por caminho relativo, como o código das páginas', () => {
    const deUi = imports.filter((i) => i.origem.includes('components/ui'))
    expect(deUi.length).toBeGreaterThan(0)
    deUi.forEach((i) => expect(i.origem).toBe('../components/ui'))
  })

  it('só importa nomes que o barrel de components/ui realmente exporta', () => {
    imports
      .filter((i) => i.origem.endsWith('components/ui'))
      .flatMap((i) => i.nomes)
      .forEach((nome) => expect(ui[nome]).toBeDefined())
  })
})
