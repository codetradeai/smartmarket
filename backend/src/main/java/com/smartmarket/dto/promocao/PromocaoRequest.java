package com.smartmarket.dto.promocao;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PromocaoRequest {

    @NotNull(message = "produtoId e obrigatorio")
    private Long produtoId;

    @NotNull(message = "mercadoId e obrigatorio")
    private Long mercadoId;

    @NotNull(message = "valorOriginal e obrigatorio")
    @Positive(message = "valorOriginal deve ser maior que zero")
    private BigDecimal valorOriginal;

    @NotNull(message = "valorPromocional e obrigatorio")
    @Positive(message = "valorPromocional deve ser maior que zero")
    private BigDecimal valorPromocional;

    @NotNull(message = "dataInicio e obrigatoria")
    private LocalDate dataInicio;

    @NotNull(message = "dataFim e obrigatoria")
    private LocalDate dataFim;
}
