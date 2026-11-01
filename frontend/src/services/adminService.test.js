import api from './api'
import adminService from './adminService'

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn() },
}))

describe('adminService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('obterPainel busca as metricas consolidadas', async () => {
    api.get.mockResolvedValue({ data: { totalUsuarios: 3 } })

    await expect(adminService.obterPainel()).resolves.toEqual({ totalUsuarios: 3 })
    expect(api.get).toHaveBeenCalledWith('/admin/painel')
  })

  it('listarUsuarios usa paginacao padrao 0/20', async () => {
    api.get.mockResolvedValue({ data: { content: [] } })

    await adminService.listarUsuarios()

    expect(api.get).toHaveBeenCalledWith('/admin/usuarios', { params: { page: 0, size: 20 } })
  })

  it('listarUsuarios repassa pagina e tamanho informados', async () => {
    api.get.mockResolvedValue({ data: { content: [] } })

    await adminService.listarUsuarios(2, 5)

    expect(api.get).toHaveBeenCalledWith('/admin/usuarios', { params: { page: 2, size: 5 } })
  })

  it('alterarPapel envia o novo papel do usuario', async () => {
    api.patch.mockResolvedValue({ data: { id: 7, papel: 'ADMIN' } })

    await expect(adminService.alterarPapel(7, 'ADMIN')).resolves.toEqual({ id: 7, papel: 'ADMIN' })
    expect(api.patch).toHaveBeenCalledWith('/admin/usuarios/7/papel', { papel: 'ADMIN' })
  })
})
