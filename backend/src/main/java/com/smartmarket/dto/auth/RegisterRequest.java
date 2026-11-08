package com.smartmarket.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "Nome e obrigatorio")
    @Size(max = 255, message = "Nome deve ter no maximo 255 caracteres")
    private String nome;

    @NotBlank(message = "Email e obrigatorio")
    @Email(message = "Email invalido")
    @Size(max = 255, message = "Email deve ter no maximo 255 caracteres")
    private String email;

    @NotBlank(message = "Senha e obrigatoria")
    @Size(min = 6, max = 72, message = "Senha deve ter entre 6 e 72 caracteres")
    private String senha;

    // Tira os espacos das pontas antes da validacao: "  maria@x.com " passa a ser um e-mail valido.
    public void setEmail(String email) {
        this.email = email == null ? null : email.trim();
    }
}
