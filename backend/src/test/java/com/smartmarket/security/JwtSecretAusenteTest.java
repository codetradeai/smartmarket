package com.smartmarket.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifica que JwtTokenProvider recusa secret vazio ou nulo (representando
 * SMARTMARKET_JWT_SECRET ausente), impedindo assim a subida da aplicacao.
 * Mutacao: remova a validacao em JwtTokenProvider e estes testes devem falhar.
 */
class JwtSecretAusenteTest {

    @Test
    void deveRecusarSecretVazio() {
        assertThatThrownBy(() -> new JwtTokenProvider("", 86400000L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("SMARTMARKET_JWT_SECRET");
    }

    @Test
    void deveRecusarSecretNulo() {
        assertThatThrownBy(() -> new JwtTokenProvider(null, 86400000L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("SMARTMARKET_JWT_SECRET");
    }

    @Test
    void deveRecusarSecretApenasEspacos() {
        assertThatThrownBy(() -> new JwtTokenProvider("   ", 86400000L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("SMARTMARKET_JWT_SECRET");
    }
}
