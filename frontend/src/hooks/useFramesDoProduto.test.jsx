import { renderHook, waitFor } from '@testing-library/react'
import { useFramesDoProduto } from './useFramesDoProduto'
import { reiniciarCacheDoCatalogo } from '../utils/carregarProdutos'

const resposta = (corpo, status = 200) => ({ ok: status === 200, status, json: async () => corpo })

describe('useFramesDoProduto', () => {
  let fetchOriginal
  beforeEach(() => {
    reiniciarCacheDoCatalogo()
    fetchOriginal = global.fetch
  })
  afterEach(() => {
    global.fetch = fetchOriginal
  })

  it('usa os frames que já vêm no produto, sem fetch', () => {
    global.fetch = jest.fn()
    const produto = { id: 'p1', recursosVisuais: { has360: true, frames: ['a', 'b'] } }
    const { result } = renderHook(() => useFramesDoProduto(produto, true))
    expect(result.current).toEqual(['a', 'b'])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('não baixa nada enquanto inativo; ao ativar, busca em frames.json', async () => {
    global.fetch = jest.fn(async () => resposta({ p1: ['a', 'b', 'c'] }))
    const produto = { id: 'p1', recursosVisuais: { has360: true } }
    const { result, rerender } = renderHook(({ ativo }) => useFramesDoProduto(produto, ativo), { initialProps: { ativo: false } })
    expect(result.current).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()

    rerender({ ativo: true })
    await waitFor(() => expect(result.current).toEqual(['a', 'b', 'c']))
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('produto sem has360 nunca busca; falha da busca devolve []', async () => {
    global.fetch = jest.fn(async () => resposta(null, 500))
    const { result: semFlag } = renderHook(() => useFramesDoProduto({ id: 'p2', recursosVisuais: {} }, true))
    expect(semFlag.current).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()

    const { result } = renderHook(() => useFramesDoProduto({ id: 'p3', recursosVisuais: { has360: true } }, true))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(result.current).toEqual([])
  })
})
