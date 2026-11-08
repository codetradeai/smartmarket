package com.smartmarket.dto.lista;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
    @Size(max = 255, message = "O nome da lista deve ter no maximo 255 caracteres")
    private String nome;

    @Builder.Default
    private List<@Valid ItemListaRequest> itens = new ArrayList<>();
}
