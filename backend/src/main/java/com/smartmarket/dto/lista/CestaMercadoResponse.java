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
public class CestaMercadoResponse {
    private Long mercadoId;
    private String nomeMercado;
    private String logoUrl;
    private BigDecimal total;
    private int itensDisponiveis;
    private int totalItensSolicitados;
    @Builder.Default
    private List<String> itensIndisponiveis = new ArrayList<>();
}
