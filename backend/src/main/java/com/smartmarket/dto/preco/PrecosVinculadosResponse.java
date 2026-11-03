package com.smartmarket.dto.preco;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Preços de um produto e de todos os produtos de outras redes com vínculo CONFIRMADO. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrecosVinculadosResponse {

    private Long produtoId;
    private String produtoNome;
    private List<PrecoVinculado> precos;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrecoVinculado {
        private Long produtoId;
        private String produtoNome;
        private Long mercadoId;
        private String mercadoNome;
        private BigDecimal valor;
        private LocalDateTime coletadoEm;
        /** "proprio" para o produto consultado; "ean" ou "nome" para os vinculados. */
        private String origemVinculo;
    }
}
