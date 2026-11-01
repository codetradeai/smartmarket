package com.smartmarket.dto.lista;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
<<<<<<< feature/scraper-expansao-rs-automacao
import lombok.*;
=======
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
>>>>>>> develop

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemListaRequest {

<<<<<<< feature/scraper-expansao-rs-automacao
    @NotNull(message = "O ID do produto e obrigatorio")
    private Long produtoId;

    @NotNull(message = "A quantidade e obrigatoria")
    @Positive(message = "A quantidade deve ser maior que zero")
    @Builder.Default
    private Integer quantidade = 1;
=======
    @NotNull(message = "produtoId e obrigatorio")
    private Long produtoId;

    @NotNull(message = "quantidade e obrigatoria")
    @Positive(message = "quantidade deve ser maior que zero")
    private Integer quantidade;
>>>>>>> develop
}
