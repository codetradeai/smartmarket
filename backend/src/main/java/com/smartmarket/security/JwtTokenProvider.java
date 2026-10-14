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
import java.time.Instant;

@Slf4j
@Component
public class JwtTokenProvider {

    private final JwtEncoder jwtEncoder;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration:86400000}") long expirationMs) {
        this.expirationMs = expirationMs;
        SecretKey key = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
        this.jwtEncoder = NimbusJwtEncoder.withSecretKey(key)
            .algorithm(MacAlgorithm.HS256)
            .build();
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
