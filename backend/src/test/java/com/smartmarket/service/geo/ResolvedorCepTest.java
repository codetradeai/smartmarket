package com.smartmarket.service.geo;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
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
}
