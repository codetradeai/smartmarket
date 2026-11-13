import {
  CHAVES,
  ativarDadosDoUsuario,
  chaveDoDono,
  guardarDadosPrivados,
  normalizarDono,
} from './storageKeys'

// Dados privados vivem nas chaves "ativas" (as que as paginas leem). Ao encerrar a sessao eles
// sao GUARDADOS sob o namespace do dono (sm_fav_products:<email>), nunca apagados; ao entrar,
// os do usuario que logou voltam para as chaves ativas.
function preencherDados({ favs = '["1"]', mercados = '["2"]', alertas = '{"1":10}', lista = '{"itens":[1]}' } = {}) {
  localStorage.setItem('sm_fav_products', favs)
  localStorage.setItem('sm_fav_markets', mercados)
  localStorage.setItem('sm_price_alerts', alertas)
  sessionStorage.setItem('sm_list', lista)
}

function ativosVazios() {
  return (
    localStorage.getItem('sm_fav_products') === null &&
    localStorage.getItem('sm_fav_markets') === null &&
    localStorage.getItem('sm_price_alerts') === null &&
    sessionStorage.getItem('sm_list') === null
  )
}

describe('storageKeys', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('normalizarDono / chaveDoDono', () => {
    it('normaliza o e-mail (trim + minusculas) e devolve vazio para valor invalido', () => {
      expect(normalizarDono('  Ana@Email.COM ')).toBe('ana@email.com')
      expect(normalizarDono('')).toBe('')
      expect(normalizarDono(null)).toBe('')
      expect(normalizarDono(undefined)).toBe('')
    })

    it('monta a chave com namespace', () => {
      expect(chaveDoDono('sm_fav_products', 'Ana@Email.com')).toBe('sm_fav_products:ana@email.com')
    })
  })

  describe('guardarDadosPrivados', () => {
    it('move os dados para o namespace do dono em vez de apagar', () => {
      localStorage.setItem(CHAVES.owner, 'ana@email.com')
      preencherDados()

      guardarDadosPrivados()

      expect(ativosVazios()).toBe(true)
      expect(localStorage.getItem('sm_fav_products:ana@email.com')).toBe('["1"]')
      expect(localStorage.getItem('sm_fav_markets:ana@email.com')).toBe('["2"]')
      expect(localStorage.getItem('sm_price_alerts:ana@email.com')).toBe('{"1":10}')
      expect(sessionStorage.getItem('sm_list:ana@email.com')).toBe('{"itens":[1]}')
      expect(localStorage.getItem(CHAVES.owner)).toBeNull()
    })

    it('nao mexe no token nem no usuario da sessao', () => {
      localStorage.setItem(CHAVES.owner, 'ana@email.com')
      localStorage.setItem(CHAVES.token, 'abc123')
      localStorage.setItem(CHAVES.user, '{"id":1}')
      preencherDados()

      guardarDadosPrivados()

      expect(localStorage.getItem(CHAVES.token)).toBe('abc123')
      expect(localStorage.getItem(CHAVES.user)).toBe('{"id":1}')
    })

    it('descobre o dono pelo sm_user quando nao ha sm_owner', () => {
      localStorage.setItem(CHAVES.user, JSON.stringify({ email: 'Ana@Email.com' }))
      preencherDados()

      guardarDadosPrivados()

      expect(ativosVazios()).toBe(true)
      expect(localStorage.getItem('sm_fav_products:ana@email.com')).toBe('["1"]')
    })

    it('sem dono identificavel nao mexe em nada (nao ha como atribuir os dados)', () => {
      preencherDados()

      guardarDadosPrivados()

      expect(localStorage.getItem('sm_fav_products')).toBe('["1"]')
      expect(sessionStorage.getItem('sm_list')).toBe('{"itens":[1]}')
    })

    it('funciona sem lancar erro quando o armazenamento esta vazio', () => {
      expect(() => guardarDadosPrivados()).not.toThrow()
      localStorage.setItem(CHAVES.owner, 'ana@email.com')
      expect(() => guardarDadosPrivados()).not.toThrow()
    })

    it('se nao conseguir gravar o namespace, mantem o dado ativo (nao destroi)', () => {
      localStorage.setItem(CHAVES.owner, 'ana@email.com')
      preencherDados()
      const setItem = Storage.prototype.setItem
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (chave, valor) {
        if (String(chave).includes(':')) throw new Error('cota excedida')
        return setItem.call(this, chave, valor)
      })

      expect(() => guardarDadosPrivados()).not.toThrow()

      expect(localStorage.getItem('sm_fav_products')).toBe('["1"]')
    })
  })

  describe('raioLojas (preferência não pessoal)', () => {
    it('tem a chave sm_raio_lojas_km', () => {
      expect(CHAVES.raioLojas).toBe('sm_raio_lojas_km')
    })

    it('não é privada: continua ativa no logout e na entrada de outro usuário, sem cópia por dono', () => {
      localStorage.setItem(CHAVES.owner, 'ana@email.com')
      localStorage.setItem('sm_raio_lojas_km', '5')

      guardarDadosPrivados()

      expect(localStorage.getItem('sm_raio_lojas_km')).toBe('5')
      expect(localStorage.getItem('sm_raio_lojas_km:ana@email.com')).toBeNull()

      ativarDadosDoUsuario('b@email.com')

      expect(localStorage.getItem('sm_raio_lojas_km')).toBe('5')
      expect(localStorage.getItem('sm_raio_lojas_km:b@email.com')).toBeNull()
    })
  })

  describe('ativarDadosDoUsuario', () => {
    it('A favorita, sai, B entra e ve vazio, A volta e ve os dados dele', () => {
      // A entra e favorita
      ativarDadosDoUsuario('a@email.com')
      preencherDados({ favs: '["p1","p2"]', alertas: '{"p1":9.9}' })

      // A sai
      guardarDadosPrivados()
      expect(ativosVazios()).toBe(true)

      // B entra: ve vazio e nada de A
      ativarDadosDoUsuario('b@email.com')
      expect(ativosVazios()).toBe(true)
      expect(localStorage.getItem(CHAVES.owner)).toBe('b@email.com')
      localStorage.setItem('sm_fav_products', '["p9"]')

      // B sai, A volta
      guardarDadosPrivados()
      ativarDadosDoUsuario('a@email.com')

      expect(JSON.parse(localStorage.getItem('sm_fav_products'))).toEqual(['p1', 'p2'])
      expect(JSON.parse(localStorage.getItem('sm_price_alerts'))).toEqual({ p1: 9.9 })
      // e os dados de B continuam guardados para B
      expect(localStorage.getItem('sm_fav_products:b@email.com')).toBe('["p9"]')
    })

    it('B entra por cima de A sem logout (sessao expirada/aba fechada): A fica guardado, B ve vazio', () => {
      localStorage.setItem(CHAVES.owner, 'a@email.com')
      preencherDados()

      ativarDadosDoUsuario('b@email.com')

      expect(ativosVazios()).toBe(true)
      expect(localStorage.getItem('sm_fav_products:a@email.com')).toBe('["1"]')
      expect(sessionStorage.getItem('sm_list:a@email.com')).toBe('{"itens":[1]}')
      expect(localStorage.getItem(CHAVES.owner)).toBe('b@email.com')
    })

    it('o mesmo usuario entrando de novo mantem os dados ativos', () => {
      localStorage.setItem(CHAVES.owner, 'ana@email.com')
      preencherDados()

      ativarDadosDoUsuario('Ana@Email.com')

      expect(localStorage.getItem('sm_fav_products')).toBe('["1"]')
      expect(localStorage.getItem(CHAVES.owner)).toBe('Ana@Email.com')
    })

    it('sem e-mail nao faz nada', () => {
      preencherDados()

      ativarDadosDoUsuario('')

      expect(localStorage.getItem('sm_fav_products')).toBe('["1"]')
      expect(localStorage.getItem(CHAVES.owner)).toBeNull()
    })

    it('migracao: dados antigos sem namespace sao adotados so pelo primeiro usuario que logar', () => {
      preencherDados({ favs: '["velho"]' })

      ativarDadosDoUsuario('primeiro@email.com')

      // o primeiro leva o que estava nas chaves globais
      expect(localStorage.getItem('sm_fav_products')).toBe('["velho"]')
      expect(localStorage.getItem(CHAVES.migrado)).toBe('1')

      // ao sair, os dados passam ao namespace dele e as chaves globais ficam limpas
      guardarDadosPrivados()
      expect(ativosVazios()).toBe(true)
      expect(localStorage.getItem('sm_fav_products:primeiro@email.com')).toBe('["velho"]')

      // o segundo nao herda nada
      ativarDadosDoUsuario('segundo@email.com')
      expect(ativosVazios()).toBe(true)
    })

    it('migracao acontece uma vez so: dado sem dono depois da migracao nao e adotado por ninguem', () => {
      localStorage.setItem(CHAVES.migrado, '1')
      preencherDados({ favs: '["anonimo"]' })

      ativarDadosDoUsuario('novo@email.com')

      expect(ativosVazios()).toBe(true)
    })

    it('se nao conseguir guardar o dono anterior, remove o dado ativo para nao vazar ao novo usuario', () => {
      localStorage.setItem(CHAVES.owner, 'a@email.com')
      preencherDados()
      const setItem = Storage.prototype.setItem
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (chave, valor) {
        if (String(chave).includes(':')) throw new Error('cota excedida')
        return setItem.call(this, chave, valor)
      })

      ativarDadosDoUsuario('b@email.com')

      expect(ativosVazios()).toBe(true)
    })
  })
})
