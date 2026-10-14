package com.smartmarket.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String tipo;
    private Long id;
    private String nome;
    private String email;
    private String papel;
}
