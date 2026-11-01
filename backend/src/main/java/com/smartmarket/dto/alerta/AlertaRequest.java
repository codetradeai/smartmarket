package com.smartmarket.dto.alerta;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AlertaRequest {

    @NotNull(message = "produtoId e obrigatorio")
    private Long produtoId;

    @NotNull(message = "precoAlvo e obrigatorio")
    @Positive(message = "precoAlvo deve ser maior que zero")
    private BigDecimal precoAlvo;
}
