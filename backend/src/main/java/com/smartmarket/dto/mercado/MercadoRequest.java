package com.smartmarket.dto.mercado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
    @Size(max = 255, message = "nome deve ter no maximo 255 caracteres")
    private String nome;

    @Size(max = 500, message = "endereco deve ter no maximo 500 caracteres")
    private String endereco;

    @Size(max = 500, message = "logoUrl deve ter no maximo 500 caracteres")
    private String logoUrl;
}
