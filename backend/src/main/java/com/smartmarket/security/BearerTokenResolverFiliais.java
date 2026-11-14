package com.smartmarket.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;

/**
 * Resolve o token Bearer como o padrão do Spring, com uma única exceção: em {@code GET /api/lojas/filiais}
 * (caminho exato) o cabeçalho {@code Authorization} é ignorado.
 *
 * <p>Sem isso, o filtro do resource server valida qualquer Bearer que chegue, mesmo em rota pública, e um
 * visitante com um token velho no navegador receberia 401 numa lista que não exige login. Nenhuma outra
 * rota é afetada: {@code /api/lojas/proximas} e as demais continuam rejeitando token inválido com 401.
 */
public class BearerTokenResolverFiliais implements BearerTokenResolver {

    private static final String CAMINHO_PUBLICO = "/api/lojas/filiais";

    private final BearerTokenResolver padrao = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        if ("GET".equalsIgnoreCase(request.getMethod()) && CAMINHO_PUBLICO.equals(request.getRequestURI())) {
            return null;
        }
        return padrao.resolve(request);
    }
}
