package com.smartmarket.dto.lista;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ListaRequest {

    @NotBlank(message = "nome e obrigatorio")
    @Size(max = 255, message = "nome deve ter no maximo 255 caracteres")
    private String nome;

    @Valid
    @Size(max = ItemListaRequest.ITENS_MAXIMOS_POR_LISTA, message = "a lista aceita no maximo 100 itens")
    @Builder.Default
    private List<ItemListaRequest> itens = new ArrayList<>();
}
