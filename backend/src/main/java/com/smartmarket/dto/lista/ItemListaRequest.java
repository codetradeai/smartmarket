package com.smartmarket.dto.lista;

import jakarta.validation.constraints.Max;
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

    // Teto por item: evita estouro de Integer na soma e totais absurdos na comparacao.
    public static final int QUANTIDADE_MAXIMA = 999;
    // Teto de itens distintos por lista (cada item vira uma consulta ao criar a lista).
    public static final int ITENS_MAXIMOS_POR_LISTA = 100;

    @NotNull(message = "quantidade e obrigatoria")
    @Positive(message = "quantidade deve ser maior que zero")
    @Max(value = QUANTIDADE_MAXIMA, message = "quantidade deve ser no maximo 999")
    private Integer quantidade;
}
