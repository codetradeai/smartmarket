package com.smartmarket.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * O resolver ignora o cabecalho Authorization SO em GET /api/lojas/filiais (endpoint publico: um token velho
 * de visitante nao pode derrubar a rota). Em qualquer outro metodo ou caminho, resolve como o padrao.
 */
class BearerTokenResolverFiliaisTest {

    private final BearerTokenResolverFiliais resolver = new BearerTokenResolverFiliais();

    private MockHttpServletRequest requisicao(String metodo, String uri, String autorizacao) {
        MockHttpServletRequest request = new MockHttpServletRequest(metodo, uri);
        if (autorizacao != null) {
            request.addHeader("Authorization", autorizacao);
        }
        return request;
    }

    @Test
    void getNoCaminhoExatoIgnoraOTokenMesmoComCabecalho() {
        assertThat(resolver.resolve(requisicao("GET", "/api/lojas/filiais", "Bearer token-velho"))).isNull();
    }

    @Test
    void outroCaminhoResolveOTokenNormalmente() {
        assertThat(resolver.resolve(requisicao("GET", "/api/lojas/proximas", "Bearer abc"))).isEqualTo("abc");
        assertThat(resolver.resolve(requisicao("GET", "/api/favoritos", "Bearer xyz"))).isEqualTo("xyz");
    }

    @Test
    void outroMetodoNoMesmoCaminhoResolveOTokenNormalmente() {
        assertThat(resolver.resolve(requisicao("POST", "/api/lojas/filiais", "Bearer abc"))).isEqualTo("abc");
    }

    @Test
    void subCaminhoDoEndpointNaoEPublicoEResolveOToken() {
        assertThat(resolver.resolve(requisicao("GET", "/api/lojas/filiais/outra", "Bearer abc"))).isEqualTo("abc");
    }

    @Test
    void semCabecalhoNaoHaTokenEmLugarNenhum() {
        assertThat(resolver.resolve(requisicao("GET", "/api/lojas/proximas", null))).isNull();
        assertThat(resolver.resolve(requisicao("GET", "/api/lojas/filiais", null))).isNull();
    }
}
