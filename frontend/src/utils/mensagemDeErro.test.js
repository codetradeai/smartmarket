import { mensagemDeErro } from './mensagemDeErro'

const erroHttp = (status, data) => Object.assign(new Error('Request failed'), { response: { status, data } })

describe('mensagemDeErro', () => {
  it('prefere a userMessage definida pelo interceptor (ex.: 403)', () => {
    const erro = erroHttp(403, { erro: 'Acesso negado. Permissao insuficiente.' })
    erro.userMessage = 'Você não tem permissão para acessar este recurso.'

    expect(mensagemDeErro(erro)).toBe('Você não tem permissão para acessar este recurso.')
  })

  it('usa o campo "erro" do corpo devolvido pelo backend', () => {
    expect(mensagemDeErro(erroHttp(400, { erro: 'Nome do produto é obrigatório' }))).toBe('Nome do produto é obrigatório')
  })

  it('junta os erros por campo da validação (400 com "campos")', () => {
    const erro = erroHttp(400, { erro: 'Dados invalidos', campos: { nome: 'nao pode ser vazio', marca: 'muito longa' } })

    expect(mensagemDeErro(erro)).toBe('Dados invalidos: nao pode ser vazio. muito longa')
  })

  it('aceita corpo em texto puro e as chaves "mensagem" e "message"', () => {
    expect(mensagemDeErro(erroHttp(500, 'Falha no servidor'))).toBe('Falha no servidor')
    expect(mensagemDeErro(erroHttp(500, { mensagem: 'Indisponível' }))).toBe('Indisponível')
    expect(mensagemDeErro(erroHttp(500, { message: 'Boom' }))).toBe('Boom')
  })

  it('explica a falta de resposta do servidor quando não há response', () => {
    expect(mensagemDeErro(new Error('Network Error'))).toMatch(/Sem resposta do servidor/)
  })

  it('cai no status HTTP quando o corpo não ajuda', () => {
    expect(mensagemDeErro(erroHttp(502, ''))).toBe('Erro 502 do servidor.')
    expect(mensagemDeErro(erroHttp(500, {}))).toBe('Erro 500 do servidor.')
  })

  it('usa o texto padrão para valores que não são erro', () => {
    expect(mensagemDeErro(undefined)).toBe('Erro inesperado.')
    expect(mensagemDeErro(null, 'Falhou.')).toBe('Falhou.')
  })
})
