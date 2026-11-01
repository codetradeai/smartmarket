import { renderHook } from '@testing-library/react'
import { AuthContext } from '../contexts/AuthContext'
import { useAuth } from './useAuth'

describe('useAuth', () => {
  it('retorna o valor do AuthContext quando usado dentro do provider', () => {
    const valor = { isAuthenticated: true, user: { nome: 'Bruno' } }
    const wrapper = ({ children }) => (
      <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current).toBe(valor)
  })

  it('lanca erro explicativo fora de um AuthProvider', () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth deve ser utilizado dentro de um <AuthProvider>'
    )

    erro.mockRestore()
  })
})
