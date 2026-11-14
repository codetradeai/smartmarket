package com.smartmarket.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limite de requisições do endpoint público {@code GET /api/lojas/filiais}: 30 por minuto por IP.
 * Filtro à parte do {@link RateLimitingFilter} (que cuida só do login e do cadastro).
 *
 * <p>O IP é o {@code getRemoteAddr()} da conexão, a mesma regra do filtro de autenticação:
 * {@code X-Forwarded-For} enviado pelo cliente não conta. Atrás do proxy do Render, o IP real só chega
 * se o Tomcat considerar o proxy "interno" ({@code server.forward-headers-strategy=native}); se não
 * considerar, os clientes passam a dividir um único contador.
 */
@Slf4j
@Component
public class LimiteFiliaisFilter extends OncePerRequestFilter {

    static final int MAXIMO_POR_MINUTO = 30;
    static final long JANELA_MS = 60_000L;
    private static final String CAMINHO = "/api/lojas/filiais";

    @Value("${security.rate-limit.enabled:true}")
    private boolean enabled;

    private static final class Contador {
        final long inicioMs;
        int total;

        Contador(long inicioMs) {
            this.inicioMs = inicioMs;
            this.total = 1;
        }
    }

    private final Clock clock;
    private final Map<String, Contador> contadores = new ConcurrentHashMap<>();

    @Autowired
    public LimiteFiliaisFilter() {
        this(Clock.systemUTC());
    }

    LimiteFiliaisFilter(Clock clock) {
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!enabled) {
            return true;
        }
        return !("GET".equalsIgnoreCase(request.getMethod()) && CAMINHO.equals(request.getRequestURI()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long agora = clock.millis();
        String ip = request.getRemoteAddr();

        Contador contador = contadores.compute(ip, (chave, atual) -> {
            if (atual == null || agora - atual.inicioMs >= JANELA_MS) {
                return new Contador(agora);
            }
            atual.total++;
            return atual;
        });

        if (contador.total > MAXIMO_POR_MINUTO) {
            long restanteMs = Math.max(1, JANELA_MS - (agora - contador.inicioMs));
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf((restanteMs + 999) / 1000));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"erro\":\"Muitas requisicoes. Aguarde um minuto e tente de novo.\"}");
            return;
        }

        chain.doFilter(request, response);
    }
}
