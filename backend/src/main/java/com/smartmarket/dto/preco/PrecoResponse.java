package com.smartmarket.dto.preco;

import com.smartmarket.model.Preco;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrecoResponse {

    private Long id;
    private Long produtoId;
    private Long mercadoId;
    private String mercadoNome;
    private BigDecimal valor;
    private LocalDateTime coletadoEm;
    private Boolean disponivel;

    public static PrecoResponse from(Preco preco) {
        return PrecoResponse.builder()
            .id(preco.getId())
            .produtoId(preco.getProduto().getId())
            .mercadoId(preco.getMercado().getId())
            .mercadoNome(preco.getMercado().getNome())
            .valor(preco.getValor())
            .coletadoEm(preco.getColetadoEm())
            .disponivel(preco.getDisponivel())
            .build();
    }
}
