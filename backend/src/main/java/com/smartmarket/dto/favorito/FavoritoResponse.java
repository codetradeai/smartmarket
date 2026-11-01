package com.smartmarket.dto.favorito;

import com.smartmarket.dto.mercado.MercadoResponse;
import com.smartmarket.model.Favorito;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class FavoritoResponse {

    private final Long id;
    private final MercadoResponse mercado;
    private final LocalDateTime createdAt;

    public static FavoritoResponse from(Favorito favorito) {
        return FavoritoResponse.builder()
            .id(favorito.getId())
            .mercado(MercadoResponse.from(favorito.getMercado()))
            .createdAt(favorito.getCreatedAt())
            .build();
    }
}
