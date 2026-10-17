package com.smartmarket.dto.lista;

import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComparacaoCestaResponse {
    private Long listaId;
    private String nomeLista;
    private int totalItensDistintos;
    @Builder.Default
    private List<CestaMercadoResponse> mercados = new ArrayList<>();
    private CestaMercadoResponse mercadoMaisBarato;
    private BigDecimal economiaMaxima;
}
