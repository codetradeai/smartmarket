package com.smartmarket.dto.mercado;

import com.smartmarket.model.Mercado;
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
public class MercadoResponse {

    private Long id;
    private String nome;
    private String endereco;
    private String logoUrl;
    private Boolean ativo;

    public static MercadoResponse from(Mercado mercado) {
        return MercadoResponse.builder()
            .id(mercado.getId())
            .nome(mercado.getNome())
            .endereco(mercado.getEndereco())
            .logoUrl(mercado.getLogoUrl())
            .ativo(mercado.getAtivo())
            .build();
    }
}
