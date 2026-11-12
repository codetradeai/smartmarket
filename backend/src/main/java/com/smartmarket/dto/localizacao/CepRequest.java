package com.smartmarket.dto.localizacao;

import com.smartmarket.service.geo.Cep;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

/** Corpo de PUT /api/usuarios/me/localizacao: troca o CEP e resolve a localização de novo. */
@Getter
@Setter
public class CepRequest {

    @NotBlank(message = "CEP e obrigatorio")
    @Pattern(regexp = Cep.REGEX, message = Cep.MENSAGEM_INVALIDO)
    private String cep;

    // Mesma tolerância do cadastro: espaços nas pontas não invalidam o CEP.
    public void setCep(String cep) {
        this.cep = cep == null ? null : cep.trim();
    }
}
