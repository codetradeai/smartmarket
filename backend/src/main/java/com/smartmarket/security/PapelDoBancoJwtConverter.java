package com.smartmarket.security;

import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Converte o JWT ja validado (assinatura e expiracao) em autenticacao, resolvendo o papel no
 * banco a cada requisicao em vez de confiar na claim "papel" gravada no login.
 *
 * <p>Assim, rebaixar (ou promover) um usuario vale na hora, sem esperar o token expirar, e um
 * token de usuario apagado deixa de funcionar (401). Custo: uma consulta por chave unica
 * (email) em cada requisicao autenticada.
 */
@Component
@RequiredArgsConstructor
public class PapelDoBancoJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UsuarioRepository usuarioRepository;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String email = jwt.getSubject();
        Usuario usuario = email == null ? null : usuarioRepository.findByEmail(email).orElse(null);
        if (usuario == null) {
            throw new InvalidBearerTokenException("Usuario do token nao existe mais");
        }
        List<GrantedAuthority> autoridades =
            List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getPapel().name()));
        return new JwtAuthenticationToken(jwt, autoridades, email);
    }
}
