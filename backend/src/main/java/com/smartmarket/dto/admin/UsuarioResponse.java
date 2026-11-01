package com.smartmarket.dto.admin;

import com.smartmarket.model.Usuario;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class UsuarioResponse {

    private final Long id;
    private final String nome;
    private final String email;
    private final String papel;
    private final LocalDateTime createdAt;

    public static UsuarioResponse from(Usuario usuario) {
        return UsuarioResponse.builder()
            .id(usuario.getId())
            .nome(usuario.getNome())
            .email(usuario.getEmail())
            .papel(usuario.getPapel().name())
            .createdAt(usuario.getCreatedAt())
            .build();
    }
}
