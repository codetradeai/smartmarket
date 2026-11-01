package com.smartmarket.security;

import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UsuarioAutenticado {

    private final UsuarioRepository usuarioRepository;

    public Usuario atual() {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof Jwt jwt)) {
            throw new AccessDeniedException("Autenticacao obrigatoria");
        }

        return usuarioRepository.findByEmail(jwt.getSubject())
            .orElseThrow(() -> new ResourceNotFoundException("Usuario autenticado nao encontrado"));
    }
}
