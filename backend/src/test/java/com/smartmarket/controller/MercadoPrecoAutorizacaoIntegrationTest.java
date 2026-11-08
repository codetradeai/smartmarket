package com.smartmarket.controller;

import com.fasterxml.jackson.databind.json.JsonMapper;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.ProdutoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regras de autorizacao que vivem so no SecurityConfig: escritas em mercados, precos e produtos
 * e GET /api/mercados/todos sao exclusivas de ADMIN; leituras do catalogo sao publicas.
 * Se alguem reordenar ou apagar uma linha do authorizeHttpRequests, estes testes quebram.
 *
 * <p>Usa jwt() de spring-security-test: injeta a autenticacao direto, sem passar pelo login, o que
 * isola a regra de rota da emissao e da validacao do token (essas tem teste proprio em
 * JwtAutenticacaoIntegrationTest).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MercadoPrecoAutorizacaoIntegrationTest {

    private static final String CORPO_MERCADO = "{\"nome\":\"Mercado Autorizacao\"}";
    private static final String CORPO_PRODUTO = "{\"nome\":\"Produto Autorizacao\",\"categoria\":\"mercearia\"}";

    @Autowired private MockMvc mockMvc;
    @Autowired private MercadoRepository mercadoRepository;
    @Autowired private ProdutoRepository produtoRepository;
    @Autowired private PrecoRepository precoRepository;

    private Long mercadoId;
    private Long produtoId;
    private Long precoId;

    @BeforeEach
    void criarDados() {
        precoRepository.deleteAll();
        produtoRepository.deleteAll();
        mercadoRepository.deleteAll();
        mercadoId = mercadoRepository.save(Mercado.builder().nome("Mercado Base").ativo(true).build()).getId();
        Produto produto = produtoRepository.save(Produto.builder().nome("Produto Base").categoria("mercearia").build());
        produtoId = produto.getId();
        precoId = precoRepository.save(Preco.builder()
            .produto(produto)
            .mercado(mercadoRepository.findById(mercadoId).orElseThrow())
            .valor(new BigDecimal("5.00"))
            .coletadoEm(LocalDateTime.now())
            .disponivel(true)
            .build()).getId();
    }

    @AfterEach
    void limpar() {
        precoRepository.deleteAll();
        produtoRepository.deleteAll();
        mercadoRepository.deleteAll();
    }

    private static RequestPostProcessor usuario() {
        return jwt().jwt(j -> j.subject("usuario@email.com"))
            .authorities(new SimpleGrantedAuthority("ROLE_USER"));
    }

    private static RequestPostProcessor admin() {
        return jwt().jwt(j -> j.subject("admin@email.com"))
            .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private String corpoPreco() {
        return "{\"produtoId\":" + produtoId + ",\"mercadoId\":" + mercadoId + ",\"valor\":7.50}";
    }

    // ------------------------------------------------------------------
    // Mercados
    // ------------------------------------------------------------------

    @Test
    void mercados_EscritaSemTokenRetorna401() throws Exception {
        mockMvc.perform(post("/api/mercados").contentType(MediaType.APPLICATION_JSON).content(CORPO_MERCADO))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/mercados/" + mercadoId).contentType(MediaType.APPLICATION_JSON).content(CORPO_MERCADO))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/mercados/" + mercadoId))
            .andExpect(status().isUnauthorized());
        assertThat(mercadoRepository.findById(mercadoId)).isPresent();
    }

    @Test
    void mercados_EscritaComUserRetorna403() throws Exception {
        mockMvc.perform(post("/api/mercados").with(usuario())
                .contentType(MediaType.APPLICATION_JSON).content(CORPO_MERCADO))
            .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/mercados/" + mercadoId).with(usuario())
                .contentType(MediaType.APPLICATION_JSON).content(CORPO_MERCADO))
            .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/mercados/" + mercadoId).with(usuario()))
            .andExpect(status().isForbidden());
        assertThat(mercadoRepository.findById(mercadoId)).isPresent();
        assertThat(mercadoRepository.count()).isEqualTo(1);
    }

    @Test
    void mercados_EscritaComAdminFunciona() throws Exception {
        String criado = mockMvc.perform(post("/api/mercados").with(admin())
                .contentType(MediaType.APPLICATION_JSON).content(CORPO_MERCADO))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.nome").value("Mercado Autorizacao"))
            .andReturn().getResponse().getContentAsString();
        long novoId = JsonMapper.builder().build().readTree(criado).get("id").asLong();

        mockMvc.perform(put("/api/mercados/" + novoId).with(admin())
                .contentType(MediaType.APPLICATION_JSON).content("{\"nome\":\"Renomeado\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nome").value("Renomeado"));
        mockMvc.perform(delete("/api/mercados/" + novoId).with(admin()))
            .andExpect(status().isOk());
        assertThat(mercadoRepository.findById(novoId)).isEmpty();
    }

    @Test
    void mercados_ListaCompletaComInativosEExclusivaDeAdmin() throws Exception {
        mockMvc.perform(get("/api/mercados/todos"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/mercados/todos").with(usuario()))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/mercados/todos").with(admin()))
            .andExpect(status().isOk());
    }

    @Test
    void mercados_LeituraDeMercadosAtivosContinuaPublica() throws Exception {
        mockMvc.perform(get("/api/mercados"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/mercados/" + mercadoId))
            .andExpect(status().isOk());
    }

    // ------------------------------------------------------------------
    // Precos
    // ------------------------------------------------------------------

    @Test
    void precos_EscritaSemTokenRetorna401() throws Exception {
        mockMvc.perform(post("/api/precos").contentType(MediaType.APPLICATION_JSON).content(corpoPreco()))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/precos/" + precoId).contentType(MediaType.APPLICATION_JSON).content(corpoPreco()))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/precos/" + precoId))
            .andExpect(status().isUnauthorized());
        assertThat(precoRepository.findById(precoId)).isPresent();
    }

    @Test
    void precos_EscritaComUserRetorna403() throws Exception {
        mockMvc.perform(post("/api/precos").with(usuario())
                .contentType(MediaType.APPLICATION_JSON).content(corpoPreco()))
            .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/precos/" + precoId).with(usuario())
                .contentType(MediaType.APPLICATION_JSON).content(corpoPreco()))
            .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/precos/" + precoId).with(usuario()))
            .andExpect(status().isForbidden());
        assertThat(precoRepository.findById(precoId)).isPresent();
        assertThat(precoRepository.count()).isEqualTo(1);
    }

    @Test
    void precos_EscritaComAdminFunciona() throws Exception {
        mockMvc.perform(post("/api/precos").with(admin())
                .contentType(MediaType.APPLICATION_JSON).content(corpoPreco()))
            .andExpect(status().isCreated());
        assertThat(precoRepository.count()).isEqualTo(2);

        mockMvc.perform(delete("/api/precos/" + precoId).with(admin()))
            .andExpect(status().isOk());
        assertThat(precoRepository.findById(precoId)).isEmpty();
    }

    @Test
    void precos_LeituraDoCatalogoContinuaPublica() throws Exception {
        mockMvc.perform(get("/api/precos/produto/" + produtoId))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/precos/catalogo"))
            .andExpect(status().isOk());
    }

    // ------------------------------------------------------------------
    // Produtos (o PUT nao tinha teste de papel)
    // ------------------------------------------------------------------

    @Test
    void produtos_AtualizarSemTokenRetorna401EComUserRetorna403() throws Exception {
        mockMvc.perform(put("/api/produtos/" + produtoId)
                .contentType(MediaType.APPLICATION_JSON).content(CORPO_PRODUTO))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/produtos/" + produtoId).with(usuario())
                .contentType(MediaType.APPLICATION_JSON).content(CORPO_PRODUTO))
            .andExpect(status().isForbidden());
        assertThat(produtoRepository.findById(produtoId).orElseThrow().getNome()).isEqualTo("Produto Base");
    }

    @Test
    void produtos_AtualizarComAdminFunciona() throws Exception {
        mockMvc.perform(put("/api/produtos/" + produtoId).with(admin())
                .contentType(MediaType.APPLICATION_JSON).content(CORPO_PRODUTO))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nome").value("Produto Autorizacao"));
    }
}
