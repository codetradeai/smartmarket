package com.smartmarket.service.geo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.text.Normalizer;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.Callable;
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
 *
 * <p><b>Refino pela rua (Fase 4C).</b> A BrasilAPI devolve o centro da cidade para a maioria dos CEPs,
 * o que põe todo mundo da mesma cidade no mesmo ponto. Quando o CEP tem rua (logradouro), a rua, o
 * bairro, a cidade e a UF vão ao Nominatim (OpenStreetMap), sem nada que identifique o usuário. O
 * resultado só vale se a cidade devolvida for a do CEP e, havendo coordenada da BrasilAPI, ficar a até
 * 30 km dela. Qualquer outro desfecho (rejeitado, não encontrado, erro, tempo esgotado, sem a vez no
 * limite de 1 requisição por segundo) devolve cidade e UF <b>sem coordenadas</b>: nunca o centro da
 * cidade de um CEP que tem rua. O refino tem teto próprio (smartmarket.cep.refino-timeout-ms) e nunca
 * faz o resultado virar vazio: a cidade já obtida é preservada. CEP sem rua (CEP geral da cidade)
 * mantém a coordenada da BrasilAPI. Com smartmarket.cep.refinar-por-rua=false nada disso acontece.
 *
 * <p>Nada do CEP, da rua ou da coordenada vai para o log: só status e o nome da exceção.
 */
@Component
public class ResolvedorCep {

    private static final Logger log = LoggerFactory.getLogger(ResolvedorCep.class);

    /** Distância máxima entre a coordenada da rua e a da BrasilAPI para o refino ser aceito. */
    static final double DISTANCIA_MAXIMA_KM = 30.0;
    /** Política de uso do Nominatim: no máximo 1 requisição por segundo. */
    private static final long INTERVALO_NOMINATIM_NANOS = TimeUnit.SECONDS.toNanos(1);
    private static final int LIMITE_CACHE = 5000;

    private final RestClient brasilApi;
    private final RestClient viaCep;
    private final RestClient nominatim;
    private final long timeoutMs;
    private final long refinoTimeoutMs;
    private final boolean refinarPorRua;
    // Roda a consulta numa thread à parte para poder dar um teto ao tempo total. Pool limitado
    // (threads e fila), para um pico de cadastros ou um serviço externo preso não criar threads
    // sem limite; daemon para não segurar o desligamento da aplicação.
    private final ExecutorService executor;

    // Instante (System.nanoTime) em que a próxima requisição ao Nominatim pode sair. Vale para toda
    // a aplicação: o ResolvedorCep é um singleton.
    private final Object travaLimitador = new Object();
    private long proximaVezNominatim = System.nanoTime();

    // CEP -> {latitude, longitude} dos refinos aceitos. Em memória, no máximo LIMITE_CACHE entradas;
    // ao encher, descarta a mais antiga (ordem de inserção).
    private final Map<String, double[]> cacheRefino = new LinkedHashMap<>() {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, double[]> eldest) {
            return size() > LIMITE_CACHE;
        }
    };

    /** Sem refino pela rua (comportamento anterior à Fase 4C): só BrasilAPI e ViaCEP. */
    public ResolvedorCep(String brasilApiUrl, String viaCepUrl, long timeoutMs, int maxConcorrentes, int filaMaxima) {
        this(brasilApiUrl, viaCepUrl, "http://127.0.0.1:9", timeoutMs, 2000, false, "SmartMarket", maxConcorrentes, filaMaxima);
    }

    @Autowired
    public ResolvedorCep(
        @Value("${smartmarket.cep.brasilapi-url:https://brasilapi.com.br/api/cep/v2}") String brasilApiUrl,
        @Value("${smartmarket.cep.viacep-url:https://viacep.com.br/ws}") String viaCepUrl,
        @Value("${smartmarket.cep.nominatim-url:https://nominatim.openstreetmap.org}") String nominatimUrl,
        @Value("${smartmarket.cep.timeout-ms:2000}") long timeoutMs,
        @Value("${smartmarket.cep.refino-timeout-ms:2000}") long refinoTimeoutMs,
        @Value("${smartmarket.cep.refinar-por-rua:true}") boolean refinarPorRua,
        @Value("${smartmarket.cep.user-agent:SmartMarket/1.0 (+https://github.com/smartmarket-team/smartmarket)}") String userAgent,
        @Value("${smartmarket.cep.max-concorrentes:4}") int maxConcorrentes,
        @Value("${smartmarket.cep.fila-maxima:16}") int filaMaxima) {
        this.timeoutMs = timeoutMs;
        this.refinoTimeoutMs = refinoTimeoutMs;
        this.refinarPorRua = refinarPorRua;
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
        JdkClientHttpRequestFactory fabricaRefino = new JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(Duration.ofMillis(refinoTimeoutMs)).build());
        fabricaRefino.setReadTimeout(Duration.ofMillis(refinoTimeoutMs));
        this.nominatim = RestClient.builder().baseUrl(nominatimUrl).requestFactory(fabricaRefino)
            .defaultHeader("User-Agent", userAgent).build();
    }

    /** @param cep 8 dígitos, sem hífen. Nunca lança: falha vira {@code Optional.empty()}. */
    public Optional<LocalizacaoCep> resolver(String cep) {
        Optional<Consulta> consulta = comTeto(() -> consultar(cep), timeoutMs, "Consulta de CEP").flatMap(c -> c);
        if (consulta.isEmpty()) {
            return Optional.empty();
        }
        Consulta c = consulta.get();
        if (!refinarPorRua || c.rua() == null) {
            // CEP geral da cidade (sem rua) ou refino desligado: fica o que o serviço de CEP deu.
            return Optional.of(c.local());
        }
        double[] coordenada = refinar(cep, c);
        return Optional.of(coordenada == null
            ? new LocalizacaoCep(c.local().cidade(), c.local().uf(), null, null)
            : new LocalizacaoCep(c.local().cidade(), c.local().uf(), coordenada[0], coordenada[1]));
    }

    /** Coordenada da rua ({lat, lon}) ou {@code null} se não deu para refinar. Nunca lança. */
    private double[] refinar(String cep, Consulta c) {
        synchronized (cacheRefino) {
            double[] guardada = cacheRefino.get(cep);
            if (guardada != null) {
                return guardada;
            }
        }
        double[] coordenada = comTeto(() -> consultarNominatim(c), refinoTimeoutMs, "Refino de CEP")
            .flatMap(r -> r).orElse(null);
        if (coordenada != null) {
            synchronized (cacheRefino) {
                cacheRefino.put(cep, coordenada);
            }
        }
        return coordenada;
    }

    /**
     * Roda a tarefa numa thread do pool com teto de tempo. Vazio se o pool está cheio, se o tempo
     * estoura ou se a tarefa falha.
     */
    private <T> Optional<T> comTeto(Callable<T> tarefa, long tetoMs, String descricao) {
        Future<T> futuro;
        try {
            futuro = executor.submit(tarefa);
        } catch (RejectedExecutionException e) {
            // Threads e fila cheias: segue sem resultado em vez de acumular consultas.
            log.warn("{} descartada: limite de consultas simultaneas atingido", descricao);
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(futuro.get(tetoMs, TimeUnit.MILLISECONDS));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            futuro.cancel(true);
            return Optional.empty();
        } catch (Exception e) {
            // Estourou o teto ou erro inesperado: cancela e segue sem resultado.
            futuro.cancel(true);
            log.warn("{} sem resultado ({})", descricao, e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private Optional<Consulta> consultar(String cep) {
        Optional<Consulta> resposta = consultarBrasilApi(cep);
        if (resposta.isPresent()) {
            return resposta;
        }
        return consultarViaCep(cep);
    }

    @SuppressWarnings("unchecked")
    private Optional<Consulta> consultarBrasilApi(String cep) {
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
            return montar(texto(corpo.get("city")), texto(corpo.get("state")), lat, lon,
                texto(corpo.get("street")), texto(corpo.get("neighborhood")));
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
    private Optional<Consulta> consultarViaCep(String cep) {
        try {
            Map<String, Object> corpo = viaCep.get().uri("/{cep}/json/", cep).retrieve().body(Map.class);
            // CEP inexistente no ViaCEP responde 200 com {"erro": true} (ou "true").
            if (corpo == null || corpo.containsKey("erro")) {
                return Optional.empty();
            }
            return montar(texto(corpo.get("localidade")), texto(corpo.get("uf")), null, null,
                texto(corpo.get("logradouro")), texto(corpo.get("bairro")));
        } catch (Exception e) {
            log.warn("ViaCEP indisponivel ({})", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    /**
     * Procura a rua no Nominatim. Devolve a coordenada aceita ({lat, lon}) ou vazio. Roda dentro do
     * teto do refino: o tempo de espera pela vez no limite de 1 requisição por segundo conta nele.
     */
    @SuppressWarnings("unchecked")
    private Optional<double[]> consultarNominatim(Consulta c) {
        long limite = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(refinoTimeoutMs);
        try {
            if (!aguardarVezNominatim(limite)) {
                log.debug("Refino de CEP sem a vez no limite do Nominatim");
                return Optional.empty();
            }
            List<Map<String, Object>> resultados = nominatim.get()
                .uri("/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=br&q={q}", montarConsulta(c))
                .retrieve().body(List.class);
            if (resultados == null || resultados.isEmpty()) {
                return Optional.empty();
            }
            return aceitar(resultados.get(0), c);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (RestClientResponseException e) {
            log.debug("Nominatim respondeu {}", e.getStatusCode().value());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Nominatim indisponivel ({})", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private static String montarConsulta(Consulta c) {
        StringBuilder q = new StringBuilder(c.rua());
        if (c.bairro() != null) {
            q.append(", ").append(c.bairro());
        }
        if (c.local().cidade() != null) {
            q.append(", ").append(c.local().cidade());
        }
        if (c.local().uf() != null) {
            q.append(", ").append(c.local().uf());
        }
        return q.append(", Brasil").toString();
    }

    /** Aceita o resultado só se a cidade bate com a do CEP e, havendo coordenada do CEP, se está a até 30 km. */
    private static Optional<double[]> aceitar(Map<String, Object> resultado, Consulta c) {
        if (!(resultado.get("address") instanceof Map<?, ?> endereco)) {
            return Optional.empty();
        }
        String cidadeDoCep = semAcentoNemCaixa(c.local().cidade());
        if (cidadeDoCep == null || !(cidadeConfere(endereco.get("city"), cidadeDoCep)
            || cidadeConfere(endereco.get("town"), cidadeDoCep)
            || cidadeConfere(endereco.get("municipality"), cidadeDoCep))) {
            return Optional.empty();
        }
        Double lat = comoDouble(resultado.get("lat"));
        Double lon = comoDouble(resultado.get("lon"));
        if (lat == null || lon == null) {
            return Optional.empty();
        }
        if (c.local().temCoordenadas()
            && Haversine.distanciaKm(c.local().latitude(), c.local().longitude(), lat, lon) > DISTANCIA_MAXIMA_KM) {
            return Optional.empty();
        }
        return Optional.of(new double[] {lat, lon});
    }

    private static boolean cidadeConfere(Object devolvida, String cidadeDoCepNormalizada) {
        return devolvida instanceof String s && cidadeDoCepNormalizada.equals(semAcentoNemCaixa(s));
    }

    private static String semAcentoNemCaixa(String valor) {
        if (valor == null) {
            return null;
        }
        return Normalizer.normalize(valor, Normalizer.Form.NFD).replaceAll("\\p{M}", "").trim().toLowerCase();
    }

    /**
     * Reserva a próxima vaga de 1 requisição por segundo e espera por ela. {@code false} se a vaga
     * só chegaria depois do limite (a vaga então não é reservada).
     */
    private boolean aguardarVezNominatim(long limiteNanos) throws InterruptedException {
        long minhaVez;
        synchronized (travaLimitador) {
            long agora = System.nanoTime();
            minhaVez = proximaVezNominatim - agora > 0 ? proximaVezNominatim : agora;
            if (minhaVez - limiteNanos > 0) {
                return false;
            }
            proximaVezNominatim = minhaVez + INTERVALO_NOMINATIM_NANOS;
        }
        long espera = minhaVez - System.nanoTime();
        if (espera > 0) {
            TimeUnit.NANOSECONDS.sleep(espera);
        }
        return true;
    }

    private static Optional<Consulta> montar(String cidade, String uf, Double lat, Double lon, String rua, String bairro) {
        // Coordenada só vale como par: metade dela não localiza ninguém.
        if (lat == null || lon == null) {
            lat = null;
            lon = null;
        }
        if (cidade == null && uf == null && lat == null) {
            return Optional.empty();
        }
        return Optional.of(new Consulta(new LocalizacaoCep(cidade, uf, lat, lon), rua, bairro));
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

    /** O que os serviços de CEP devolveram: a localização e, se houver, a rua e o bairro do CEP. */
    private record Consulta(LocalizacaoCep local, String rua, String bairro) {
    }
}
