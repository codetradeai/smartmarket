package com.smartmarket.dto.lista;

import com.smartmarket.model.ItemLista;
import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemListaResponse {

    private Long id;
    private Long produtoId;
    private String nomeProduto;
    private String marcaProduto;
    private Double quantidadeProduto;
    private String unidade;
    private String categoria;
    private Integer quantidade;
    private Map<Long, BigDecimal> precosPorMercado;

    public static ItemListaResponse from(ItemLista item, Map<Long, BigDecimal> precos) {
        return ItemListaResponse.builder()
            .id(item.getId())
            .produtoId(item.getProduto().getId())
            .nomeProduto(item.getProduto().getNome())
            .marcaProduto(item.getProduto().getMarca())
            .quantidadeProduto(item.getProduto().getQuantidade())
            .unidade(item.getProduto().getUnidade())
            .categoria(item.getProduto().getCategoria())
            .quantidade(item.getQuantidade())
            .precosPorMercado(precos)
            .build();
    }
}
