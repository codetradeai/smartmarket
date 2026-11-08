import { aplicarAlteracoes, criarRegistroDeAlteracoes, registrarAlteracao } from './alteracoesFavoritos'

describe('alteracoesFavoritos', () => {
  it('sem alteracoes devolve a lista do servidor sem duplicatas', () => {
    expect(aplicarAlteracoes(['1', '2', '2', 3], criarRegistroDeAlteracoes())).toEqual(['1', '2', '3'])
  })

  it('remove o que o usuario desfavoritou durante a espera', () => {
    const registro = criarRegistroDeAlteracoes()
    registrarAlteracao(registro, 'p1', false)

    expect(aplicarAlteracoes(['p1', 'p2'], registro)).toEqual(['p2'])
  })

  it('acrescenta o que o usuario favoritou e o servidor nao conhece', () => {
    const registro = criarRegistroDeAlteracoes()
    registrarAlteracao(registro, 7, true)

    expect(aplicarAlteracoes(['p1'], registro)).toEqual(['p1', '7'])
  })

  it('vale a ultima acao do usuario sobre o mesmo id', () => {
    const registro = criarRegistroDeAlteracoes()
    registrarAlteracao(registro, 'p1', false)
    registrarAlteracao(registro, 'p1', true)

    expect(aplicarAlteracoes(['p1'], registro)).toEqual(['p1'])
  })

  it('nao duplica um id que o usuario favoritou e o servidor ja devolve', () => {
    const registro = criarRegistroDeAlteracoes()
    registrarAlteracao(registro, 'p2', true)

    expect(aplicarAlteracoes(['p2'], registro)).toEqual(['p2'])
  })
})
