import { readFileSync } from 'node:fs'
import path from 'node:path'

// O coverageThreshold de 70% (jest.config.cjs) só é avaliado com --coverage. Se o CI rodar `npm test`
// (jest sem cobertura), uma queda da cobertura passa verde. Este teste trava essa regressão do workflow.
const raiz = path.resolve(__dirname, '../..')
const ci = readFileSync(path.join(raiz, '.github/workflows/ci.yml'), 'utf8')
const pkg = JSON.parse(readFileSync(path.join(raiz, 'frontend/package.json'), 'utf8'))
const jestConfig = require('../jest.config.cjs')

// Trecho do job do frontend, do nome do job até o próximo job.
const jobFrontend = ci.split(/\n {2}frontend-test:/)[1]?.split(/\n {2}[a-z-]+:\n/)[0] || ''

describe('CI do frontend aplica o limiar de cobertura', () => {
  it('o script test:coverage roda o jest com --coverage', () => {
    expect(pkg.scripts['test:coverage']).toMatch(/jest\s+--coverage/)
  })

  it('o jest.config.cjs mantém o limiar global de 70% (não baixar sem acordo do grupo)', () => {
    expect(jestConfig.coverageThreshold.global).toEqual({
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    })
  })

  it('o job frontend-test executa `npm run test:coverage`', () => {
    expect(jobFrontend).toContain('run: npm run test:coverage')
  })

  it('o job frontend-test não roda a suíte sem cobertura (`npm test`)', () => {
    expect(jobFrontend).not.toMatch(/run:\s*npm test\s*$/m)
  })
})
