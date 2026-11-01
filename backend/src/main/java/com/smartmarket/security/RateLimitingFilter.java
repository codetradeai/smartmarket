package com.smartmarket.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Filtro de Rate Limiting em memória para proteção contra ataques de força bruta
 * em endpoints sensíveis de autenticação (/api/auth/login e /api/auth/register).
 *
 * Limite: 10 requisições por minuto por endereço IP cliente.
 */
@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_MINUTE = 15;
    private static final long ONE_MINUTE_MS = 60_000L;

    @org.springframework.beans.factory.annotation.Value("${security.rate-limit.enabled:true}")
    private boolean enabled;

    private static class RequestCounter {
        final long windowStartMs;
        final AtomicInteger count;

        RequestCounter(long windowStartMs) {
            this.windowStartMs = windowStartMs;
            this.count = new AtomicInteger(1);
        }
    }

    private final Map<String, RequestCounter> requestCountsPerIp = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!enabled) {
            return true;
        }
        String path = request.getRequestURI();
        // Aplica apenas para rotas POST sensíveis de autenticação
        return !("POST".equalsIgnoreCase(request.getMethod()) &&
                (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register")));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String clientIp = extractClientIp(request);
        long now = System.currentTimeMillis();

        RequestCounter counter = requestCountsPerIp.compute(clientIp, (ip, existingCounter) -> {
            if (existingCounter == null || (now - existingCounter.windowStartMs) > ONE_MINUTE_MS) {
                return new RequestCounter(now);
            }
            existingCounter.count.incrementAndGet();
            return existingCounter;
        });

        if (counter.count.get() > MAX_REQUESTS_PER_MINUTE) {
            log.warn("Rate limit excedido para IP: {} no endpoint: {}", clientIp, request.getRequestURI());
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"erro\":\"Muitas tentativas de autenticacao. Por favor, aguarde 1 minuto.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
