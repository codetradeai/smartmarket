package com.smartmarket.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/** Limite de 30 requisicoes por minuto, por IP de conexao, em GET /api/lojas/filiais. */
class LimiteFiliaisFilterTest {

    private static final int LIMITE = 30;
    private static final String CAMINHO = "/api/lojas/filiais";

    /** Relogio que o teste avanca na mao. */
    private static final class RelogioMutavel extends Clock {
        private Instant agora = Instant.parse("2026-11-14T12:00:00Z");

        void avancar(Duration d) {
            agora = agora.plus(d);
        }

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return agora; }
    }

    private RelogioMutavel relogio;
    private LimiteFiliaisFilter filtro;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        relogio = new RelogioMutavel();
        filtro = new LimiteFiliaisFilter(relogio);
        ReflectionTestUtils.setField(filtro, "enabled", true);
        chain = mock(FilterChain.class);
    }

    private MockHttpServletRequest requisicao(String metodo, String uri, String ip) {
        MockHttpServletRequest request = new MockHttpServletRequest(metodo, uri);
        request.setRemoteAddr(ip);
        return request;
    }

    private MockHttpServletResponse executar(MockHttpServletRequest request) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filtro.doFilter(request, response, chain);
        return response;
    }

    private void chamar(int vezes, String ip) throws Exception {
        for (int i = 0; i < vezes; i++) {
            executar(requisicao("GET", CAMINHO, ip));
        }
    }

    @Test
    void asTrintaPrimeirasPassamEATrintaEUmaRecebe429ComJsonERetryAfter() throws Exception {
        chamar(LIMITE, "10.0.0.1");
        verify(chain, times(LIMITE)).doFilter(any(), any());

        MockHttpServletResponse bloqueada = executar(requisicao("GET", CAMINHO, "10.0.0.1"));

        assertThat(bloqueada.getStatus()).isEqualTo(429);
        assertThat(bloqueada.getContentType()).startsWith("application/json");
        assertThat(bloqueada.getContentAsString()).contains("erro");
        assertThat(bloqueada.getHeader("Retry-After")).isEqualTo("60");
        verify(chain, times(LIMITE)).doFilter(any(), any());
    }

    @Test
    void doisIpsDiferentesNaoCompartilhamContador() throws Exception {
        chamar(LIMITE + 1, "10.0.0.1");

        MockHttpServletResponse outro = executar(requisicao("GET", CAMINHO, "10.0.0.2"));

        assertThat(outro.getStatus()).isEqualTo(200);
        verify(chain, times(LIMITE + 1)).doFilter(any(), any());
    }

    @Test
    void xForwardedForEnviadoPeloClienteNaoMudaAChave() throws Exception {
        for (int i = 0; i < LIMITE; i++) {
            MockHttpServletRequest r = requisicao("GET", CAMINHO, "10.0.0.1");
            r.addHeader("X-Forwarded-For", "203.0.113." + i);
            executar(r);
        }
        MockHttpServletRequest forjada = requisicao("GET", CAMINHO, "10.0.0.1");
        forjada.addHeader("X-Forwarded-For", "198.51.100.77");

        assertThat(executar(forjada).getStatus()).isEqualTo(429);
    }

    @Test
    void depoisDeSessentaSegundosAJanelaReinicia() throws Exception {
        chamar(LIMITE + 1, "10.0.0.1");

        relogio.avancar(Duration.ofSeconds(61));

        assertThat(executar(requisicao("GET", CAMINHO, "10.0.0.1")).getStatus()).isEqualTo(200);
    }

    @Test
    void soContaGetEmApiLojasFiliais() throws Exception {
        for (int i = 0; i < LIMITE * 2; i++) {
            executar(requisicao("GET", "/api/lojas/proximas", "10.0.0.1"));
            executar(requisicao("POST", "/api/auth/login", "10.0.0.1"));
            executar(requisicao("POST", CAMINHO, "10.0.0.1"));
            executar(requisicao("GET", "/api/lojas/filiais/outra", "10.0.0.1"));
        }

        verify(chain, times(LIMITE * 2 * 4)).doFilter(any(), any());
        assertThat(executar(requisicao("GET", CAMINHO, "10.0.0.1")).getStatus()).isEqualTo(200);
    }

    @Test
    void desligadoPelaPropriedadeNaoLimita() throws Exception {
        ReflectionTestUtils.setField(filtro, "enabled", false);

        chamar(LIMITE * 2, "10.0.0.1");

        verify(chain, times(LIMITE * 2)).doFilter(any(), any());
    }

    // --- Memoria do mapa de contadores: sem crescimento ilimitado ---

    @Test
    void entradasComAJanelaVencidaSaemDoMapaSemEsperarOTeto() throws Exception {
        for (int i = 0; i < 50; i++) {
            executar(requisicao("GET", CAMINHO, "10.1.0." + i));
        }
        assertThat(filtro.contadoresAtivos()).isEqualTo(50);

        relogio.avancar(Duration.ofSeconds(61));
        executar(requisicao("GET", CAMINHO, "10.9.9.9"));

        assertThat(filtro.contadoresAtivos()).isEqualTo(1);
    }

    @Test
    void aLimpezaNaoApagaContadorDeJanelaAindaValida() throws Exception {
        chamar(LIMITE, "10.0.0.1");
        relogio.avancar(Duration.ofSeconds(30));
        executar(requisicao("GET", CAMINHO, "10.0.0.2"));
        relogio.avancar(Duration.ofSeconds(31)); // a do .1 venceu; a do .2 ainda vale
        executar(requisicao("GET", CAMINHO, "10.0.0.3"));

        assertThat(filtro.contadoresAtivos()).isEqualTo(2);
    }

    @Test
    void noTetoDeDezMilEntradasOMapaEsvaziaEOsContadoresReiniciam() throws Exception {
        chamar(LIMITE, "10.0.0.1"); // o .1 esta no limite
        for (int i = 0; i < LimiteFiliaisFilter.TETO_DE_ENTRADAS; i++) {
            executar(requisicao("GET", CAMINHO, "172.16." + (i / 250) + "." + (i % 250)));
        }

        assertThat(filtro.contadoresAtivos()).isLessThanOrEqualTo(LimiteFiliaisFilter.TETO_DE_ENTRADAS);
        // O esvaziamento reiniciou os contadores: o .1, que estava no limite, volta a passar (falha aberta).
        assertThat(executar(requisicao("GET", CAMINHO, "10.0.0.1")).getStatus()).isEqualTo(200);
    }
}
