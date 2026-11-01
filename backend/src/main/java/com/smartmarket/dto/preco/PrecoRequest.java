package com.smartmarket.dto.preco;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrecoRequest {

    @NotNull(message = "produto_id e obrigatorio")
    private Long produtoId;

    @NotNull(message = "mercado_id e obrigatorio")
    private Long mercadoId;

    @NotNull(message = "valor e obrigatorio")
    @Positive(message = "valor deve ser positivo")
    private BigDecimal valor;

    private Boolean disponivel = true;
}
