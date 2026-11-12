package com.smartmarket.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.UsuarioRepository;
import com.smartmarket.service.geo.Cep;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cadastro com CEP de ponta a ponta (controller, validacao, servico, banco H2) contra um servidor
 * local que faz o papel de BrasilAPI e ViaCEP. O modo do servidor muda de teste para teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CadastroCepIntegrationTest {

    private enum Modo { OK, NAO_ENCONTRADO, LENTO }

    private static volatile Modo modo = Modo.OK;
    private static final HttpServer SERVIDOR = sobe();

    private static HttpServer sobe() {
        try {
            HttpServer s = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            s.setExecutor(Executors.newCachedThreadPool());
            s.createContext("/brasilapi/", troca -> responder(troca, 200,
                "{\"city\":\"Porto Alegre\",\"state\":\"RS\",\"location\":"
                    + "{\"coordinates\":{\"longitude\":\"-51.23\",\"latitude\":\"-30.03\"}}}",
                404, "{\"message\":\"CEP nao encontrado\"}"));
            s.createContext("/viacep/", troca -> responder(troca, 200,
                "{\"localidade\":\"Porto Alegre\",\"uf\":\"RS\"}", 200, "{\"erro\":true}"));
            s.start();
            return s;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void responder(HttpExchange troca, int statusOk, String corpoOk,
                                  int statusNaoEncontrado, String corpoNaoEncontrado) {
        try {
            if (modo == Modo.LENTO) {
                Thread.sleep(10_000);
            }
            boolean ok = modo == Modo.OK;
            byte[] bytes = (ok ? corpoOk : corpoNaoEncontrado).getBytes(StandardCharsets.UTF_8);
            troca.getResponseHeaders().add("Content-Type", "application/json");
            troca.sendResponseHeaders(ok ? statusOk : statusNaoEncontrado, bytes.length);
            troca.getResponseBody().write(bytes);
            troca.close();
        } catch (IOException | InterruptedException ignorado) {
            // o cliente desistiu (timeout): esperado no modo LENTO
        }
    }

    @DynamicPropertySource
    static void propriedades(DynamicPropertyRegistry registro) {
        String base = "http://127.0.0.1:" + SERVIDOR.getAddress().getPort();
        registro.add("smartmarket.cep.brasilapi-url", () -> base + "/brasilapi");
        registro.add("smartmarket.cep.viacep-url", () -> base + "/viacep");
        registro.add("smartmarket.cep.timeout-ms", () -> "500");
    }

    @AfterAll
    static void desliga() {
        SERVIDOR.stop(0);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void modoPadrao() {
        modo = Modo.OK;
    }

    private String json(String email, String cep) throws Exception {
        RegisterRequest r = new RegisterRequest();
        r.setNome("Cadastro Cep");
        r.setEmail(email);
        r.setSenha("senha123");
        r.setCep(cep);
        return objectMapper.writeValueAsString(r);
    }

    private Usuario registraEBusca(String email, String cep) throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json(email, cep)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty());
        return usuarioRepository.findByEmail(email).orElseThrow();
    }

    @Test
    void cepResolvidoGravaCepSemHifenCidadeUfECoordenadas() throws Exception {
        Usuario u = registraEBusca("cep-ok@email.com", "90010-000");

        assertThat(u.getCep()).isEqualTo("90010000");
        assertThat(u.getCidade()).isEqualTo("Porto Alegre");
        assertThat(u.getUf()).isEqualTo("RS");
        assertThat(u.getLatitude()).isEqualTo(-30.03);
        assertThat(u.getLongitude()).isEqualTo(-51.23);
        assertThat(u.getLojaPreferida()).isNull();
    }

    @Test
    void cepSemHifenEComEspacosTambemVale() throws Exception {
        Usuario u = registraEBusca("cep-sem-hifen@email.com", " 90010000 ");

        assertThat(u.getCep()).isEqualTo("90010000");
    }

    @Test
    void cepNaoEncontradoCadastraComLocalizacaoNaoResolvida() throws Exception {
        modo = Modo.NAO_ENCONTRADO;

        Usuario u = registraEBusca("cep-inexistente@email.com", "99999-999");

        assertThat(u.getCep()).isEqualTo("99999999");
        assertThat(u.getCidade()).isNull();
        assertThat(u.getUf()).isNull();
        assertThat(u.getLatitude()).isNull();
        assertThat(u.getLongitude()).isNull();
    }

    @Test
    void timeoutDaConsultaNaoBloqueiaNemFalhaOCadastro() throws Exception {
        modo = Modo.LENTO;

        long inicio = System.nanoTime();
        Usuario u = registraEBusca("cep-lento@email.com", "90010-000");
        long ms = (System.nanoTime() - inicio) / 1_000_000;

        assertThat(u.getCep()).isEqualTo("90010000");
        assertThat(u.getCidade()).isNull();
        assertThat(u.getLatitude()).isNull();
        // O servidor segura 10 s; o cadastro nao espera mais que o teto configurado (500 ms) + folga.
        assertThat(ms).isLessThan(5_000);
    }

    @Test
    void cepMalFormadoDa400ComErroEmCamposCep() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json("cep-ruim@email.com", "9001-000")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Dados invalidos"))
            .andExpect(jsonPath("$.campos.cep").value(Cep.MENSAGEM_INVALIDO));

        assertThat(usuarioRepository.findByEmail("cep-ruim@email.com")).isEmpty();
    }

    @Test
    void cepAusenteDa400ComErroEmCamposCep() throws Exception {
        String semCep = "{\"nome\":\"Sem Cep\",\"email\":\"sem-cep@email.com\",\"senha\":\"senha123\"}";

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(semCep))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.campos.cep").value("CEP e obrigatorio"));

        assertThat(usuarioRepository.findByEmail("sem-cep@email.com")).isEmpty();
    }

    @Test
    void erroDeCepConviveComOsErrosDosOutrosCampos() throws Exception {
        String tudoErrado = "{\"nome\":\"\",\"email\":\"nao-e-email\",\"senha\":\"123\",\"cep\":\"abc\"}";

        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(tudoErrado))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.campos.nome").exists())
            .andExpect(jsonPath("$.campos.email").exists())
            .andExpect(jsonPath("$.campos.senha").exists())
            .andExpect(jsonPath("$.campos.cep").exists());
    }
}
