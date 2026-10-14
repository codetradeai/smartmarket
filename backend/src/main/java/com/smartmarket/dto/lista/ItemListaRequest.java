package com.smartmarket.dto.lista;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemListaRequest {

    @NotNull(message = "produtoId e obrigatorio")
    private Long produtoId;

    @NotNull(message = "quantidade e obrigatoria")
    @Positive(message = "quantidade deve ser maior que zero")
    private Integer quantidade;
}
