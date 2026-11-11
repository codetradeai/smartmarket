import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SeletorCepRaio } from "./SeletorCepRaio";

describe("Componente SeletorCepRaio", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("renderiza com CEP padrão e badges de cidades metropolitanas", async () => {
    const handleFiltroChange = jest.fn();
    await act(async () => {
      render(<SeletorCepRaio onFiltroChange={handleFiltroChange} />);
    });

    expect(screen.getByText(/94910-000/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cachoeirinha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Porto Alegre" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Canoas" })).toBeInTheDocument();
  });

  test("permite clicar em atalho rápido e atualizar localização", async () => {
    const handleFiltroChange = jest.fn();
    await act(async () => {
      render(<SeletorCepRaio onFiltroChange={handleFiltroChange} />);
    });

    const botaoPOA = screen.getByRole("button", { name: "Porto Alegre" });
    await act(async () => {
      fireEvent.click(botaoPOA);
    });

    expect(localStorage.getItem("sm_user_cep")).toBe("90010-000");
    await waitFor(() => {
      expect(handleFiltroChange).toHaveBeenCalledWith(
        expect.objectContaining({
          cep: "90010-000",
        })
      );
    });
  });

  test("permite alterar o raio de distância", async () => {
    const handleFiltroChange = jest.fn();
    await act(async () => {
      render(<SeletorCepRaio onFiltroChange={handleFiltroChange} />);
    });

    const selectRaio = screen.getByRole("combobox");
    await act(async () => {
      fireEvent.change(selectRaio, { target: { value: "5" } });
    });

    expect(localStorage.getItem("sm_user_raio_km")).toBe("5");
    expect(handleFiltroChange).toHaveBeenCalledWith(
      expect.objectContaining({
        raioKm: 5,
      })
    );
  });
});
