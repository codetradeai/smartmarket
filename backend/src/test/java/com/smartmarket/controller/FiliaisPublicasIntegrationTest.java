package com.smartmarket.controller;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.smartmarket.model.Loja;
import com.smartmarket.model.Mercado;
import com.smartmarket.repository.LojaRepository;
import com.smartmarket.repository.MercadoRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/lojas/filiais e publico: o contrato (so o necessario), os cabecalhos de cache e, acima de tudo, a
 * seguranca: token invalido NAO derruba o endpoint publico, e /api/lojas/proximas e as rotas protegidas
 * continuam dando 401. Os dados sao semeados uma vez porque o servico guarda a lista por 10 minutos.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class FiliaisPublicasIntegrationTest {

    private static final String ROTA = "/api/lojas/filiais";

    @Autowired private MockMvc mockMvc;
    @Autowired private MercadoRepository mercadoRepository;
    @Autowired private LojaRepository lojaRepository;

    @Value("${jwt.secret}")
    private String segredoDaAplicacao;

    private Mercado rede;
    private String nomeDaRede;
    private Loja filial;

    @BeforeAll
    void semear() {
        nomeDaRede = "Rede Publica " + UUID.randomUUID().toString().substring(0, 8);
        rede = mercadoRepository.save(Mercado.builder().nome(nomeDaRede).endereco("Rua Interna 10, Centro").ativo(true).build());
        lojaRepository.save(Loja.builder().mercado(rede).nome("Padrao").codigoExterno(Loja.CODIGO_PADRAO)
            .latitude(-30.0).longitude(-51.0).ativa(true).build());
        lojaRepository.save(Loja.builder().mercado(rede).nome("Sem coordenada").codigoExterno("f0")
            .ativa(true).build());
        filial = lojaRepository.save(Loja.builder().mercado(rede).nome("Filial Centro").codigoExterno("f1")
            .endereco("Rua Secreta 123").cidade("Porto Alegre").uf("RS").cep("90010000")
            .latitude(-30.0300).longitude(-51.2200).ativa(true).build());
    }

    @AfterAll
    void limpar() {
        lojaRepository.deleteAll(lojaRepository.findByMercadoIdOrderByIdAsc(rede.getId()));
        mercadoRepository.deleteById(rede.getId());
    }

    /** GET na rota publica (com o Bearer, se houver) esperando 200; devolve o corpo. */
    private String corpoCom(String token) throws Exception {
        MockHttpServletRequestBuilder req = get(ROTA);
        if (token != null) {
            req = req.header("Authorization", "Bearer " + token);
        }
        MvcResult r = mockMvc.perform(req).andExpect(status().isOk()).andReturn();
        return r.getResponse().getContentAsString();
    }

    private String tokenExpirado() {
        return tokenAssinado(segredoDaAplicacao, Instant.now().minusSeconds(7200), Instant.now().minusSeconds(3600));
    }

    private static String tokenAssinado(String segredo, Instant emitidoEm, Instant expiraEm) {
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<>(
            new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256")));
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("smartmarket").issuedAt(emitidoEm)
            .expiresAt(expiraEm).subject("ninguem@email.com").claim("papel", "USER").build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    // ---- contrato ----

    @Test
    void semTokenDevolve200ComSoAsFiliaisReaisComCoordenadas() throws Exception {
        assertThat(corpoCom(null)).contains("Filial Centro").doesNotContain("Sem coordenada").doesNotContain("\"Padrao\"");

        mockMvc.perform(get(ROTA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.lojaNome=='Filial Centro')].mercadoNome").value(nomeDaRede))
            .andExpect(jsonPath("$[?(@.lojaNome=='Filial Centro')].latitude").value(-30.03))
            .andExpect(jsonPath("$[?(@.lojaNome=='Filial Centro')].longitude").value(-51.22))
            .andExpect(jsonPath("$[?(@.lojaNome=='Filial Centro')].lojaId").value(filial.getId().intValue()))
            .andExpect(jsonPath("$[?(@.lojaNome=='Filial Centro')].mercadoId").value(rede.getId().intValue()));
    }

    @Test
    void naoExpoeEnderecoCepCidadeNemUf() throws Exception {
        assertThat(corpoCom(null)).doesNotContain("Rua Secreta").doesNotContain("90010000").doesNotContain("Rua Interna")
            .doesNotContain("endereco").doesNotContain("\"cep\"").doesNotContain("cidade").doesNotContain("\"uf\"");
    }

    // ---- cache ----

    @Test
    void mandaCacheControlPublicoDeCincoMinutosEETag() throws Exception {
        MvcResult r = mockMvc.perform(get(ROTA)).andExpect(status().isOk()).andReturn();

        assertThat(r.getResponse().getHeader("Cache-Control")).contains("public").contains("max-age=300")
            .doesNotContain("no-store");
        assertThat(r.getResponse().getHeader("ETag")).isNotBlank();
    }

    @Test
    void ifNoneMatchIgualDevolve304SemCorpo() throws Exception {
        String etag = mockMvc.perform(get(ROTA)).andReturn().getResponse().getHeader("ETag");

        MvcResult r = mockMvc.perform(get(ROTA).header("If-None-Match", etag))
            .andExpect(status().isNotModified()).andReturn();

        assertThat(r.getResponse().getContentAsString()).isEmpty();
    }

    // ---- seguranca: token invalido no endpoint publico ----

    @Test
    void tokenExpiradoNoEndpointPublicoContinuaDando200() throws Exception {
        assertThat(corpoCom(tokenExpirado())).contains("Filial Centro");
    }

    @Test
    void tokenAdulteradoNoEndpointPublicoContinuaDando200() throws Exception {
        String valido = tokenAssinado(segredoDaAplicacao, Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));
        String[] partes = valido.split("\\.");

        assertThat(corpoCom(partes[0] + "." + partes[1] + "." + "A".repeat(partes[2].length()))).contains("Filial Centro");
    }

    @Test
    void lixoNoCabecalhoNoEndpointPublicoContinuaDando200() throws Exception {
        assertThat(corpoCom("isto-nao-e-um-jwt")).contains("Filial Centro");
    }

    // ---- seguranca: o resto continua fechado ----

    @Test
    void lojasProximasSemTokenContinuaDando401() throws Exception {
        mockMvc.perform(get("/api/lojas/proximas")).andExpect(status().isUnauthorized());
    }

    @Test
    void lojasProximasComTokenExpiradoContinuaDando401() throws Exception {
        mockMvc.perform(get("/api/lojas/proximas").header("Authorization", "Bearer " + tokenExpirado()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void rotaProtegidaComTokenExpiradoContinuaDando401() throws Exception {
        mockMvc.perform(get("/api/favoritos").header("Authorization", "Bearer " + tokenExpirado()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void soOCaminhoExatoEPublico() throws Exception {
        mockMvc.perform(get("/api/lojas/filiais/qualquer")).andExpect(status().isUnauthorized());
    }
}
