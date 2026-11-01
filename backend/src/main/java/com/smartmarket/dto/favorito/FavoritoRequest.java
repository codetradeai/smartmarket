package com.smartmarket.dto.favorito;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FavoritoRequest {

    @NotNull(message = "mercadoId e obrigatorio")
    private Long mercadoId;
}
