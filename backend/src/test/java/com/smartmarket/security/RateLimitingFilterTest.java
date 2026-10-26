package com.smartmarket.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Constructor;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class RateLimitingFilterTest {

    // Valor real do filtro: MAX_REQUESTS_PER_MINUTE
    private static final int LIMITE = 15;

    private RateLimitingFilter filtro;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        filtro = new RateLimitingFilter();
        ReflectionTestUtils.setField(filtro, "enabled", true);
        chain = mock(FilterChain.class);
    }

    private MockHttpServletRequest post(String uri, String ip) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
        request.setRemoteAddr(ip);
        return request;
    }

    private MockHttpServletResponse executar(MockHttpServletRequest request) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filtro.doFilter(request, response, chain);
        return response;
    }

    @Test
    void devePermitirRequisicoesAteOLimite() throws Exception {
        for (int i = 0; i < LIMITE; i++) {
            assertThat(executar(post("/api/auth/login", "10.0.0.1")).getStatus()).isEqualTo(200);
        }

        verify(chain, times(LIMITE)).doFilter(any(), any());
    }

    @Test
    void deveBloquearRequisicaoQueExcedeOLimite() throws Exception {
        for (int i = 0; i < LIMITE; i++) {
            executar(post("/api/auth/login", "10.0.0.1"));
        }

        MockHttpServletResponse bloqueada = executar(post("/api/auth/login", "10.0.0.1"));

        assertThat(bloqueada.getStatus()).isEqualTo(429);
        assertThat(bloqueada.getContentType()).startsWith("application/json");
        assertThat(bloqueada.getContentAsString()).contains("Muitas tentativas de autenticacao");
        verify(chain, times(LIMITE)).doFilter(any(), any());
    }

    @Test
    void deveContarLoginERegistroNoMesmoLimitePorIp() throws Exception {
        for (int i = 0; i < LIMITE; i++) {
            executar(post(i % 2 == 0 ? "/api/auth/login" : "/api/auth/register", "10.0.0.1"));
        }

        assertThat(executar(post("/api/auth/register", "10.0.0.1")).getStatus()).isEqualTo(429);
    }

    @Test
    void deveManterContadoresIndependentesPorIp() throws Exception {
        for (int i = 0; i < LIMITE; i++) {
            executar(post("/api/auth/login", "10.0.0.1"));
        }

        assertThat(executar(post("/api/auth/login", "10.0.0.1")).getStatus()).isEqualTo(429);
        assertThat(executar(post("/api/auth/login", "10.0.0.2")).getStatus()).isEqualTo(200);
    }

    @Test
    void devePriorizarXForwardedForUsandoPrimeiroEndereco() throws Exception {
        for (int i = 0; i < LIMITE; i++) {
            MockHttpServletRequest request = post("/api/auth/login", "192.168.0.1");
            request.addHeader("X-Forwarded-For", " 203.0.113.9 , 10.1.1.1");
            executar(request);
        }

        MockHttpServletRequest mesmoClienteOutroProxy = post("/api/auth/login", "192.168.0.2");
        mesmoClienteOutroProxy.addHeader("X-Forwarded-For", "203.0.113.9");

        assertThat(executar(mesmoClienteOutroProxy).getStatus()).isEqualTo(429);
    }

    @Test
    void deveUsarXRealIpQuandoNaoHaXForwardedFor() throws Exception {
        for (int i = 0; i < LIMITE; i++) {
            MockHttpServletRequest request = post("/api/auth/login", "192.168.0.1");
            request.addHeader("X-Real-IP", " 203.0.113.7 ");
            executar(request);
        }

        MockHttpServletRequest request = post("/api/auth/login", "192.168.0.99");
        request.addHeader("X-Real-IP", "203.0.113.7");

        assertThat(executar(request).getStatus()).isEqualTo(429);
    }

    @Test
    void deveIgnorarCabecalhosEmBrancoEUsarEnderecoRemoto() throws Exception {
        for (int i = 0; i < LIMITE; i++) {
            MockHttpServletRequest request = post("/api/auth/login", "10.0.0.5");
            request.addHeader("X-Forwarded-For", "  ");
            request.addHeader("X-Real-IP", " ");
            executar(request);
        }

        assertThat(executar(post("/api/auth/login", "10.0.0.5")).getStatus()).isEqualTo(429);
    }

    @Test
    void deveReiniciarContadorQuandoAJanelaDeUmMinutoExpirou() throws Exception {
        for (int i = 0; i < LIMITE; i++) {
            executar(post("/api/auth/login", "10.0.0.1"));
        }
        assertThat(executar(post("/api/auth/login", "10.0.0.1")).getStatus()).isEqualTo(429);

        envelhecerContador("10.0.0.1", 61_000L);

        assertThat(executar(post("/api/auth/login", "10.0.0.1")).getStatus()).isEqualTo(200);
    }

    @Test
    void naoDeveFiltrarMetodoDiferenteDePost() throws Exception {
        for (int i = 0; i < LIMITE + 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/login");
            request.setRemoteAddr("10.0.0.1");
            assertThat(executar(request).getStatus()).isEqualTo(200);
        }
    }

    @Test
    void naoDeveFiltrarRotasQueNaoSaoDeAutenticacao() throws Exception {
        for (int i = 0; i < LIMITE + 5; i++) {
            assertThat(executar(post("/api/produtos", "10.0.0.1")).getStatus()).isEqualTo(200);
        }
    }

    @Test
    void naoDeveLimitarQuandoDesabilitado() throws Exception {
        ReflectionTestUtils.setField(filtro, "enabled", false);

        for (int i = 0; i < LIMITE + 5; i++) {
            assertThat(executar(post("/api/auth/login", "10.0.0.1")).getStatus()).isEqualTo(200);
        }
        verify(chain, times(LIMITE + 5)).doFilter(any(), any());
    }

    /** Recua o inicio da janela do contador do IP, simulando a passagem do tempo sem sleep. */
    @SuppressWarnings("unchecked")
    private void envelhecerContador(String ip, long milissegundos) throws Exception {
        Map<String, Object> contadores = (Map<String, Object>) ReflectionTestUtils.getField(filtro, "requestCountsPerIp");
        Class<?> tipo = Class.forName("com.smartmarket.security.RateLimitingFilter$RequestCounter");
        Constructor<?> construtor = tipo.getDeclaredConstructor(long.class);
        construtor.setAccessible(true);
        contadores.put(ip, construtor.newInstance(System.currentTimeMillis() - milissegundos));
    }
}
