package com.smartmarket.service.geo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * Descobre cidade, UF e coordenadas de um CEP em serviço externo: BrasilAPI v2 primeiro, ViaCEP de
 * reserva (o ViaCEP não devolve coordenadas). Foi feito para <b>nunca</b> atrapalhar quem o chama:
 * o tempo total da consulta (os dois serviços somados) é limitado por smartmarket.cep.timeout-ms
 * (2 s por padrão) e qualquer falha, timeout ou resposta estranha vira {@link Optional#empty()}.
 * "Não encontrado" nos dois serviços também é vazio: o chamador trata como localização não resolvida.
 */
@Component
public class ResolvedorCep {

    private static final Logger log = LoggerFactory.getLogger(ResolvedorCep.class);

    private final RestClient brasilApi;
    private final RestClient viaCep;
    private final long timeoutMs;
    // Roda a consulta numa thread à parte para poder dar um teto ao tempo total. Pool limitado
    // (threads e fila), para um pico de cadastros ou um serviço externo preso não criar threads
    // sem limite; daemon para não segurar o desligamento da aplicação.
    private final ExecutorService executor;

    public ResolvedorCep(
        @Value("${smartmarket.cep.brasilapi-url:https://brasilapi.com.br/api/cep/v2}") String brasilApiUrl,
        @Value("${smartmarket.cep.viacep-url:https://viacep.com.br/ws}") String viaCepUrl,
        @Value("${smartmarket.cep.timeout-ms:2000}") long timeoutMs,
        @Value("${smartmarket.cep.max-concorrentes:4}") int maxConcorrentes,
        @Value("${smartmarket.cep.fila-maxima:16}") int filaMaxima) {
        this.timeoutMs = timeoutMs;
        BlockingQueue<Runnable> fila = filaMaxima > 0 ? new ArrayBlockingQueue<>(filaMaxima) : new SynchronousQueue<>();
        ThreadPoolExecutor pool = new ThreadPoolExecutor(maxConcorrentes, maxConcorrentes, 30, TimeUnit.SECONDS, fila, r -> {
            Thread t = new Thread(r, "resolvedor-cep");
            t.setDaemon(true);
            return t;
        });
        pool.allowCoreThreadTimeOut(true); // sem consultas, as threads ociosas somem
        this.executor = pool;
        JdkClientHttpRequestFactory fabrica = new JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(Duration.ofMillis(timeoutMs)).build());
        fabrica.setReadTimeout(Duration.ofMillis(timeoutMs));
        this.brasilApi = RestClient.builder().baseUrl(brasilApiUrl).requestFactory(fabrica).build();
        this.viaCep = RestClient.builder().baseUrl(viaCepUrl).requestFactory(fabrica).build();
    }

    /** @param cep 8 dígitos, sem hífen. Nunca lança: falha vira {@code Optional.empty()}. */
    public Optional<LocalizacaoCep> resolver(String cep) {
        Future<Optional<LocalizacaoCep>> tarefa;
        try {
            tarefa = executor.submit(() -> consultar(cep));
        } catch (RejectedExecutionException e) {
            // Threads e fila cheias: segue sem localização em vez de acumular consultas.
            log.warn("Consulta de CEP descartada: limite de consultas simultaneas atingido");
            return Optional.empty();
        }
        try {
            return tarefa.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            tarefa.cancel(true);
            return Optional.empty();
        } catch (Exception e) {
            // Estourou o teto total ou erro inesperado: cancela e segue sem localização.
            tarefa.cancel(true);
            log.warn("Consulta de CEP sem resultado ({})", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private Optional<LocalizacaoCep> consultar(String cep) {
        Optional<LocalizacaoCep> resposta = consultarBrasilApi(cep);
        if (resposta.isPresent()) {
            return resposta;
        }
        return consultarViaCep(cep);
    }

    @SuppressWarnings("unchecked")
    private Optional<LocalizacaoCep> consultarBrasilApi(String cep) {
        try {
            Map<String, Object> corpo = brasilApi.get().uri("/{cep}", cep).retrieve().body(Map.class);
            if (corpo == null) {
                return Optional.empty();
            }
            Double lat = null;
            Double lon = null;
            if (corpo.get("location") instanceof Map<?, ?> local
                && local.get("coordinates") instanceof Map<?, ?> coord) {
                lat = comoDouble(coord.get("latitude"));
                lon = comoDouble(coord.get("longitude"));
            }
            return montar(texto(corpo.get("city")), texto(corpo.get("state")), lat, lon);
        } catch (RestClientResponseException e) {
            // 404 = CEP desconhecido; outros 4xx/5xx = serviço com problema. Nos dois casos tenta o ViaCEP.
            log.debug("BrasilAPI respondeu {}", e.getStatusCode().value());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("BrasilAPI indisponivel ({})", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    @SuppressWarnings("unchecked")
    private Optional<LocalizacaoCep> consultarViaCep(String cep) {
        try {
            Map<String, Object> corpo = viaCep.get().uri("/{cep}/json/", cep).retrieve().body(Map.class);
            // CEP inexistente no ViaCEP responde 200 com {"erro": true} (ou "true").
            if (corpo == null || corpo.containsKey("erro")) {
                return Optional.empty();
            }
            return montar(texto(corpo.get("localidade")), texto(corpo.get("uf")), null, null);
        } catch (Exception e) {
            log.warn("ViaCEP indisponivel ({})", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private static Optional<LocalizacaoCep> montar(String cidade, String uf, Double lat, Double lon) {
        // Coordenada só vale como par: metade dela não localiza ninguém.
        if (lat == null || lon == null) {
            lat = null;
            lon = null;
        }
        if (cidade == null && uf == null && lat == null) {
            return Optional.empty();
        }
        return Optional.of(new LocalizacaoCep(cidade, uf, lat, lon));
    }

    private static String texto(Object valor) {
        if (valor instanceof String s && !s.isBlank()) {
            return s.trim();
        }
        return null;
    }

    private static Double comoDouble(Object valor) {
        if (valor instanceof Number n) {
            return n.doubleValue();
        }
        if (valor instanceof String s) {
            try {
                return Double.valueOf(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
