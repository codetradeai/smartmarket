import { CHAVES, limparDadosPrivados } from './storageKeys'

describe('storageKeys', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('limparDadosPrivados remove as 4 chaves privadas', () => {
    localStorage.setItem('sm_fav_products', '["1"]')
    localStorage.setItem('sm_fav_markets', '["2"]')
    localStorage.setItem('sm_price_alerts', '{"1":10}')
    sessionStorage.setItem('sm_list', '{"itens":[]}')

    limparDadosPrivados()

    expect(localStorage.getItem('sm_fav_products')).toBeNull()
    expect(localStorage.getItem('sm_fav_markets')).toBeNull()
    expect(localStorage.getItem('sm_price_alerts')).toBeNull()
    expect(sessionStorage.getItem('sm_list')).toBeNull()
  })

  it('nao remove token nem usuario da sessao', () => {
    localStorage.setItem(CHAVES.token, 'abc123')
    localStorage.setItem(CHAVES.user, '{"id":1}')

    limparDadosPrivados()

    expect(localStorage.getItem(CHAVES.token)).toBe('abc123')
    expect(localStorage.getItem(CHAVES.user)).toBe('{"id":1}')
  })

  it('funciona sem lancar erro quando o armazenamento esta vazio', () => {
    expect(() => limparDadosPrivados()).not.toThrow()
  })
})
