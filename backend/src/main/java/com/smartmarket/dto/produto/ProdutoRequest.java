package com.smartmarket.dto.produto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
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
public class ProdutoRequest {

    @NotBlank(message = "nome e obrigatorio")
    @Size(max = 255, message = "nome deve ter no maximo 255 caracteres")
    private String nome;

    @Size(max = 255, message = "marca deve ter no maximo 255 caracteres")
    private String marca;

    @PositiveOrZero(message = "quantidade nao pode ser negativa")
    private Double quantidade;

    @Size(max = 50, message = "unidade deve ter no maximo 50 caracteres")
    private String unidade;

    @Size(max = 50, message = "codigoBarras deve ter no maximo 50 caracteres")
    private String codigoBarras;

    @NotBlank(message = "categoria e obrigatoria")
    @Size(max = 255, message = "categoria deve ter no maximo 255 caracteres")
    private String categoria;

    @Size(max = 500, message = "imagemUrl deve ter no maximo 500 caracteres")
    private String imagemUrl;
}
