package com.smartmarket.service.geo;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/** Consulta de CEP contra um servidor HTTP local que imita BrasilAPI e ViaCEP: sem internet. */
class ResolvedorCepTest {

    private static final String BRASILAPI_OK = """
        {"cep":"90010000","state":"RS","city":"Porto Alegre",
         "location":{"type":"Point","coordinates":{"longitude":"-51.2300","latitude":"-30.0300"}}}""";
    private static final String BRASILAPI_SEM_COORDENADAS = """
        {"cep":"90010000","state":"RS","city":"Porto Alegre","location":{"type":"Point","coordinates":{}}}""";
    private static final String VIACEP_OK = """
        {"cep":"90010-000","localidade":"Porto Alegre","uf":"RS"}""";

    private HttpServer servidor;
    private String base;
    private final AtomicInteger chamadasBrasilApi = new AtomicInteger();
    private final AtomicInteger chamadasViaCep = new AtomicInteger();

    @BeforeEach
    void sobeServidor() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        // Pool: um handler lento nao pode travar os demais.
        servidor.setExecutor(Executors.newCachedThreadPool());
        base = "http://127.0.0.1:" + servidor.getAddress().getPort();
    }

    @AfterEach
    void derrubaServidor() {
        servidor.stop(0);
    }

    private void responde(String caminho, AtomicInteger contador, int status, String corpo, long atrasoMs) {
        servidor.createContext(caminho, troca -> {
            contador.incrementAndGet();
            try {
                if (atrasoMs > 0) {
                    Thread.sleep(atrasoMs);
                }
                enviar(troca, status, corpo);
            } catch (InterruptedException | IOException ignorado) {
                // cliente desistiu (timeout): esperado nos testes de lentidao
            }
        });
    }

    private static void enviar(HttpExchange troca, int status, String corpo) throws IOException {
        byte[] bytes = corpo.getBytes(StandardCharsets.UTF_8);
        troca.getResponseHeaders().add("Content-Type", "application/json");
        troca.sendResponseHeaders(status, bytes.length);
        troca.getResponseBody().write(bytes);
        troca.close();
    }

    private ResolvedorCep resolvedor(long timeoutMs) {
        return resolvedor(timeoutMs, 4, 16);
    }

    private ResolvedorCep resolvedor(long timeoutMs, int maxConcorrentes, int filaMaxima) {
        servidor.start();
        return new ResolvedorCep(base + "/brasilapi", base + "/viacep", timeoutMs, maxConcorrentes, filaMaxima);
    }

    @Test
    void brasilApiResolveCidadeUfECoordenadas() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_OK, 0);

        Optional<LocalizacaoCep> local = resolvedor(2000).resolver("90010000");

        assertThat(local).isPresent();
        assertThat(local.get().cidade()).isEqualTo("Porto Alegre");
        assertThat(local.get().uf()).isEqualTo("RS");
        assertThat(local.get().latitude()).isEqualTo(-30.03);
        assertThat(local.get().longitude()).isEqualTo(-51.23);
        assertThat(local.get().temCoordenadas()).isTrue();
        assertThat(chamadasViaCep.get()).isZero();
    }

    @Test
    void brasilApiSemCoordenadasAindaDevolveCidadeEUf() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_SEM_COORDENADAS, 0);

        LocalizacaoCep local = resolvedor(2000).resolver("90010000").orElseThrow();

        assertThat(local.cidade()).isEqualTo("Porto Alegre");
        assertThat(local.latitude()).isNull();
        assertThat(local.longitude()).isNull();
        assertThat(local.temCoordenadas()).isFalse();
    }

    @Test
    void brasilApi404CaiNoViaCep() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 404, "{\"message\":\"CEP nao encontrado\"}", 0);
        responde("/viacep/90010000/json/", chamadasViaCep, 200, VIACEP_OK, 0);

        LocalizacaoCep local = resolvedor(2000).resolver("90010000").orElseThrow();

        assertThat(local.cidade()).isEqualTo("Porto Alegre");
        assertThat(local.uf()).isEqualTo("RS");
        // ViaCEP nao informa coordenadas.
        assertThat(local.temCoordenadas()).isFalse();
        assertThat(chamadasBrasilApi.get()).isEqualTo(1);
        assertThat(chamadasViaCep.get()).isEqualTo(1);
    }

    @Test
    void brasilApiComErro500CaiNoViaCep() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 500, "{}", 0);
        responde("/viacep/90010000/json/", chamadasViaCep, 200, VIACEP_OK, 0);

        assertThat(resolvedor(2000).resolver("90010000")).isPresent();
    }

    @Test
    void naoEncontradoNosDoisServicosEVazio() {
        responde("/brasilapi/99999999", chamadasBrasilApi, 404, "{\"message\":\"CEP nao encontrado\"}", 0);
        responde("/viacep/99999999/json/", chamadasViaCep, 200, "{\"erro\":true}", 0);

        assertThat(resolvedor(2000).resolver("99999999")).isEmpty();
        assertThat(chamadasBrasilApi.get()).isEqualTo(1);
        assertThat(chamadasViaCep.get()).isEqualTo(1);
    }

    @Test
    void respostaSemNadaUtilEVazia() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, "{}", 0);
        responde("/viacep/90010000/json/", chamadasViaCep, 200, "{}", 0);

        assertThat(resolvedor(2000).resolver("90010000")).isEmpty();
    }

    @Test
    void corpoQueNaoEJsonNaoPropagaErro() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, "<html>manutencao</html>", 0);
        responde("/viacep/90010000/json/", chamadasViaCep, 200, "<html>manutencao</html>", 0);

        assertThat(resolvedor(2000).resolver("90010000")).isEmpty();
    }

    @Test
    void servidorForaDoArNaoPropagaErro() {
        ResolvedorCep resolvedor = new ResolvedorCep("http://127.0.0.1:9/brasilapi", "http://127.0.0.1:9/viacep", 2000, 4, 16);

        assertThat(resolvedor.resolver("90010000")).isEmpty();
    }

    @Test
    void timeoutNaoPropagaErroENaoEspera() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_OK, 5000);
        responde("/viacep/90010000/json/", chamadasViaCep, 200, VIACEP_OK, 5000);
        ResolvedorCep resolvedor = resolvedor(400);

        long inicio = System.nanoTime();
        Optional<LocalizacaoCep> local = resolvedor.resolver("90010000");
        long ms = (System.nanoTime() - inicio) / 1_000_000;

        assertThat(local).isEmpty();
        // Teto total de 400 ms (com folga de agendamento): nao somou BrasilAPI + ViaCEP.
        assertThat(ms).isLessThan(1500);
    }

    @Test
    void brasilApiLentaComViaCepRapidoRespeitaOTetoTotal() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_OK, 5000);
        responde("/viacep/90010000/json/", chamadasViaCep, 200, VIACEP_OK, 0);
        ResolvedorCep resolvedor = resolvedor(400);

        long inicio = System.nanoTime();
        Optional<LocalizacaoCep> local = resolvedor.resolver("90010000");
        long ms = (System.nanoTime() - inicio) / 1_000_000;

        // A BrasilAPI come o orcamento todo: a reserva nao tem tempo e o resultado e "nao resolvido".
        assertThat(local).isEmpty();
        assertThat(ms).isLessThan(1500);
    }

    @Test
    void comOLimiteDeConcorrentesCheioASegundaChamadaVoltaVaziaSemEsperarOTeto() throws Exception {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_OK, 5000);
        responde("/viacep/90010000/json/", chamadasViaCep, 200, VIACEP_OK, 5000);
        // 1 thread e sem fila: a consulta presa ocupa o unico lugar.
        ResolvedorCep resolvedor = resolvedor(1500, 1, 0);

        java.util.concurrent.CompletableFuture<Optional<LocalizacaoCep>> presa =
            java.util.concurrent.CompletableFuture.supplyAsync(() -> resolvedor.resolver("90010000"));
        long limite = System.nanoTime() + 3_000_000_000L;
        while (chamadasBrasilApi.get() == 0 && System.nanoTime() < limite) {
            Thread.sleep(10);
        }
        assertThat(chamadasBrasilApi.get()).as("a primeira consulta chegou ao servidor").isEqualTo(1);

        long inicio = System.nanoTime();
        Optional<LocalizacaoCep> segunda = resolvedor.resolver("90010000");
        long ms = (System.nanoTime() - inicio) / 1_000_000;

        assertThat(segunda).isEmpty();
        // Rejeitada na hora: bem abaixo do teto de 1500 ms.
        assertThat(ms).isLessThan(500);
        assertThat(chamadasBrasilApi.get()).as("a segunda nem chegou ao servidor").isEqualTo(1);
        assertThat(presa.get(5, java.util.concurrent.TimeUnit.SECONDS)).isEmpty();
    }

    // ---------- Fase 4C: refino da coordenada pela rua do CEP (Nominatim) ----------

    private static final String USER_AGENT = "SmartMarketTeste/1.0 (+https://exemplo.invalido)";
    private static final String BRASILAPI_COM_RUA = """
        {"cep":"90010000","state":"RS","city":"Porto Alegre","neighborhood":"Centro Histórico","street":"Rua dos Andradas",
         "location":{"type":"Point","coordinates":{"longitude":"-51.2300","latitude":"-30.0300"}}}""";
    private static final String BRASILAPI_OUTRA_RUA = """
        {"cep":"90020000","state":"RS","city":"Porto Alegre","neighborhood":"Floresta","street":"Avenida Farrapos",
         "location":{"type":"Point","coordinates":{"longitude":"-51.2300","latitude":"-30.0300"}}}""";
    private static final String BRASILAPI_CEP_GERAL = """
        {"cep":"90000000","state":"RS","city":"Porto Alegre","neighborhood":null,"street":null,
         "location":{"type":"Point","coordinates":{"longitude":"-51.2300","latitude":"-30.0300"}}}""";
    private static final String VIACEP_COM_RUA = """
        {"cep":"90010-000","logradouro":"Rua dos Andradas","bairro":"Centro Histórico","localidade":"Porto Alegre","uf":"RS"}""";
    private static final String NOMINATIM_RUA = """
        [{"lat":"-30.0346","lon":"-51.2177","address":{"road":"Rua dos Andradas","city":"Porto Alegre","state":"Rio Grande do Sul"}}]""";

    private final AtomicInteger chamadasNominatim = new AtomicInteger();

    private ResolvedorCep resolvedorComRefino(long timeoutMs, long refinoMs) {
        return resolvedorComRefino(base + "/nominatim", timeoutMs, refinoMs);
    }

    private ResolvedorCep resolvedorComRefino(String nominatimUrl, long timeoutMs, long refinoMs) {
        servidor.start();
        return new ResolvedorCep(base + "/brasilapi", base + "/viacep", nominatimUrl, timeoutMs, refinoMs, true, USER_AGENT, 4, 16);
    }

    private static String nominatimComLat(double lat) {
        return "[{\"lat\":\"" + lat + "\",\"lon\":\"-51.2300\",\"address\":{\"city\":\"Porto Alegre\"}}]";
    }

    @Test
    void cepComRuaEnominatimOkDevolveACoordenadaDaRuaENaoADoCep() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200, NOMINATIM_RUA, 0);

        LocalizacaoCep local = resolvedorComRefino(2000, 2000).resolver("90010000").orElseThrow();

        assertThat(local.cidade()).isEqualTo("Porto Alegre");
        assertThat(local.uf()).isEqualTo("RS");
        assertThat(local.latitude()).isEqualTo(-30.0346);
        assertThat(local.longitude()).isEqualTo(-51.2177);
    }

    @Test
    void consultaAoNominatimLevaRuaBairroCidadeUfEOUserAgentConfigurado() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        Map<String, String> parametros = new HashMap<>();
        List<String> userAgents = Collections.synchronizedList(new ArrayList<>());
        servidor.createContext("/nominatim/search", troca -> {
            chamadasNominatim.incrementAndGet();
            userAgents.add(troca.getRequestHeaders().getFirst("User-Agent"));
            for (String par : troca.getRequestURI().getRawQuery().split("&")) {
                String[] kv = par.split("=", 2);
                parametros.put(kv[0], URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
            }
            enviar(troca, 200, NOMINATIM_RUA);
        });

        resolvedorComRefino(2000, 2000).resolver("90010000");

        assertThat(parametros.get("q")).isEqualTo("Rua dos Andradas, Centro Histórico, Porto Alegre, RS, Brasil");
        assertThat(parametros.get("format")).isEqualTo("jsonv2");
        assertThat(parametros.get("addressdetails")).isEqualTo("1");
        assertThat(parametros.get("limit")).isEqualTo("1");
        assertThat(parametros.get("countrycodes")).isEqualTo("br");
        assertThat(userAgents).containsExactly(USER_AGENT);
    }

    @Test
    void cidadeDiferenteNaRespostaDevolveCidadeEUfSemCoordenadas() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200,
            "[{\"lat\":\"-29.9177\",\"lon\":\"-51.1839\",\"address\":{\"city\":\"Canoas\"}}]", 0);

        LocalizacaoCep local = resolvedorComRefino(2000, 2000).resolver("90010000").orElseThrow();

        assertThat(local.cidade()).isEqualTo("Porto Alegre");
        assertThat(local.uf()).isEqualTo("RS");
        assertThat(local.latitude()).isNull();
        assertThat(local.longitude()).isNull();
    }

    @Test
    void cidadeDaRespostaIgnoraAcentoECaixaEAceitaMunicipality() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200,
            BRASILAPI_COM_RUA.replace("Porto Alegre", "São Leopoldo"), 0);
        responde("/nominatim/search", chamadasNominatim, 200,
            "[{\"lat\":\"-30.0310\",\"lon\":\"-51.2310\",\"address\":{\"municipality\":\"SAO LEOPOLDO\"}}]", 0);

        LocalizacaoCep local = resolvedorComRefino(2000, 2000).resolver("90010000").orElseThrow();

        assertThat(local.latitude()).isEqualTo(-30.031);
    }

    @Test
    void resultadoA38KmDaCoordenadaDoCepERejeitado() {
        // 0,342 grau de latitude = ~38 km (limite de 30 km).
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200, nominatimComLat(-30.0300 + 0.342), 0);

        LocalizacaoCep longe = resolvedorComRefino(2000, 2000).resolver("90010000").orElseThrow();

        assertThat(longe.temCoordenadas()).isFalse();
        assertThat(longe.cidade()).isEqualTo("Porto Alegre");
    }

    @Test
    void resultadoA25KmDaCoordenadaDoCepEAceito() {
        // 0,225 grau de latitude = ~25 km.
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200, nominatimComLat(-30.0300 + 0.225), 0);

        LocalizacaoCep perto = resolvedorComRefino(2000, 2000).resolver("90010000").orElseThrow();

        assertThat(perto.temCoordenadas()).isTrue();
        assertThat(perto.latitude()).isEqualTo(-30.0300 + 0.225);
    }

    @Test
    void nominatimSemResultadoSegueSemCoordenadasESemExcecao() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200, "[]", 0);

        LocalizacaoCep vazio = resolvedorComRefino(2000, 2000).resolver("90010000").orElseThrow();

        assertThat(vazio.cidade()).isEqualTo("Porto Alegre");
        assertThat(vazio.uf()).isEqualTo("RS");
        assertThat(vazio.temCoordenadas()).isFalse();
    }

    @Test
    void nominatimComErro500SegueSemCoordenadas() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 500, "{}", 0);

        LocalizacaoCep local = resolvedorComRefino(2000, 2000).resolver("90010000").orElseThrow();

        assertThat(local.cidade()).isEqualTo("Porto Alegre");
        assertThat(local.temCoordenadas()).isFalse();
    }

    @Test
    void nominatimForaDoArSegueSemCoordenadas() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);

        LocalizacaoCep local = resolvedorComRefino("http://127.0.0.1:9/nominatim", 2000, 2000)
            .resolver("90010000").orElseThrow();

        assertThat(local.cidade()).isEqualTo("Porto Alegre");
        assertThat(local.uf()).isEqualTo("RS");
        assertThat(local.temCoordenadas()).isFalse();
    }

    @Test
    void nominatimLentoRespeitaOTetoDoRefinoESegueSemCoordenadas() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200, NOMINATIM_RUA, 5000);
        ResolvedorCep resolvedor = resolvedorComRefino(2000, 400);

        long inicio = System.nanoTime();
        LocalizacaoCep local = resolvedor.resolver("90010000").orElseThrow();
        long ms = (System.nanoTime() - inicio) / 1_000_000;

        assertThat(local.cidade()).isEqualTo("Porto Alegre");
        assertThat(local.temCoordenadas()).isFalse();
        assertThat(ms).isLessThan(1500);
    }

    @Test
    void cepSemRuaMantemACoordenadaDaBrasilApiENaoChamaONominatim() {
        responde("/brasilapi/90000000", chamadasBrasilApi, 200, BRASILAPI_CEP_GERAL, 0);
        responde("/nominatim/search", chamadasNominatim, 200, NOMINATIM_RUA, 0);

        LocalizacaoCep local = resolvedorComRefino(2000, 2000).resolver("90000000").orElseThrow();

        assertThat(local.latitude()).isEqualTo(-30.03);
        assertThat(local.longitude()).isEqualTo(-51.23);
        assertThat(chamadasNominatim.get()).isZero();
    }

    @Test
    void brasilApi404EViaCepComLogradouroRefinaPelaRuaDoViaCep() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 404, "{\"message\":\"CEP nao encontrado\"}", 0);
        responde("/viacep/90010000/json/", chamadasViaCep, 200, VIACEP_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200, NOMINATIM_RUA, 0);

        LocalizacaoCep local = resolvedorComRefino(2000, 2000).resolver("90010000").orElseThrow();

        assertThat(local.cidade()).isEqualTo("Porto Alegre");
        assertThat(local.uf()).isEqualTo("RS");
        assertThat(local.latitude()).isEqualTo(-30.0346);
        assertThat(local.longitude()).isEqualTo(-51.2177);
    }

    @Test
    void mesmoCepDuasVezesChamaONominatimUmaVezSo() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200, NOMINATIM_RUA, 0);
        ResolvedorCep resolvedor = resolvedorComRefino(2000, 2000);

        LocalizacaoCep primeira = resolvedor.resolver("90010000").orElseThrow();
        LocalizacaoCep segunda = resolvedor.resolver("90010000").orElseThrow();

        assertThat(segunda).isEqualTo(primeira);
        assertThat(segunda.latitude()).isEqualTo(-30.0346);
        assertThat(chamadasNominatim.get()).isEqualTo(1);
    }

    @Test
    void resultadoRejeitadoNaoVaiParaOCache() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200, "[]", 0);
        ResolvedorCep resolvedor = resolvedorComRefino(2000, 3000);

        resolvedor.resolver("90010000");
        resolvedor.resolver("90010000");

        assertThat(chamadasNominatim.get()).isEqualTo(2);
    }

    @Test
    void cepsDiferentesEmSeguidaEspacamAsChamadasEmPeloMenos1Segundo() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/brasilapi/90020000", chamadasBrasilApi, 200, BRASILAPI_OUTRA_RUA, 0);
        List<Long> chegadas = Collections.synchronizedList(new ArrayList<>());
        servidor.createContext("/nominatim/search", troca -> {
            chegadas.add(System.nanoTime());
            enviar(troca, 200, NOMINATIM_RUA);
        });
        ResolvedorCep resolvedor = resolvedorComRefino(2000, 3000);

        LocalizacaoCep primeira = resolvedor.resolver("90010000").orElseThrow();
        LocalizacaoCep segunda = resolvedor.resolver("90020000").orElseThrow();

        assertThat(chegadas).hasSize(2);
        assertThat((chegadas.get(1) - chegadas.get(0)) / 1_000_000).isGreaterThanOrEqualTo(950);
        assertThat(primeira.temCoordenadas()).isTrue();
        assertThat(segunda.temCoordenadas()).isTrue();
    }

    @Test
    void semTempoParaAVezDoNominatimSegueSemCoordenadasENaoChamaOServico() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/brasilapi/90020000", chamadasBrasilApi, 200, BRASILAPI_OUTRA_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200, NOMINATIM_RUA, 0);
        // Teto do refino de 500 ms: a segunda consulta teria de esperar ~1 s pela vez.
        ResolvedorCep resolvedor = resolvedorComRefino(2000, 500);

        LocalizacaoCep primeira = resolvedor.resolver("90010000").orElseThrow();
        long inicio = System.nanoTime();
        LocalizacaoCep segunda = resolvedor.resolver("90020000").orElseThrow();
        long ms = (System.nanoTime() - inicio) / 1_000_000;

        assertThat(primeira.temCoordenadas()).isTrue();
        assertThat(segunda.cidade()).isEqualTo("Porto Alegre");
        assertThat(segunda.temCoordenadas()).isFalse();
        assertThat(chamadasNominatim.get()).isEqualTo(1);
        assertThat(ms).isLessThan(1000);
    }

    @Test
    void comRefinarPorRuaDesligadoOComportamentoEOAnteriorENaoChamaONominatim() {
        responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
        responde("/nominatim/search", chamadasNominatim, 200, NOMINATIM_RUA, 0);
        servidor.start();
        ResolvedorCep resolvedor = new ResolvedorCep(base + "/brasilapi", base + "/viacep", base + "/nominatim",
            2000, 2000, false, USER_AGENT, 4, 16);

        LocalizacaoCep local = resolvedor.resolver("90010000").orElseThrow();

        assertThat(local.latitude()).isEqualTo(-30.03);
        assertThat(local.longitude()).isEqualTo(-51.23);
        assertThat(chamadasNominatim.get()).isZero();
    }

    @Test
    void nenhumaMensagemDeLogContemOCepOuARua() {
        ch.qos.logback.classic.Logger logger =
            (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(ResolvedorCep.class);
        Level nivelAnterior = logger.getLevel();
        ListAppender<ILoggingEvent> registro = new ListAppender<>();
        registro.start();
        logger.setLevel(Level.DEBUG);
        logger.addAppender(registro);
        try {
            responde("/brasilapi/90010000", chamadasBrasilApi, 200, BRASILAPI_COM_RUA, 0);
            responde("/brasilapi/90020000", chamadasBrasilApi, 404, "{}", 0);
            responde("/viacep/90020000/json/", chamadasViaCep, 200, VIACEP_COM_RUA, 0);
            responde("/nominatim/search", chamadasNominatim, 500, "{}", 0);
            ResolvedorCep resolvedor = resolvedorComRefino(2000, 3000);
            resolvedor.resolver("90010000");
            resolvedor.resolver("90020000");
            new ResolvedorCep(base + "/brasilapi", base + "/viacep", "http://127.0.0.1:9/nominatim",
                2000, 300, true, USER_AGENT, 4, 16).resolver("90010000");

            assertThat(registro.list).isNotEmpty();
            for (ILoggingEvent evento : registro.list) {
                assertThat(evento.getFormattedMessage())
                    .doesNotContain("90010000", "90020000", "90010-000", "Andradas", "Farrapos", "-30.0");
                assertThat(evento.getThrowableProxy()).isNull();
            }
        } finally {
            logger.detachAppender(registro);
            logger.setLevel(nivelAnterior);
        }
    }
}
