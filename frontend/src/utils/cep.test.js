import { cepValido, mascararCep, somenteDigitosCep } from './cep'

describe('cep', () => {
  describe('somenteDigitosCep', () => {
    it('remove máscara, espaços e letras', () => {
      expect(somenteDigitosCep('90010-000')).toBe('90010000')
      expect(somenteDigitosCep(' 90.010-000 ')).toBe('90010000')
      expect(somenteDigitosCep('abc9001x0000')).toBe('90010000')
    })

    it('limita a 8 dígitos', () => {
      expect(somenteDigitosCep('900100001234')).toBe('90010000')
    })

    it('trata valores vazios ou nulos', () => {
      expect(somenteDigitosCep('')).toBe('')
      expect(somenteDigitosCep(null)).toBe('')
      expect(somenteDigitosCep(undefined)).toBe('')
    })
  })

  describe('mascararCep', () => {
    it('não coloca hífen até o 5º dígito', () => {
      expect(mascararCep('')).toBe('')
      expect(mascararCep('9')).toBe('9')
      expect(mascararCep('90010')).toBe('90010')
    })

    it('coloca o hífen a partir do 6º dígito', () => {
      expect(mascararCep('900100')).toBe('90010-0')
      expect(mascararCep('90010000')).toBe('90010-000')
    })

    it('é idempotente e ignora o excedente', () => {
      expect(mascararCep('90010-000')).toBe('90010-000')
      expect(mascararCep('90010-0001234')).toBe('90010-000')
    })

    it('descarta caracteres não numéricos', () => {
      expect(mascararCep('9a0b0-1c0')).toBe('90010')
    })
  })

  describe('cepValido', () => {
    it('aceita 8 dígitos, com ou sem máscara', () => {
      expect(cepValido('90010000')).toBe(true)
      expect(cepValido('90010-000')).toBe(true)
    })

    it('rejeita CEP incompleto ou vazio', () => {
      expect(cepValido('90010-00')).toBe(false)
      expect(cepValido('')).toBe(false)
      expect(cepValido(null)).toBe(false)
    })
  })
})
