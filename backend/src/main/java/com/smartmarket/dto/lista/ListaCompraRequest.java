package com.smartmarket.dto.lista;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ListaCompraRequest {

    @NotBlank(message = "O nome da lista e obrigatorio")
    private String nome;

    @Builder.Default
    private List<@Valid ItemListaRequest> itens = new ArrayList<>();
}
