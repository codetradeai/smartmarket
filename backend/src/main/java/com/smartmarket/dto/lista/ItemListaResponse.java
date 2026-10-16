package com.smartmarket.dto.lista;

import com.smartmarket.model.ItemLista;
import com.smartmarket.model.Produto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemListaResponse {

    private Long id;
    private Long produtoId;
    private String produtoNome;
    private String produtoMarca;
    private Integer quantidade;

    public static ItemListaResponse from(ItemLista item, Produto produto) {
        return ItemListaResponse.builder()
            .id(item.getId())
            .produtoId(produto.getId())
            .produtoNome(produto.getNome())
            .produtoMarca(produto.getMarca())
            .quantidade(item.getQuantidade())
            .build();
    }
}
