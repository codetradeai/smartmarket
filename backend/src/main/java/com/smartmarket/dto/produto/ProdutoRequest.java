package com.smartmarket.dto.produto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
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
    private String nome;

    private String marca;

    @PositiveOrZero(message = "quantidade nao pode ser negativa")
    private Double quantidade;

    private String unidade;

    private String codigoBarras;

    @NotBlank(message = "categoria e obrigatoria")
    private String categoria;

    private String imagemUrl;
}
