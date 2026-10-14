package com.smartmarket.controller;

import com.smartmarket.dto.auth.AuthResponse;
import com.smartmarket.dto.auth.LoginRequest;
import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import com.smartmarket.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UsuarioRepository usuarioRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal Jwt jwt) {
        Usuario usuario = usuarioRepository.findByEmail(jwt.getSubject())
            .orElseThrow(() -> new RuntimeException("Usuario nao encontrado"));

        return ResponseEntity.ok(Map.of(
            "id", usuario.getId(),
            "nome", usuario.getNome(),
            "email", usuario.getEmail(),
            "papel", usuario.getPapel().name()
        ));
    }
}
