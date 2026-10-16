package com.smartmarket.dto.lista;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
    private String nome;

    @Valid
    @Builder.Default
    private List<ItemListaRequest> itens = new ArrayList<>();
}
