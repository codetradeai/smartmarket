package com.smartmarket.dto.lista;

import com.smartmarket.model.ListaCompra;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ListaCompraResponse {

    private Long id;
    private String nome;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @Builder.Default
    private List<ItemListaResponse> itens = new ArrayList<>();

    public static ListaCompraResponse from(ListaCompra lista, List<ItemListaResponse> itensResponse) {
        return ListaCompraResponse.builder()
            .id(lista.getId())
            .nome(lista.getNome())
            .createdAt(lista.getCreatedAt())
            .updatedAt(lista.getUpdatedAt())
            .itens(itensResponse)
            .build();
    }
}
