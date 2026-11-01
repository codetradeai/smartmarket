import * as servicos from './index'
import api from './api'
import authService from './authService'
import produtoService from './produtoService'
import mercadoService from './mercadoService'
import listaService from './listaService'
import favoritoService from './favoritoService'
import adminService from './adminService'

describe('services (barrel)', () => {
  it('reexporta o cliente HTTP e todos os servicos', () => {
    expect(servicos.api).toBe(api)
    expect(servicos.authService).toBe(authService)
    expect(servicos.produtoService).toBe(produtoService)
    expect(servicos.mercadoService).toBe(mercadoService)
    expect(servicos.listaService).toBe(listaService)
    expect(servicos.favoritoService).toBe(favoritoService)
    expect(servicos.adminService).toBe(adminService)
  })
})
