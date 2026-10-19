package com.smartmarket.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartmarket.dto.auth.LoginRequest;
import com.smartmarket.dto.produto.ProdutoRequest;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProdutoControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String tokenUser;
    private String tokenAdmin;
    private Long idArroz;

    @BeforeEach
    void setUp() throws Exception {
        produtoRepository.deleteAll();

        List<Produto> produtos = produtoRepository.saveAll(List.of(
            Produto.builder().nome("Arroz Tio João 5kg").marca("Tio João")
                .quantidade(5.0).unidade("kg").codigoBarras("7891234567890")
                .categoria("mercearia").build(),
            Produto.builder().nome("Feijão Carioca 1kg").marca("Kicaldo")
                .quantidade(1.0).unidade("kg").codigoBarras("7898123456789")
                .categoria("mercearia").build(),
            Produto.builder().nome("Leite Ninho 400g").marca("Nestlé")
                .quantidade(400.0).unidade("g").codigoBarras("7891000100103")
                .categoria("laticinios").build()
        ));

        idArroz = produtos.get(0).getId();

        tokenUser = obterToken("catalogo-user@email.com", "senha123", "Usuario Catalogo", Papel.USER);
        tokenAdmin = obterToken("catalogo-admin@email.com", "senha123", "Admin Catalogo", Papel.ADMIN);
    }

    private String obterToken(String email, String senha, String nome, Papel papel) throws Exception {
        if (!usuarioRepository.existsByEmail(email)) {
            usuarioRepository.save(Usuario.builder()
                .nome(nome)
                .email(email)
                .senha(passwordEncoder.encode(senha))
                .papel(papel)
                .build());
        }

        LoginRequest login = new LoginRequest();
        login.setEmail(email);
        login.setSenha(senha);

        MvcResult resultado = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isOk())
            .andReturn();

        return objectMapper.readTree(resultado.getResponse().getContentAsString())
            .get("token").asText();
    }

    private String produtoJson(String nome, String categoria) throws Exception {
        ProdutoRequest request = ProdutoRequest.builder()
            .nome(nome)
            .marca("Marca X")
            .quantidade(1.0)
            .unidade("un")
            .codigoBarras("7890000000000")
            .categoria(categoria)
            .build();
        return objectMapper.writeValueAsString(request);
    }

    @Test
    void listar_SemToken_DeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/produtos"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void listar_ComToken_DeveRetornar200EPaginacao() throws Exception {
        mockMvc.perform(get("/api/produtos").header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(3))
            .andExpect(jsonPath("$.totalElements").value(3))
            .andExpect(jsonPath("$.totalPages").value(1))
            .andExpect(jsonPath("$.content[0].nome").isNotEmpty())
            .andExpect(jsonPath("$.content[0].nomeNormalizado").doesNotExist());
    }

    @Test
    void listar_ComFiltroDeNome_DeveFiltrarPorTexto() throws Exception {
        mockMvc.perform(get("/api/produtos")
                .param("nome", "arroz")
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].nome").value("Arroz Tio João 5kg"));
    }

    @Test
    void listar_ComFiltroSemAcento_DeveEncontrarProdutoComAcento() throws Exception {
        mockMvc.perform(get("/api/produtos")
                .param("nome", "ARROZ TIO JOAO")
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].nome").value("Arroz Tio João 5kg"));
    }

    @Test
    void listar_ComFiltroDeCategoria_DeveFiltrarPorCategoria() throws Exception {
        mockMvc.perform(get("/api/produtos")
                .param("categoria", "mercearia")
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void listar_ComNomeECategoria_DeveCombinarFiltros() throws Exception {
        mockMvc.perform(get("/api/produtos")
                .param("nome", "feijao")
                .param("categoria", "mercearia")
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].nome").value("Feijão Carioca 1kg"));
    }

    @Test
    void listar_ComOrdenacaoDescendente_DeveOrdenarPorNome() throws Exception {
        mockMvc.perform(get("/api/produtos")
                .param("sort", "nome,desc")
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].nome").value("Leite Ninho 400g"));
    }

    @Test
    void listar_ComOrdenacaoInvalida_DeveRetornar400() throws Exception {
        mockMvc.perform(get("/api/produtos")
                .param("sort", "campoInvalido,asc")
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").isNotEmpty());
    }

    @Test
    void listar_PaginaForaDoRange_DeveRetornarVazia() throws Exception {
        mockMvc.perform(get("/api/produtos")
                .param("page", "99")
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isEmpty())
            .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    void buscarPorId_DeveRetornarProduto() throws Exception {
        mockMvc.perform(get("/api/produtos/" + idArroz)
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(idArroz))
            .andExpect(jsonPath("$.nome").value("Arroz Tio João 5kg"))
            .andExpect(jsonPath("$.categoria").value("mercearia"));
    }

    @Test
    void buscarPorId_Inexistente_DeveRetornar404() throws Exception {
        mockMvc.perform(get("/api/produtos/9999")
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.erro").isNotEmpty());
    }

    @Test
    void criar_SemToken_DeveRetornar401() throws Exception {
        mockMvc.perform(post("/api/produtos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(produtoJson("Produto Novo", "mercearia")))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void criar_ComTokenUser_DeveRetornar403() throws Exception {
        mockMvc.perform(post("/api/produtos")
                .header("Authorization", "Bearer " + tokenUser)
                .contentType(MediaType.APPLICATION_JSON)
                .content(produtoJson("Produto Novo", "mercearia")))
            .andExpect(status().isForbidden());
    }

    @Test
    void criar_ComTokenAdmin_DeveRetornar201() throws Exception {
        mockMvc.perform(post("/api/produtos")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(produtoJson("Produto Novo", "mercearia")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.nome").value("Produto Novo"))
            .andExpect(jsonPath("$.categoria").value("mercearia"));
    }

    @Test
    void criar_SemCamposObrigatorios_DeveRetornar400() throws Exception {
        mockMvc.perform(post("/api/produtos")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Dados invalidos"))
            .andExpect(jsonPath("$.campos.nome").isNotEmpty())
            .andExpect(jsonPath("$.campos.categoria").isNotEmpty());
    }

    @Test
    void atualizar_ComTokenAdmin_DeveRetornar200() throws Exception {
        mockMvc.perform(put("/api/produtos/" + idArroz)
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(produtoJson("Arroz Integral 1kg", "mercearia")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nome").value("Arroz Integral 1kg"));
    }

    @Test
    void atualizar_Inexistente_DeveRetornar404() throws Exception {
        mockMvc.perform(put("/api/produtos/9999")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(produtoJson("Produto", "mercearia")))
            .andExpect(status().isNotFound());
    }

    @Test
    void remover_ComTokenAdmin_DeveRetornar200EDepois404() throws Exception {
        mockMvc.perform(delete("/api/produtos/" + idArroz)
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/produtos/" + idArroz)
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isNotFound());
    }

    @Test
    void remover_ComTokenUser_DeveRetornar403() throws Exception {
        mockMvc.perform(delete("/api/produtos/" + idArroz)
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isForbidden());
    }
}
