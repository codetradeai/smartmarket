package com.smartmarket.dto.lista;

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
public class MercadoComparacaoResponse {

    private Long mercadoId;
    private String mercadoNome;
    private BigDecimal valorTotal;
    private Integer itensEncontrados;
    private Integer itensIndisponiveis;
    private Boolean completo;
    private Boolean maisBarato;
}
