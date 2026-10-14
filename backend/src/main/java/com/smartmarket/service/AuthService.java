package com.smartmarket.service;

import com.smartmarket.dto.auth.AuthResponse;
import com.smartmarket.dto.auth.LoginRequest;
import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import com.smartmarket.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email ja cadastrado");
        }

        Usuario usuario = Usuario.builder()
            .nome(request.getNome())
            .email(request.getEmail())
            .senha(passwordEncoder.encode(request.getSenha()))
            .papel(Papel.USER)
            .build();

        usuario = usuarioRepository.save(usuario);

        String token = jwtTokenProvider.generateToken(usuario);

        return AuthResponse.builder()
            .token(token)
            .tipo("Bearer")
            .id(usuario.getId())
            .nome(usuario.getNome())
            .email(usuario.getEmail())
            .papel(usuario.getPapel().name())
            .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getSenha())
        );

        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado"));

        String token = jwtTokenProvider.generateToken(usuario);

        return AuthResponse.builder()
            .token(token)
            .tipo("Bearer")
            .id(usuario.getId())
            .nome(usuario.getNome())
            .email(usuario.getEmail())
            .papel(usuario.getPapel().name())
            .build();
    }
}
