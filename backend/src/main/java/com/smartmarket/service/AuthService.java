package com.smartmarket.service;

import com.smartmarket.dto.auth.AuthResponse;
import com.smartmarket.dto.auth.LoginRequest;
import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import com.smartmarket.security.JwtTokenProvider;
import com.smartmarket.service.geo.Cep;
import com.smartmarket.service.geo.LocalizacaoCep;
import com.smartmarket.service.geo.ResolvedorCep;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final ResolvedorCep resolvedorCep;

    public AuthResponse register(RegisterRequest request) {
        // E-mail e identidade da conta: grava sempre sem espacos nas pontas e em minusculas, e
        // trata "Maria@x.com" e "maria@x.com" como a mesma conta.
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email ja cadastrado");
        }

        // Localizacao: consulta externa com teto de 2 s. Falha, timeout ou CEP desconhecido nunca
        // barram o cadastro: a conta nasce com o CEP e a localizacao "nao resolvida" (campos nulos).
        // A consulta roda fora de transacao, antes de gravar.
        String cep = Cep.normalizar(request.getCep());
        LocalizacaoCep local = resolvedorCep.resolver(cep).orElse(null);

        Usuario usuario = Usuario.builder()
            .nome(request.getNome())
            .email(email)
            .senha(passwordEncoder.encode(request.getSenha()))
            .papel(Papel.USER)
            .cep(cep)
            .cidade(local == null ? null : local.cidade())
            .uf(local == null ? null : local.uf())
            .latitude(local == null ? null : local.latitude())
            .longitude(local == null ? null : local.longitude())
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
        // No login so tira os espacos: a busca ignora a caixa (primeiro o e-mail exato, depois sem
        // diferenciar maiusculas) para continuar valendo para contas antigas gravadas com maiusculas.
        String email = request.getEmail().trim();
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(email, request.getSenha())
        );

        Usuario usuario = usuarioRepository.findByEmail(email)
            .or(() -> usuarioRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(email))
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
