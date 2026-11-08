package com.smartmarket.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {

    @NotBlank(message = "Email e obrigatorio")
    @Email(message = "Email invalido")
    private String email;

    @NotBlank(message = "Senha e obrigatoria")
    private String senha;

    // Tira os espacos das pontas antes da validacao: "  maria@x.com " passa a ser um e-mail valido.
    public void setEmail(String email) {
        this.email = email == null ? null : email.trim();
    }
}
