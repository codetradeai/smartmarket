package com.smartmarket.dto.alerta;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class AlertaResponse {

    private final Long id;
    private final Long produtoId;
    private final String produtoNome;
    private final BigDecimal precoAlvo;
    private final Boolean ativo;
    private final BigDecimal menorPreco;
    private final Long mercadoMenorPrecoId;
    private final String mercadoMenorPrecoNome;
    private final boolean atingido;
    private final LocalDateTime createdAt;
}
