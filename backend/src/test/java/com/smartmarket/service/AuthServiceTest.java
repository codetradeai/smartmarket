package com.smartmarket.service;

import com.smartmarket.dto.auth.AuthResponse;
import com.smartmarket.dto.auth.LoginRequest;
import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import com.smartmarket.security.JwtTokenProvider;
import com.smartmarket.service.geo.LocalizacaoCep;
import com.smartmarket.service.geo.ResolvedorCep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

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

    @Mock
    private ResolvedorCep resolvedorCep;

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
        registerRequest.setCep("90010-000");

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
        when(usuarioRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
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
    void register_DeveGravarCepSemHifenELocalizacaoResolvida() {
        when(resolvedorCep.resolver("90010000"))
            .thenReturn(Optional.of(new LocalizacaoCep("Porto Alegre", "RS", -30.03, -51.23)));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(any(Usuario.class))).thenReturn("jwt-token");

        authService.register(registerRequest);

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        Usuario gravado = captor.getValue();
        assertThat(gravado.getCep()).isEqualTo("90010000");
        assertThat(gravado.getCidade()).isEqualTo("Porto Alegre");
        assertThat(gravado.getUf()).isEqualTo("RS");
        assertThat(gravado.getLatitude()).isEqualTo(-30.03);
        assertThat(gravado.getLongitude()).isEqualTo(-51.23);
    }

    @Test
    void register_CepNaoEncontradoCadastraComLocalizacaoNaoResolvida() {
        when(resolvedorCep.resolver("90010000")).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(any(Usuario.class))).thenReturn("jwt-token");

        AuthResponse response = authService.register(registerRequest);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        Usuario gravado = captor.getValue();
        assertThat(gravado.getCep()).isEqualTo("90010000");
        assertThat(gravado.getCidade()).isNull();
        assertThat(gravado.getUf()).isNull();
        assertThat(gravado.getLatitude()).isNull();
        assertThat(gravado.getLongitude()).isNull();
    }

    @Test
    void register_DeveFalharQuandoEmailJaExiste() {
        when(usuarioRepository.existsByEmailIgnoreCase("teste@email.com")).thenReturn(true);

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

    @Test
    void login_DevePropagarFalhaQuandoCredenciaisInvalidas() {
        when(authenticationManager.authenticate(any()))
            .thenThrow(new BadCredentialsException("Credenciais invalidas"));

        assertThatThrownBy(() -> authService.login(loginRequest))
            .isInstanceOf(BadCredentialsException.class);

        verifyNoInteractions(usuarioRepository, jwtTokenProvider);
    }

    @Test
    void login_DeveFalharQuandoUsuarioNaoExisteNoRepositorio() {
        when(usuarioRepository.findByEmail("teste@email.com")).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> authService.login(loginRequest))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Usuario nao encontrado");

        verify(jwtTokenProvider, never()).generateToken(any());
    }

    @Test
    void register_DeveCodificarSenhaEAtribuirPapelUser() {
        when(usuarioRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(passwordEncoder.encode("senha123")).thenReturn("hash-gerado");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(any(Usuario.class))).thenReturn("jwt-token");

        authService.register(registerRequest);

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        assertThat(captor.getValue().getSenha()).isEqualTo("hash-gerado");
        assertThat(captor.getValue().getPapel()).isEqualTo(Papel.USER);
    }

    @Test
    void register_DeveNormalizarEmailComTrimEMinusculas() {
        registerRequest.setEmail("  Maria.Silva@Email.COM ");
        when(usuarioRepository.existsByEmailIgnoreCase("maria.silva@email.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(any(Usuario.class))).thenReturn("jwt-token");

        AuthResponse response = authService.register(registerRequest);

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("maria.silva@email.com");
        assertThat(response.getEmail()).isEqualTo("maria.silva@email.com");
    }

    @Test
    void register_DeveRecusarEmailQueSoDifereNaCaixa() {
        registerRequest.setEmail("MARIA@email.com");
        when(usuarioRepository.existsByEmailIgnoreCase("maria@email.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerRequest))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Email ja cadastrado");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void login_DeveAceitarEmailComCaixaDiferenteDaCadastrada() {
        // Conta antiga, gravada antes da normalizacao, com maiusculas no e-mail.
        Usuario legado = Usuario.builder().id(7L).nome("Legado").email("Legado@Email.com")
            .senha("hash").papel(Papel.USER).build();
        loginRequest.setEmail("  legado@email.com ");
        when(usuarioRepository.findByEmail("legado@email.com")).thenReturn(java.util.Optional.empty());
        when(usuarioRepository.findFirstByEmailIgnoreCaseOrderByIdAsc("legado@email.com"))
            .thenReturn(java.util.Optional.of(legado));
        when(jwtTokenProvider.generateToken(legado)).thenReturn("jwt-token");

        AuthResponse response = authService.login(loginRequest);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getEmail()).isEqualTo("Legado@Email.com");
        ArgumentCaptor<org.springframework.security.core.Authentication> captor =
            ArgumentCaptor.forClass(org.springframework.security.core.Authentication.class);
        verify(authenticationManager).authenticate(captor.capture());
        assertThat(captor.getValue().getPrincipal()).isEqualTo("legado@email.com");
    }
}
