package com.smartmarket.dto.favorito;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class FavoritoGravado {

    private final FavoritoResponse favorito;
    private final boolean criado;
}
