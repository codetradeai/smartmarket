package com.smartmarket.dto.produto;

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
public class ProdutoResponse {

    private Long id;
    private String nome;
    private String marca;
    private Double quantidade;
    private String unidade;
    private String codigoBarras;
    private String categoria;
    private String imagemUrl;

    public static ProdutoResponse from(Produto produto) {
        return ProdutoResponse.builder()
            .id(produto.getId())
            .nome(produto.getNome())
            .marca(produto.getMarca())
            .quantidade(produto.getQuantidade())
            .unidade(produto.getUnidade())
            .codigoBarras(produto.getCodigoBarras())
            .categoria(produto.getCategoria())
            .imagemUrl(produto.getImagemUrl())
            .build();
    }
}
