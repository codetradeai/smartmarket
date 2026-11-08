package com.smartmarket.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.smartmarket.model.Usuario;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;

@Slf4j
@Component
public class JwtTokenProvider {

    static final int SEGREDO_TAMANHO_MINIMO_BYTES = 32;
    // Inicio do valor de exemplo em .env.example (gere-um-segredo-novo-com-openssl-rand-base64-48).
    private static final String PREFIXO_SEGREDO_EXEMPLO = "gere-um-segredo";

    private final JwtEncoder jwtEncoder;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration:86400000}") long expirationMs) {
        validarSegredo(secret);
        this.expirationMs = expirationMs;
        SecretKey key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        this.jwtEncoder = NimbusJwtEncoder.withSecretKey(key)
            .algorithm(MacAlgorithm.HS256)
            .build();
    }

    /**
     * Recusa, na inicializacao, um segredo ausente, curto demais para o HS256 ou igual ao valor de
     * exemplo de .env.example (publico no repositorio, qualquer pessoa forjaria um token ADMIN).
     */
    static void validarSegredo(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                "SMARTMARKET_JWT_SECRET nao definido. " +
                "Defina a variavel de ambiente antes de iniciar a aplicacao.");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < SEGREDO_TAMANHO_MINIMO_BYTES) {
            throw new IllegalStateException(
                "SMARTMARKET_JWT_SECRET muito curto: o HS256 exige no minimo " +
                SEGREDO_TAMANHO_MINIMO_BYTES + " bytes. Gere um com: openssl rand -base64 48");
        }
        if (secret.trim().toLowerCase(Locale.ROOT).startsWith(PREFIXO_SEGREDO_EXEMPLO)) {
            throw new IllegalStateException(
                "SMARTMARKET_JWT_SECRET esta com o valor de exemplo de .env.example, que e publico. " +
                "Gere um segredo proprio com: openssl rand -base64 48");
        }
    }

    public String generateToken(Usuario usuario) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(expirationMs);

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("smartmarket")
            .issuedAt(now)
            .expiresAt(expiry)
            .subject(usuario.getEmail())
            .claim("nome", usuario.getNome())
            .claim("papel", usuario.getPapel().name())
            .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
