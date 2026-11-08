package com.smartmarket.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
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

    @Test
    void deveRecusarSegredoCurtoComMensagemClara() {
        // 31 bytes: um a menos que o minimo exigido pelo HS256 (256 bits).
        String curto = "a".repeat(31);

        assertThatThrownBy(() -> new JwtTokenProvider(curto, 86400000L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("SMARTMARKET_JWT_SECRET")
            .hasMessageContaining("32 bytes");
    }

    @Test
    void deveContarBytesEmUtf8NaoCaracteres() {
        // 16 caracteres com acento = 32 bytes em UTF-8: atinge o minimo.
        assertThatCode(() -> new JwtTokenProvider("\u00e9".repeat(16), 86400000L)).doesNotThrowAnyException();
        // 15 caracteres com acento = 30 bytes: abaixo do minimo.
        assertThatThrownBy(() -> new JwtTokenProvider("\u00e9".repeat(15), 86400000L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("32 bytes");
    }

    @Test
    void deveAceitarSegredoComExatamente32Bytes() {
        assertThatCode(() -> new JwtTokenProvider("a".repeat(32), 86400000L)).doesNotThrowAnyException();
    }

    @Test
    void deveRecusarOPlaceholderDoEnvExample() {
        // Valor literal de .env.example: 48 caracteres, mas publico no repositorio.
        String placeholder = "gere-um-segredo-novo-com-openssl-rand-base64-48";

        assertThatThrownBy(() -> new JwtTokenProvider(placeholder, 86400000L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("SMARTMARKET_JWT_SECRET")
            .hasMessageContaining("exemplo");
    }
}
