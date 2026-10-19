package com.smartmarket.dto.lista;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemListaRequest {

    @NotNull(message = "O ID do produto e obrigatorio")
    private Long produtoId;

    @NotNull(message = "A quantidade e obrigatoria")
    @Positive(message = "A quantidade deve ser maior que zero")
    @Builder.Default
    private Integer quantidade = 1;
}
