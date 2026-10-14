package com.smartmarket.dto.lista;

import com.smartmarket.model.ListaCompra;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ListaResponse {

    private Long id;
    private String nome;
    private Integer totalItens;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ListaResponse from(ListaCompra lista, int totalItens) {
        return ListaResponse.builder()
            .id(lista.getId())
            .nome(lista.getNome())
            .totalItens(totalItens)
            .createdAt(lista.getCreatedAt())
            .updatedAt(lista.getUpdatedAt())
            .build();
    }
}
