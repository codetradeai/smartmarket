package com.smartmarket.service;

import com.smartmarket.dto.auth.AuthResponse;
import com.smartmarket.dto.auth.LoginRequest;
import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import com.smartmarket.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setNome("Teste Usuario");
        registerRequest.setEmail("teste@email.com");
        registerRequest.setSenha("senha123");

        loginRequest = new LoginRequest();
        loginRequest.setEmail("teste@email.com");
        loginRequest.setSenha("senha123");

        usuario = Usuario.builder()
            .id(1L)
            .nome("Teste Usuario")
            .email("teste@email.com")
            .senha("$2a$10$hash")
            .papel(Papel.USER)
            .build();
    }

    @Test
    void register_DeveCriarUsuarioERetornarToken() {
        when(usuarioRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$hash");
        when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuario);
        when(jwtTokenProvider.generateToken(any(Usuario.class))).thenReturn("jwt-token");

        AuthResponse response = authService.register(registerRequest);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getTipo()).isEqualTo("Bearer");
        assertThat(response.getEmail()).isEqualTo("teste@email.com");
        assertThat(response.getPapel()).isEqualTo("USER");
        verify(usuarioRepository).save(any(Usuario.class));
    }

    @Test
    void register_DeveFalharQuandoEmailJaExiste() {
        when(usuarioRepository.existsByEmail("teste@email.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerRequest))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Email ja cadastrado");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void login_DeveRetornarTokenQuandoCredenciaisValidas() {
        when(usuarioRepository.findByEmail("teste@email.com"))
            .thenReturn(java.util.Optional.of(usuario));
        when(jwtTokenProvider.generateToken(any(Usuario.class))).thenReturn("jwt-token");

        AuthResponse response = authService.login(loginRequest);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getTipo()).isEqualTo("Bearer");
        verify(authenticationManager).authenticate(any());
    }
}
