import { cn } from './utils'

describe('cn', () => {
  it('junta classes ignorando valores falsos', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('aceita classes condicionais em objeto', () => {
    expect(cn('base', { ativo: true, inativo: false })).toBe('base ativo')
  })

  it('resolve conflitos do Tailwind mantendo a ultima classe', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})
