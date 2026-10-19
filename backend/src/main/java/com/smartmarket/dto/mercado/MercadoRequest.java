package com.smartmarket.dto.mercado;

import jakarta.validation.constraints.NotBlank;
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
public class MercadoRequest {

    @NotBlank(message = "nome e obrigatorio")
    private String nome;

    private String endereco;

    private String logoUrl;
}
