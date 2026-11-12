package com.smartmarket.controller;

import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.model.Loja;
import com.smartmarket.model.Mercado;
import com.smartmarket.repository.LojaRepository;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.UsuarioRepository;
import com.smartmarket.service.geo.LocalizacaoCep;
import com.smartmarket.service.geo.ResolvedorCep;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Endpoints de localizacao e lojas proximas, com o banco H2 e a consulta de CEP simulada. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LocalizacaoControllerIntegrationTest {

    // Centro de Porto Alegre.
    private static final LocalizacaoCep PORTO_ALEGRE = new LocalizacaoCep("Porto Alegre", "RS", -30.0346, -51.2177);
    // Centro de Cachoeirinha (~15 km de Porto Alegre).
    private static final LocalizacaoCep CACHOEIRINHA = new LocalizacaoCep("Cachoeirinha", "RS", -29.9511, -51.0944);

    @Autowired private MockMvc mockMvc;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private MercadoRepository mercadoRepository;
    @Autowired private LojaRepository lojaRepository;
    @MockitoBean private ResolvedorCep resolvedorCep;

    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    private Mercado comFiliais;   // padrao + filial perto + filial longe
    private Mercado soPadrao;     // so a loja padrao
    private Loja perto;
    private Loja longe;
    private Loja padraoComFiliais;
    private Loja padraoSoPadrao;

    @BeforeEach
    void cenario() {
        String sufixo = UUID.randomUUID().toString().substring(0, 8);
        comFiliais = mercadoRepository.save(Mercado.builder().nome("Rede A " + sufixo).endereco("RS").ativo(true).build());
        soPadrao = mercadoRepository.save(Mercado.builder().nome("Rede B " + sufixo).endereco("RS").ativo(true).build());

        padraoComFiliais = loja(comFiliais, "Rede A padrao", Loja.CODIGO_PADRAO, null, null);
        perto = loja(comFiliais, "Rede A Centro", "f1", -30.0300, -51.2200);
        longe = loja(comFiliais, "Rede A Cachoeirinha", "f2", -29.9500, -51.0900);
        padraoSoPadrao = loja(soPadrao, "Rede B padrao", Loja.CODIGO_PADRAO, null, null);

        when(resolvedorCep.resolver(anyString())).thenReturn(Optional.empty());
    }

    /**
     * O H2 e compartilhado com as outras classes de teste, que apagam mercados com deleteAll():
     * lojas e usuarios daqui nao podem sobrar, senao a FK loja -> mercado derruba aqueles testes.
     */
    @AfterEach
    void limpa() {
        usuarioRepository.deleteAll(usuarioRepository.findAll().stream()
            .filter(u -> u.getEmail().startsWith("loc-")).toList());
        for (Mercado m : java.util.List.of(comFiliais, soPadrao)) {
            lojaRepository.deleteAll(lojaRepository.findByMercadoIdOrderByIdAsc(m.getId()));
            mercadoRepository.deleteById(m.getId());
        }
    }

    private Loja loja(Mercado mercado, String nome, String codigo, Double lat, Double lon) {
        return lojaRepository.save(Loja.builder().mercado(mercado).nome(nome).codigoExterno(codigo)
            .latitude(lat).longitude(lon).ativa(true).build());
    }

    /** Cadastra um usuario (com a consulta de CEP ja programada) e devolve o cabecalho Authorization. */
    private String cadastra(LocalizacaoCep local) throws Exception {
        when(resolvedorCep.resolver("90010000")).thenReturn(Optional.ofNullable(local));
        RegisterRequest r = new RegisterRequest();
        r.setNome("Usuario Loc");
        r.setEmail("loc-" + UUID.randomUUID() + "@email.com");
        r.setSenha("senha123");
        r.setCep("90010-000");
        String corpo = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(r)))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return "Bearer " + objectMapper.readTree(corpo).get("token").asText();
    }

    /** Linha de /api/lojas/proximas do mercado dado. */
    private String proximas(String auth) throws Exception {
        return mockMvc.perform(get("/api/lojas/proximas").header("Authorization", auth))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
    }

    private com.fasterxml.jackson.databind.JsonNode linhaDe(String corpo, Mercado mercado) throws Exception {
        for (com.fasterxml.jackson.databind.JsonNode no : objectMapper.readTree(corpo)) {
            if (no.get("mercadoId").asLong() == mercado.getId()) {
                return no;
            }
        }
        return null;
    }

    // ---------------------------------------------------------------- autenticacao

    @Test
    void todasAsRotasExigemLogin() throws Exception {
        mockMvc.perform(get("/api/lojas/proximas")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/usuarios/me/localizacao")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/usuarios/me/localizacao").contentType(MediaType.APPLICATION_JSON)
            .content("{\"cep\":\"90010-000\"}")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/usuarios/me/localizacao")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/usuarios/me/loja-preferida").contentType(MediaType.APPLICATION_JSON)
            .content("{\"lojaId\":1}")).andExpect(status().isUnauthorized());
    }

    // ---------------------------------------------------------------- lojas proximas

    @Test
    void devolveAFilialMaisProximaDeCadaRedeComADistancia() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);

        String corpo = proximas(auth);

        var a = linhaDe(corpo, comFiliais);
        assertThat(a.get("lojaId").asLong()).isEqualTo(perto.getId());
        assertThat(a.get("lojaNome").asText()).isEqualTo("Rede A Centro");
        assertThat(a.get("padrao").asBoolean()).isFalse();
        assertThat(a.get("preferida").asBoolean()).isFalse();
        assertThat(a.get("distanciaKm").asDouble()).isBetween(0.1, 2.0);
        // arredondada em 2 casas
        assertThat(a.get("distanciaKm").asDouble()).isEqualTo(Math.round(a.get("distanciaKm").asDouble() * 100) / 100.0);
    }

    @Test
    void mudandoDeLugarMudaAFilialEscolhida() throws Exception {
        String auth = cadastra(CACHOEIRINHA);

        var a = linhaDe(proximas(auth), comFiliais);

        assertThat(a.get("lojaId").asLong()).isEqualTo(longe.getId());
    }

    @Test
    void redeSemFilialCaiNaLojaPadraoSemDistancia() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);

        var b = linhaDe(proximas(auth), soPadrao);

        assertThat(b.get("lojaId").asLong()).isEqualTo(padraoSoPadrao.getId());
        assertThat(b.get("padrao").asBoolean()).isTrue();
        assertThat(b.get("distanciaKm").isNull()).isTrue();
    }

    @Test
    void semLocalizacaoResolvidaTodasAsRedesCaemNaLojaPadrao() throws Exception {
        String auth = cadastra(null);

        String corpo = proximas(auth);

        assertThat(linhaDe(corpo, comFiliais).get("lojaId").asLong()).isEqualTo(padraoComFiliais.getId());
        assertThat(linhaDe(corpo, soPadrao).get("lojaId").asLong()).isEqualTo(padraoSoPadrao.getId());
        assertThat(linhaDe(corpo, comFiliais).get("padrao").asBoolean()).isTrue();
        assertThat(linhaDe(corpo, comFiliais).get("distanciaKm").isNull()).isTrue();
    }

    @Test
    void apenasCidadeSemCoordenadasTambemCaiNaLojaPadrao() throws Exception {
        String auth = cadastra(new LocalizacaoCep("Porto Alegre", "RS", null, null));

        assertThat(linhaDe(proximas(auth), comFiliais).get("lojaId").asLong()).isEqualTo(padraoComFiliais.getId());
    }

    @Test
    void filialSemCoordenadasOuInativaNaoEhEscolhida() throws Exception {
        // a unica filial do mercado B nao tem coordenadas; a outra esta inativa
        loja(soPadrao, "Rede B sem coordenadas", "g1", null, null);
        Loja inativa = loja(soPadrao, "Rede B inativa", "g2", -30.0346, -51.2177);
        inativa.setAtiva(false);
        lojaRepository.save(inativa);
        String auth = cadastra(PORTO_ALEGRE);

        var b = linhaDe(proximas(auth), soPadrao);

        assertThat(b.get("lojaId").asLong()).isEqualTo(padraoSoPadrao.getId());
    }

    @Test
    void mercadoInativoNaoApareceNasLojasProximas() throws Exception {
        soPadrao.setAtivo(false);
        mercadoRepository.save(soPadrao);
        String auth = cadastra(PORTO_ALEGRE);

        assertThat(linhaDe(proximas(auth), soPadrao)).isNull();
        assertThat(linhaDe(proximas(auth), comFiliais)).isNotNull();
    }

    @Test
    void ordenaPorDistanciaComAsSemDistanciaNoFim() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);

        var linhas = objectMapper.readTree(proximas(auth));

        int posA = -1;
        int posB = -1;
        for (int i = 0; i < linhas.size(); i++) {
            long id = linhas.get(i).get("mercadoId").asLong();
            if (id == comFiliais.getId()) posA = i;
            if (id == soPadrao.getId()) posB = i;
        }
        assertThat(posA).isGreaterThanOrEqualTo(0);
        assertThat(posA).isLessThan(posB);
    }

    // ---------------------------------------------------------------- loja preferida

    @Test
    void lojaPreferidaTemPrioridadeSobreAMaisProxima() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);

        mockMvc.perform(put("/api/usuarios/me/loja-preferida").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"lojaId\":" + longe.getId() + "}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lojaPreferidaId").value(longe.getId()));

        var a = linhaDe(proximas(auth), comFiliais);
        assertThat(a.get("lojaId").asLong()).isEqualTo(longe.getId());
        assertThat(a.get("preferida").asBoolean()).isTrue();
        assertThat(a.get("distanciaKm").asDouble()).isGreaterThan(10.0);
        // as outras redes seguem a regra normal
        assertThat(linhaDe(proximas(auth), soPadrao).get("preferida").asBoolean()).isFalse();
    }

    @Test
    void lojaIdNuloRemoveAPreferencia() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);
        mockMvc.perform(put("/api/usuarios/me/loja-preferida").header("Authorization", auth)
            .contentType(MediaType.APPLICATION_JSON).content("{\"lojaId\":" + longe.getId() + "}"));

        mockMvc.perform(put("/api/usuarios/me/loja-preferida").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"lojaId\":null}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lojaPreferidaId").doesNotExist());

        assertThat(linhaDe(proximas(auth), comFiliais).get("lojaId").asLong()).isEqualTo(perto.getId());
    }

    @Test
    void lojaPreferidaInexistenteOuInativaDa404() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);
        Loja inativa = loja(comFiliais, "Rede A fechada", "f9", -30.0, -51.0);
        inativa.setAtiva(false);
        lojaRepository.save(inativa);

        mockMvc.perform(put("/api/usuarios/me/loja-preferida").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"lojaId\":999999}"))
            .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/usuarios/me/loja-preferida").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"lojaId\":" + inativa.getId() + "}"))
            .andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------- localizacao: ler, trocar, excluir

    @Test
    void lerDevolveALocalizacaoDoCadastro() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);

        mockMvc.perform(get("/api/usuarios/me/localizacao").header("Authorization", auth))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.cep").value("90010000"))
            .andExpect(jsonPath("$.cidade").value("Porto Alegre"))
            .andExpect(jsonPath("$.uf").value("RS"))
            .andExpect(jsonPath("$.latitude").value(-30.0346))
            .andExpect(jsonPath("$.resolvida").value(true));
    }

    @Test
    void trocarOCepResolveDeNovoEMudaAsLojasProximas() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);
        when(resolvedorCep.resolver("94950000")).thenReturn(Optional.of(CACHOEIRINHA));

        mockMvc.perform(put("/api/usuarios/me/localizacao").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"cep\":\"94950-000\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.cep").value("94950000"))
            .andExpect(jsonPath("$.cidade").value("Cachoeirinha"))
            .andExpect(jsonPath("$.resolvida").value(true));

        assertThat(linhaDe(proximas(auth), comFiliais).get("lojaId").asLong()).isEqualTo(longe.getId());
    }

    @Test
    void trocarParaCepNaoResolvidoLimpaAsCoordenadasAntigas() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);
        when(resolvedorCep.resolver("99999999")).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/usuarios/me/localizacao").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"cep\":\"99999999\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.cep").value("99999999"))
            .andExpect(jsonPath("$.cidade").doesNotExist())
            .andExpect(jsonPath("$.latitude").doesNotExist())
            .andExpect(jsonPath("$.resolvida").value(false));

        // sem coordenadas, volta para a loja padrao
        assertThat(linhaDe(proximas(auth), comFiliais).get("lojaId").asLong()).isEqualTo(padraoComFiliais.getId());
    }

    @Test
    void trocarParaCepMalFormadoDa400EMantemOAntigo() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);

        mockMvc.perform(put("/api/usuarios/me/localizacao").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"cep\":\"123\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.campos.cep").exists());
        mockMvc.perform(put("/api/usuarios/me/localizacao").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.campos.cep").value("CEP e obrigatorio"));

        mockMvc.perform(get("/api/usuarios/me/localizacao").header("Authorization", auth))
            .andExpect(jsonPath("$.cep").value("90010000"));
    }

    @Test
    void excluirZeraALocalizacaoSemApagarAContaNemALojaPreferida() throws Exception {
        String auth = cadastra(PORTO_ALEGRE);
        mockMvc.perform(put("/api/usuarios/me/loja-preferida").header("Authorization", auth)
            .contentType(MediaType.APPLICATION_JSON).content("{\"lojaId\":" + longe.getId() + "}"));

        mockMvc.perform(delete("/api/usuarios/me/localizacao").header("Authorization", auth))
            .andExpect(status().isNoContent());

        ResultActions depois = mockMvc.perform(get("/api/usuarios/me/localizacao").header("Authorization", auth));
        depois.andExpect(status().isOk())
            .andExpect(jsonPath("$.cep").doesNotExist())
            .andExpect(jsonPath("$.cidade").doesNotExist())
            .andExpect(jsonPath("$.uf").doesNotExist())
            .andExpect(jsonPath("$.latitude").doesNotExist())
            .andExpect(jsonPath("$.longitude").doesNotExist())
            .andExpect(jsonPath("$.resolvida").value(false))
            .andExpect(jsonPath("$.lojaPreferidaId").value(longe.getId()));
        // a conta continua valida
        mockMvc.perform(get("/api/auth/me").header("Authorization", auth)).andExpect(status().isOk());
        assertThat(usuarioRepository.count()).isPositive();
    }

    @Test
    void excluirDeNovoContinuaSendoSucesso() throws Exception {
        String auth = cadastra(null);

        mockMvc.perform(delete("/api/usuarios/me/localizacao").header("Authorization", auth))
            .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/usuarios/me/localizacao").header("Authorization", auth))
            .andExpect(status().isNoContent());
    }
}
