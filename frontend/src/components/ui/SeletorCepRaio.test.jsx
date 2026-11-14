import { act, fireEvent, render, screen } from "@testing-library/react";
import { SeletorCepRaio } from "./SeletorCepRaio";

const LOCALIZACAO = { cep: "90010000", cidade: "Porto Alegre", uf: "RS", resolvida: true };

// Renderiza o seletor controlado; devolve as ações espiãs para os testes conferirem.
function renderizar(props = {}) {
  const acoes = {
    onMudarRaio: jest.fn(),
    onTrocarCep: jest.fn().mockResolvedValue(undefined),
    onExcluir: jest.fn().mockResolvedValue(undefined),
  };
  const base = { localizacao: null, carregando: false, erro: null, raioKm: "todos", ...acoes };
  const { rerender } = render(<SeletorCepRaio {...base} {...props} />);
  return { ...acoes, rerender: (novas) => rerender(<SeletorCepRaio {...base} {...props} {...novas} />) };
}

describe("SeletorCepRaio", () => {
  describe("carregando", () => {
    it("mostra o texto de carregamento e nenhum botão de ação", () => {
      renderizar({ carregando: true, localizacao: LOCALIZACAO });

      expect(screen.getByText("Carregando sua localização…")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Alterar CEP" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Informar CEP" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Remover minha localização" })).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  describe("sem CEP", () => {
    it.each([
      ["localizacao null", null],
      ["cep vazio", { cep: "", cidade: "", uf: "", resolvida: false }],
    ])("com %s, mostra o convite e o botão Informar CEP, sem nenhum CEP ou cidade", (_caso, localizacao) => {
      renderizar({ localizacao });

      expect(
        screen.getByText("Informe seu CEP para ver a loja mais próxima de cada rede.")
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Informar CEP" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Alterar CEP" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Remover minha localização" })).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/\d{5}-?\d{3}/);
      expect(document.body.textContent).not.toMatch(/Cachoeirinha|Porto Alegre|Canoas|Gravataí/);
    });
  });

  describe("com CEP resolvido", () => {
    it("mostra a cidade e o CEP com máscara a partir do cep só com dígitos", () => {
      renderizar({ localizacao: LOCALIZACAO });

      expect(screen.getByText("Lojas perto de Porto Alegre/RS")).toBeInTheDocument();
      expect(screen.getByText("CEP: 90010-000")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Alterar CEP" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Informar CEP" })).not.toBeInTheDocument();
      expect(screen.queryByText(/Informe seu CEP/)).not.toBeInTheDocument();
    });

    it("sem cidade e UF na resposta, não escreve undefined e fala em 'perto de você'", () => {
      renderizar({ localizacao: { cep: "90010000", resolvida: true } });

      expect(screen.getByText("Lojas perto de você")).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/undefined|null/);
    });
  });

  describe("com CEP não resolvido", () => {
    const naoResolvida = { cep: "99999999", cidade: null, uf: null, resolvida: false };

    it("mostra o CEP e a mensagem das lojas padrão, sem o seletor de raio, e deixa alterar o CEP", () => {
      renderizar({ localizacao: naoResolvida });

      expect(screen.getByText("CEP: 99999-999")).toBeInTheDocument();
      expect(
        screen.getByText("Não conseguimos localizar esse CEP; mostrando as lojas padrão.")
      ).toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByText(/Lojas perto de/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Alterar CEP" })).toBeInTheDocument();
    });
  });

  describe("falha ao carregar", () => {
    it("sem localização, avisa em role status que o catálogo continua funcionando", () => {
      renderizar({ erro: "Erro 500 do servidor." });

      expect(screen.getByRole("status")).toHaveTextContent(
        "Não foi possível carregar sua localização agora. O catálogo continua funcionando."
      );
      expect(screen.queryByText(/Informe seu CEP/)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/Erro 500/);
    });

    it("com localização já conhecida, o erro da carga não aparece", () => {
      renderizar({ localizacao: LOCALIZACAO, erro: "Erro 500 do servidor." });

      expect(screen.queryByText(/Não foi possível carregar sua localização/)).not.toBeInTheDocument();
      expect(screen.getByText("Lojas perto de Porto Alegre/RS")).toBeInTheDocument();
    });
  });

  describe("alterar CEP", () => {
    const abrirFormulario = (nomeDoBotao = "Alterar CEP") => {
      fireEvent.click(screen.getByRole("button", { name: nomeDoBotao }));
      return screen.getByLabelText("CEP");
    };
    const digitar = (campo, valor) => fireEvent.change(campo, { target: { value: valor } });

    it("abre um campo CEP acessível, numérico, de até 9 caracteres e vazio, também no convite", () => {
      renderizar();

      const campo = abrirFormulario("Informar CEP");

      expect(campo).toHaveAttribute("inputmode", "numeric");
      expect(campo).toHaveAttribute("maxlength", "9");
      expect(campo).toHaveValue("");
    });

    it("aplica a máscara a cada tecla: 90010000 vira 90010-000", () => {
      renderizar({ localizacao: LOCALIZACAO });
      const campo = abrirFormulario();

      digitar(campo, "90010000");

      expect(campo).toHaveValue("90010-000");
    });

    it("com CEP inválido mostra o alerta e não chama onTrocarCep", () => {
      const { onTrocarCep } = renderizar({ localizacao: LOCALIZACAO });
      const campo = abrirFormulario();

      digitar(campo, "9001");
      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

      expect(screen.getByRole("alert")).toHaveTextContent("Digite um CEP com 8 dígitos.");
      expect(onTrocarCep).not.toHaveBeenCalled();
      expect(screen.getByLabelText("CEP")).toBeInTheDocument();
    });

    it("digitar de novo some com o alerta de CEP inválido", () => {
      renderizar({ localizacao: LOCALIZACAO });
      const campo = abrirFormulario();
      digitar(campo, "9001");
      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

      digitar(campo, "90010");

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("com CEP válido chama onTrocarCep uma vez com o CEP mascarado, trava o botão na espera e fecha no sucesso", async () => {
      let concluir;
      const onTrocarCep = jest.fn(() => new Promise((resolve) => (concluir = resolve)));
      renderizar({ localizacao: LOCALIZACAO, onTrocarCep });
      digitar(abrirFormulario(), "90010000");

      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

      expect(onTrocarCep).toHaveBeenCalledTimes(1);
      expect(onTrocarCep).toHaveBeenCalledWith("90010-000");
      const botao = screen.getByRole("button", { name: "Salvando…" });
      expect(botao).toBeDisabled();
      expect(screen.getByLabelText("CEP")).toBeInTheDocument();

      await act(async () => concluir());

      expect(screen.queryByLabelText("CEP")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Alterar CEP" })).toBeInTheDocument();
    });

    it("quando onTrocarCep rejeita com userMessage, mostra o texto e mantém o formulário aberto", async () => {
      const erro = Object.assign(new Error("400"), { userMessage: "CEP inválido" });
      const onTrocarCep = jest.fn().mockRejectedValue(erro);
      renderizar({ localizacao: LOCALIZACAO, onTrocarCep });
      digitar(abrirFormulario(), "90010000");

      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("CEP inválido");
      expect(screen.getByLabelText("CEP")).toHaveValue("90010-000");
      expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
    });

    it("quando a rejeição não traz mensagem nenhuma, usa o texto padrão", async () => {
      const onTrocarCep = jest.fn().mockRejectedValue(undefined);
      renderizar({ localizacao: LOCALIZACAO, onTrocarCep });
      digitar(abrirFormulario(), "90010000");

      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível alterar o CEP.");
    });

    it("Cancelar fecha o formulário e descarta o que foi digitado", () => {
      const { onTrocarCep } = renderizar({ localizacao: LOCALIZACAO });
      digitar(abrirFormulario(), "90010000");

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByLabelText("CEP")).not.toBeInTheDocument();
      expect(onTrocarCep).not.toHaveBeenCalled();
      expect(abrirFormulario()).toHaveValue("");
    });
  });

  describe("remover localização", () => {
    const TEXTO_DE_FINALIDADE =
      "Usamos seu CEP só para indicar a loja mais próxima de cada rede. Ao remover, apagamos o CEP, a cidade e as coordenadas da sua conta.";
    const abrirConfirmacao = () => fireEvent.click(screen.getByRole("button", { name: "Remover minha localização" }));

    it("o botão aparece com CEP (resolvido ou não) e a confirmação só abre ao clicar", () => {
      renderizar({ localizacao: { cep: "99999999", resolvida: false } });

      expect(screen.getByRole("button", { name: "Remover minha localização" })).toBeInTheDocument();
      expect(screen.queryByText(TEXTO_DE_FINALIDADE)).not.toBeInTheDocument();
    });

    it("a confirmação mostra a finalidade; Cancelar não chama onExcluir e Remover chama uma vez", async () => {
      const { onExcluir } = renderizar({ localizacao: LOCALIZACAO });
      abrirConfirmacao();

      expect(screen.getByText(TEXTO_DE_FINALIDADE)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Remover minha localização" })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(onExcluir).not.toHaveBeenCalled();
      expect(screen.queryByText(TEXTO_DE_FINALIDADE)).not.toBeInTheDocument();

      abrirConfirmacao();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remover" }));
      });

      expect(onExcluir).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(TEXTO_DE_FINALIDADE)).not.toBeInTheDocument();
    });

    it("durante a espera o botão fica desabilitado, e um segundo clique não chama de novo", async () => {
      let concluir;
      const onExcluir = jest.fn(() => new Promise((resolve) => (concluir = resolve)));
      renderizar({ localizacao: LOCALIZACAO, onExcluir });
      abrirConfirmacao();

      fireEvent.click(screen.getByRole("button", { name: "Remover" }));
      const emEspera = screen.getByRole("button", { name: "Removendo…" });
      fireEvent.click(emEspera);

      expect(emEspera).toBeDisabled();
      expect(onExcluir).toHaveBeenCalledTimes(1);

      await act(async () => concluir());
      expect(screen.queryByRole("button", { name: "Removendo…" })).not.toBeInTheDocument();
    });

    it("quando onExcluir falha, mostra a mensagem em alerta e mantém a confirmação aberta", async () => {
      const erroDeServidor = Object.assign(new Error("500"), { response: { status: 500 } });
      const onExcluir = jest.fn().mockRejectedValue(erroDeServidor);
      renderizar({ localizacao: LOCALIZACAO, onExcluir });
      abrirConfirmacao();

      fireEvent.click(screen.getByRole("button", { name: "Remover" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Erro 500 do servidor.");
      expect(screen.getByText(TEXTO_DE_FINALIDADE)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remover" })).toBeEnabled();
    });

    it("quando a falha não traz mensagem nenhuma, usa o texto padrão", async () => {
      const onExcluir = jest.fn().mockRejectedValue(undefined);
      renderizar({ localizacao: LOCALIZACAO, onExcluir });
      abrirConfirmacao();

      fireEvent.click(screen.getByRole("button", { name: "Remover" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível remover a localização.");
    });

    it("abrir a confirmação fecha o formulário de CEP, e o contrário também", () => {
      renderizar({ localizacao: LOCALIZACAO });

      fireEvent.click(screen.getByRole("button", { name: "Alterar CEP" }));
      expect(screen.getByLabelText("CEP")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Remover minha localização" })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      abrirConfirmacao();
      expect(screen.getByText(TEXTO_DE_FINALIDADE)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Alterar CEP" })).not.toBeInTheDocument();
    });
  });

  describe("raio", () => {
    it("tem o select Raio com as cinco opções, só com CEP resolvido, e avisa sobre lojas sem distância", () => {
      renderizar({ localizacao: LOCALIZACAO });

      const select = screen.getByLabelText("Raio");
      expect(select.tagName).toBe("SELECT");
      expect(Array.from(select.options).map((opcao) => [opcao.value, opcao.textContent])).toEqual([
        ["3", "Até 3 km"],
        ["5", "Até 5 km"],
        ["10", "Até 10 km"],
        ["20", "Até 20 km"],
        ["todos", "Todas as distâncias"],
      ]);
      expect(screen.getByText("Lojas sem distância calculada continuam aparecendo.")).toBeInTheDocument();
    });

    it.each([
      [10, "10"],
      ["20", "20"],
      ["todos", "todos"],
      ["abc", "todos"],
      [7, "todos"],
      [undefined, "todos"],
    ])("com raioKm %p, o select mostra %p", (raioKm, valorMostrado) => {
      renderizar({ localizacao: LOCALIZACAO, raioKm });

      expect(screen.getByLabelText("Raio")).toHaveValue(valorMostrado);
    });

    it.each([
      ["sem localização", { localizacao: null }],
      ["com CEP não resolvido", { localizacao: { cep: "99999999", resolvida: false } }],
      ["carregando", { localizacao: LOCALIZACAO, carregando: true }],
      ["com erro e sem localização", { localizacao: null, erro: "falhou" }],
    ])("%s, o select e o aviso não aparecem", (_caso, props) => {
      renderizar(props);

      expect(screen.queryByLabelText("Raio")).not.toBeInTheDocument();
      expect(screen.queryByText(/Lojas sem distância calculada/)).not.toBeInTheDocument();
    });

    it("ao mudar para Até 5 km, chama onMudarRaio(5), com número", () => {
      const { onMudarRaio } = renderizar({ localizacao: LOCALIZACAO });

      fireEvent.change(screen.getByLabelText("Raio"), { target: { value: "5" } });

      expect(onMudarRaio).toHaveBeenCalledTimes(1);
      expect(onMudarRaio).toHaveBeenCalledWith(5);
    });

    it("ao mudar para Todas as distâncias, chama onMudarRaio('todos')", () => {
      const { onMudarRaio } = renderizar({ localizacao: LOCALIZACAO, raioKm: 5 });

      fireEvent.change(screen.getByLabelText("Raio"), { target: { value: "todos" } });

      expect(onMudarRaio).toHaveBeenCalledWith("todos");
    });
  });

  describe("foco do teclado", () => {
    const abrirFormulario = (nome = "Alterar CEP") => fireEvent.click(screen.getByRole("button", { name: nome }));
    const abrirConfirmacao = () => fireEvent.click(screen.getByRole("button", { name: "Remover minha localização" }));

    it("não rouba o foco ao montar nem ao mudar de props", () => {
      const { rerender } = renderizar({ localizacao: LOCALIZACAO });
      expect(document.body).toHaveFocus();

      rerender({ raioKm: 5 });

      expect(document.body).toHaveFocus();
    });

    it("ao abrir o formulário, o foco vai para o campo CEP", () => {
      renderizar({ localizacao: LOCALIZACAO });

      abrirFormulario();

      expect(screen.getByLabelText("CEP")).toHaveFocus();
    });

    it("ao abrir o formulário pelo convite, o foco também vai para o campo CEP", () => {
      renderizar();

      abrirFormulario("Informar CEP");

      expect(screen.getByLabelText("CEP")).toHaveFocus();
    });

    it("ao abrir a confirmação de remoção, o foco vai para o botão Cancelar", () => {
      renderizar({ localizacao: LOCALIZACAO });

      abrirConfirmacao();

      expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    });

    it("ao cancelar o formulário, o foco volta para o botão Alterar CEP", () => {
      renderizar({ localizacao: LOCALIZACAO });
      abrirFormulario();

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.getByRole("button", { name: "Alterar CEP" })).toHaveFocus();
    });

    it("ao cancelar pelo convite, o foco volta para o botão Informar CEP", () => {
      renderizar();
      abrirFormulario("Informar CEP");

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.getByRole("button", { name: "Informar CEP" })).toHaveFocus();
    });

    it("ao cancelar a confirmação de remoção, o foco volta para o botão Alterar CEP", () => {
      renderizar({ localizacao: LOCALIZACAO });
      abrirConfirmacao();

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.getByRole("button", { name: "Alterar CEP" })).toHaveFocus();
    });

    it("depois de salvar o CEP com sucesso, o foco vai para o botão Alterar CEP", async () => {
      renderizar({ localizacao: LOCALIZACAO });
      abrirFormulario();
      fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "90010000" } });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
      });

      expect(screen.getByRole("button", { name: "Alterar CEP" })).toHaveFocus();
    });

    it("depois de remover com sucesso, o foco vai para o botão Alterar CEP", async () => {
      renderizar({ localizacao: LOCALIZACAO });
      abrirConfirmacao();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remover" }));
      });

      expect(screen.getByRole("button", { name: "Alterar CEP" })).toHaveFocus();
    });

    it("se os botões sumirem por um instante (carregando), o foco vai para eles quando voltarem", async () => {
      const { rerender } = renderizar({ localizacao: LOCALIZACAO });
      abrirConfirmacao();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remover" }));
        rerender({ carregando: true });
      });
      expect(screen.queryByRole("button", { name: "Alterar CEP" })).not.toBeInTheDocument();
      rerender({ carregando: false, localizacao: null });

      expect(screen.getByRole("button", { name: "Informar CEP" })).toHaveFocus();
    });

    it("com falha ao salvar, o foco continua no formulário (não volta para o botão)", async () => {
      const onTrocarCep = jest.fn().mockRejectedValue(new Error("falhou"));
      renderizar({ localizacao: LOCALIZACAO, onTrocarCep });
      abrirFormulario();
      fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "90010000" } });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
      });

      expect(screen.getByLabelText("CEP")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Alterar CEP" })).not.toBeInTheDocument();
    });
  });

  describe("alerta ligado ao campo", () => {
    it("sem alerta o campo não tem aria-describedby; com alerta ele aponta para o id do alerta", () => {
      renderizar({ localizacao: LOCALIZACAO });
      fireEvent.click(screen.getByRole("button", { name: "Alterar CEP" }));
      const campo = screen.getByLabelText("CEP");
      expect(campo).not.toHaveAttribute("aria-describedby");

      fireEvent.change(campo, { target: { value: "9001" } });
      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

      const alerta = screen.getByRole("alert");
      expect(alerta.id).not.toBe("");
      expect(campo).toHaveAttribute("aria-describedby", alerta.id);
      expect(campo).toHaveAccessibleDescription("Digite um CEP com 8 dígitos.");
    });

    it("também aponta para o alerta quando o servidor recusa o CEP, e solta quando o alerta some", async () => {
      const erro = Object.assign(new Error("400"), { userMessage: "CEP inválido" });
      renderizar({ localizacao: LOCALIZACAO, onTrocarCep: jest.fn().mockRejectedValue(erro) });
      fireEvent.click(screen.getByRole("button", { name: "Alterar CEP" }));
      const campo = screen.getByLabelText("CEP");
      fireEvent.change(campo, { target: { value: "90010000" } });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
      });
      expect(campo).toHaveAccessibleDescription("CEP inválido");

      fireEvent.change(campo, { target: { value: "90010" } });
      expect(campo).not.toHaveAttribute("aria-describedby");
    });
  });

  describe("privacidade", () => {
    // Percorre todos os fluxos do cartão: informar, cancelar, salvar, falhar, remover e mudar o raio.
    async function percorrerTodosOsFluxos() {
      const onTrocarCep = jest.fn().mockRejectedValueOnce(new Error("falhou")).mockResolvedValue(undefined);
      renderizar({ localizacao: LOCALIZACAO, onTrocarCep });

      fireEvent.change(screen.getByLabelText("Raio"), { target: { value: "5" } });
      fireEvent.click(screen.getByRole("button", { name: "Alterar CEP" }));
      fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "9001" } });
      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
      fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "90010000" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
      });
      fireEvent.click(screen.getByRole("button", { name: "Remover minha localização" }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remover" }));
      });
    }

    it("Storage.prototype.setItem e getItem nunca são chamados em nenhum fluxo", async () => {
      const lerItem = jest.spyOn(Storage.prototype, "getItem");
      const gravarItem = jest.spyOn(Storage.prototype, "setItem");
      try {
        await percorrerTodosOsFluxos();

        expect(lerItem).not.toHaveBeenCalled();
        expect(gravarItem).not.toHaveBeenCalled();
      } finally {
        lerItem.mockRestore();
        gravarItem.mockRestore();
      }
    });

    it("não escreve nada no console (o CEP não pode vazar em log)", async () => {
      const espioes = ["log", "info", "warn", "error", "debug"].map((metodo) =>
        jest.spyOn(console, metodo).mockImplementation(() => {})
      );
      try {
        await percorrerTodosOsFluxos();

        espioes.forEach((espiao) => expect(espiao).not.toHaveBeenCalled());
      } finally {
        espioes.forEach((espiao) => espiao.mockRestore());
      }
    });
  });

  describe("texto de apoio", () => {
    const FRASE_PRECO = "O preço é o mesmo em toda a rede; a loja é só referência para você saber onde ir.";

    it("diz que o preço é o mesmo em toda a rede e não tem mais o texto sobre distância física real", () => {
      renderizar({ localizacao: LOCALIZACAO });

      expect(screen.getByText(FRASE_PRECO)).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/distância física real/);
    });

    it("a frase antiga do rodapé não existe mais (ela subiu e mudou de texto)", () => {
      renderizar({ localizacao: LOCALIZACAO });

      expect(document.body.textContent).not.toMatch(/A loja mais próxima aparece só como referência/);
    });

    it("a frase fica logo abaixo de 'Lojas perto de ...' e antes do aviso das lojas sem distância", () => {
      renderizar({ localizacao: LOCALIZACAO });

      const lugar = screen.getByText("Lojas perto de Porto Alegre/RS");
      const frase = screen.getByText(FRASE_PRECO);
      const semDistancia = screen.getByText("Lojas sem distância calculada continuam aparecendo.");
      const depois = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      expect(depois(lugar, frase)).toBe(true);
      expect(depois(frase, semDistancia)).toBe(true);
    });

    it.each([
      ["carregando", { carregando: true, localizacao: LOCALIZACAO }],
      ["sem CEP", { localizacao: null }],
      ["CEP não resolvido", { localizacao: { cep: "90010000", resolvida: false } }],
      ["erro ao carregar", { erro: "Erro 500 do servidor." }],
    ])("a frase aparece também em %s", (_caso, props) => {
      renderizar(props);

      expect(screen.getByText(FRASE_PRECO)).toBeInTheDocument();
    });

    describe("rede mais perto", () => {
      const REDE = { id: "fort", nome: "Fort Atacadista", distanciaKm: 2.5 };

      it("diz qual é a rede mais perto, com a distância aproximada em formato brasileiro", () => {
        renderizar({ localizacao: LOCALIZACAO, redeMaisPerto: REDE });

        const frase = screen.getByText(/A rede mais perto é Fort Atacadista/);
        expect(frase).toHaveTextContent(/^A rede mais perto é Fort Atacadista \(≈ 2,5 km\)\./);
      });

      it("a distância visual fica aria-hidden com a dica no title, e o texto falado vai em sr-only", () => {
        renderizar({ localizacao: LOCALIZACAO, redeMaisPerto: REDE });

        const visual = screen.getByText("≈ 2,5 km");
        expect(visual).toHaveAttribute("aria-hidden", "true");
        expect(visual).toHaveAttribute("title", "Distância em linha reta, calculada a partir do seu CEP");
        const falado = screen.getByText("aproximadamente 2,5 km, em linha reta, a partir do seu CEP");
        expect(falado).toHaveClass("sr-only");
        expect(falado).not.toHaveAttribute("aria-hidden");
      });

      it("fica depois da frase do preço", () => {
        renderizar({ localizacao: LOCALIZACAO, redeMaisPerto: REDE });

        const frase = screen.getByText(FRASE_PRECO);
        const rede = screen.getByText(/A rede mais perto é/);
        expect(Boolean(frase.compareDocumentPosition(rede) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
      });

      it("sem destaque (null) a frase não aparece", () => {
        renderizar({ localizacao: LOCALIZACAO, redeMaisPerto: null });

        expect(screen.queryByText(/A rede mais perto é/)).not.toBeInTheDocument();
      });

      it("sem a prop a frase não aparece", () => {
        renderizar({ localizacao: LOCALIZACAO });

        expect(screen.queryByText(/A rede mais perto é/)).not.toBeInTheDocument();
      });

      it("com o CEP não resolvido não afirma nenhuma rede mais perto", () => {
        renderizar({ localizacao: { cep: "90010000", resolvida: false }, redeMaisPerto: REDE });

        expect(screen.queryByText(/A rede mais perto é/)).not.toBeInTheDocument();
      });

      it("sem distância no objeto, a frase vem sem o parêntese", () => {
        renderizar({ localizacao: LOCALIZACAO, redeMaisPerto: { id: "fort", nome: "Fort Atacadista", distanciaKm: null } });

        expect(screen.getByText("A rede mais perto é Fort Atacadista.")).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/≈|aproximadamente/);
      });

      it("enquanto carrega a localização, não mostra a rede mais perto", () => {
        renderizar({ carregando: true, localizacao: LOCALIZACAO, redeMaisPerto: REDE });

        expect(screen.queryByText(/A rede mais perto é/)).not.toBeInTheDocument();
      });
    });
  });
});
