package com.smartmarket.dto.promocao;

import com.smartmarket.model.Promocao;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class PromocaoResponse {

    private final Long id;
    private final Long produtoId;
    private final String produtoNome;
    private final Long mercadoId;
    private final String mercadoNome;
    private final BigDecimal valorOriginal;
    private final BigDecimal valorPromocional;
    private final LocalDate dataInicio;
    private final LocalDate dataFim;

    public static PromocaoResponse from(Promocao promocao) {
        return PromocaoResponse.builder()
            .id(promocao.getId())
            .produtoId(promocao.getProduto().getId())
            .produtoNome(promocao.getProduto().getNome())
            .mercadoId(promocao.getMercado().getId())
            .mercadoNome(promocao.getMercado().getNome())
            .valorOriginal(promocao.getValorOriginal())
            .valorPromocional(promocao.getValorPromocional())
            .dataInicio(promocao.getDataInicio())
            .dataFim(promocao.getDataFim())
            .build();
    }
}
