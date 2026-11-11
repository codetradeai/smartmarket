import { REDES_COM_COLETA_ATIVA, redesComColetaAtiva } from './redesDoCatalogo'

const MERCADOS = ['zaffari', 'rissul', 'asun', 'stok', 'atacadao', 'master', 'fort', 'carrefour'].map((id) => ({ id, name: id }))

describe('redesComColetaAtiva', () => {
  it('descarta as redes suspensas no scraper (Fort, Zaffari e Rissul)', () => {
    const ids = redesComColetaAtiva(MERCADOS).map((m) => m.id)

    for (const suspensa of ['fort', 'zaffari', 'rissul']) {
      expect(ids).not.toContain(suspensa)
    }
  })

  it('mantém as cinco redes coletadas, na ordem recebida', () => {
    expect(redesComColetaAtiva(MERCADOS).map((m) => m.id)).toEqual(['asun', 'stok', 'atacadao', 'master', 'carrefour'])
    expect(REDES_COM_COLETA_ATIVA).toHaveLength(5)
  })

  it('tolera entrada que não é lista', () => {
    expect(redesComColetaAtiva(undefined)).toEqual([])
    expect(redesComColetaAtiva(null)).toEqual([])
  })
})
