import { useEffect, useState } from "react"
import { carregarFrames } from "../utils/carregarProdutos"

const SEM_FRAMES = []

/**
 * Frames do 360° de um produto. Se o objeto já traz os frames (dados antigos ou testes), usa-os;
 * senão, com `ativo = true`, busca /catalogo/frames/<versao>/<id>.json. Devolve [] enquanto não houver frames
 * (ou se a busca falhar: o 360° simplesmente não aparece e a imagem estática continua valendo).
 */
export function useFramesDoProduto(produto, ativo = true) {
  const embutidos = produto?.recursosVisuais?.frames
  const id = produto?.id
  const precisaBuscar = Boolean(ativo && id && produto?.recursosVisuais?.has360 && !embutidos?.length)
  const [carregados, setCarregados] = useState({ id: null, frames: SEM_FRAMES })

  useEffect(() => {
    if (!precisaBuscar) return undefined
    let vivo = true
    carregarFrames(id)
      .then((frames) => vivo && setCarregados({ id, frames }))
      .catch(() => vivo && setCarregados({ id, frames: SEM_FRAMES }))
    return () => {
      vivo = false
    }
  }, [precisaBuscar, id])

  if (embutidos?.length) return embutidos
  return carregados.id === id ? carregados.frames : SEM_FRAMES
}
