import { fireEvent, render, screen } from "@testing-library/react"
import { AnatomiaSmartMarket } from "./AnatomiaSmartMarket"
import { REDES_COM_COLETA_ATIVA } from "../utils/redesDoCatalogo"

const TITULOS = [
  "Coleta Automatizada RS",
  "Fotos e 360° em Alta Definição",
  "Comparação Cesta a Cesta",
  "Transparência Total",
]

const telemetria = () => document.querySelector("[aria-live='polite']")

describe("AnatomiaSmartMarket", () => {
  it("mantém header e textos originais dos quatro pilares", () => {
    render(<AnatomiaSmartMarket />)
    expect(screen.getByText("Sobre o SmartMarket")).toBeInTheDocument()
    expect(screen.getByText("Economia inteligente na palma da sua mão.")).toBeInTheDocument()
    for (const titulo of TITULOS) {
      expect(screen.getByRole("heading", { name: titulo })).toBeInTheDocument()
    }
    expect(
      screen.getByText("Robôs especializados que monitoram VTEX, VipCommerce e APIs oficiais das 8 maiores redes do RS."),
    ).toBeInTheDocument()
  })

  it("seleciona o pilar por botão real e indica com aria-pressed", () => {
    render(<AnatomiaSmartMarket />)
    const botoes = TITULOS.map((t) => screen.getByRole("button", { name: t }))
    expect(botoes[0]).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(botoes[2])
    expect(botoes[2]).toHaveAttribute("aria-pressed", "true")
    expect(botoes[0]).toHaveAttribute("aria-pressed", "false")
    expect(telemetria()).toHaveTextContent("LAYER 03 — COMPARAÇÃO")
    expect(telemetria()).toHaveTextContent("Análise de preços considerando a cesta completa.")
  })

  it("também troca a camada ao passar o mouse", () => {
    render(<AnatomiaSmartMarket />)
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Transparência Total" }))
    expect(telemetria()).toHaveTextContent("LAYER 04 — TRANSPARÊNCIA")
  })

  it("mostra só o estado do núcleo da camada ativa para tecnologias assistivas", () => {
    const { container } = render(<AnatomiaSmartMarket />)
    const estados = () => [...container.querySelectorAll("[inert]")]
    expect(estados()).toHaveLength(3)
    fireEvent.click(screen.getByRole("button", { name: "Fotos e 360° em Alta Definição" }))
    expect(estados()).toHaveLength(3)
    expect(container.querySelector("[inert]")).not.toContainElement(screen.getByLabelText("Girar o produto para a direita"))
  })

  it("não afirma status de API, números de redes não confirmados nem política de anúncios", () => {
    render(<AnatomiaSmartMarket />)
    expect(screen.queryByText(/online/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/patrocinad/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/4 em integração/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${REDES_COM_COLETA_ATIVA.length} redes com coleta diária ativa`))).toBeInTheDocument()
  })

  it("ilustra a comparação sem preços nem percentuais", () => {
    render(<AnatomiaSmartMarket />)
    expect(screen.getByText("Ilustração conceitual, sem preços ou percentuais.")).toBeInTheDocument()
    const texto = document.body.textContent
    expect(texto).not.toMatch(/R\$\s?\d/)
    // o único percentual permitido é o "100%" do texto original do pilar 04
    expect(texto.replace("focados 100% no benefício", "")).not.toMatch(/\d\s?%/)
  })

  it("usa as fotos 360° reais do produto e troca o quadro pelas setas e pelo mouse", () => {
    const produto = {
      id: "p1",
      name: "Arroz Teste 5kg",
      imageLocal: "/f/0.jpg",
      recursosVisuais: { has360: true, frames: ["/f/0.jpg", "/f/1.jpg", "/f/2.jpg", "/f/3.jpg"] },
    }
    render(<AnatomiaSmartMarket produto={produto} />)
    fireEvent.click(screen.getByRole("button", { name: "Fotos e 360° em Alta Definição" }))
    const img = () => screen.getByRole("img", { name: /Arroz Teste 5kg/, hidden: true })
    expect(img()).toHaveAttribute("src", "/f/0.jpg")

    fireEvent.click(screen.getByLabelText("Girar o produto para a direita", { hidden: true }))
    expect(img()).toHaveAttribute("src", "/f/1.jpg")

    fireEvent.click(screen.getByLabelText("Girar o produto para a esquerda", { hidden: true }))
    fireEvent.click(screen.getByLabelText("Girar o produto para a esquerda", { hidden: true }))
    expect(img()).toHaveAttribute("src", "/f/3.jpg")

    // sem layout no jsdom o retângulo é 0×0: o mouse não pode quebrar nem sair do intervalo
    fireEvent.mouseMove(img().parentElement, { clientX: 9999 })
    expect(img().getAttribute("src")).toMatch(/^\/f\/\d\.jpg$/)
  })

  it("pré-carrega todos os quadros só depois de abrir a camada do 360°", () => {
    const pedidos = []
    const ImageOriginal = global.Image
    global.Image = class {
      set src(v) {
        pedidos.push(v)
      }
    }
    try {
      const frames = ["/f/0.jpg", "/f/1.jpg", "/f/2.jpg", "/f/3.jpg"]
      const produto = { id: "p1", name: "Arroz", imageLocal: frames[0], recursosVisuais: { has360: true, frames } }
      render(<AnatomiaSmartMarket produto={produto} />)
      expect(pedidos).toHaveLength(0) // camada 01 ativa: nada de 360° baixado ainda

      fireEvent.click(screen.getByRole("button", { name: "Fotos e 360° em Alta Definição" }))
      expect(pedidos).toEqual(frames)
    } finally {
      global.Image = ImageOriginal
    }
  })

  it("sem produto 360° usa a ilustração esquemática", () => {
    render(<AnatomiaSmartMarket produto={{ id: "p2", name: "Sem foto" }} />)
    expect(screen.getByText(/Efeito de perspectiva ilustrativo/)).toBeInTheDocument()
  })

  it("gira o produto pelos controles do estado visual", () => {
    render(<AnatomiaSmartMarket />)
    fireEvent.click(screen.getByRole("button", { name: "Fotos e 360° em Alta Definição" }))
    const direita = screen.getByLabelText("Girar o produto para a direita", { hidden: true })
    fireEvent.click(direita)
    fireEvent.click(screen.getByLabelText("Girar o produto para a esquerda", { hidden: true }))
    expect(direita).toBeInTheDocument()
  })
})
