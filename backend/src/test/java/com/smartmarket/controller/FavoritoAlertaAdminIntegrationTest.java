package com.smartmarket.controller;

import com.smartmarket.model.Mercado;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.AlertaRepository;
import com.smartmarket.repository.FavoritoRepository;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.PromocaoRepository;
import com.smartmarket.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FavoritoAlertaAdminIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private MercadoRepository mercadoRepository;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private PrecoRepository precoRepository;

    @Autowired
    private FavoritoRepository favoritoRepository;

    @Autowired
    private AlertaRepository alertaRepository;

    @Autowired
    private PromocaoRepository promocaoRepository;

    private String tokenUser;
    private String tokenOutro;
    private String tokenAdmin;
    private Long mercadoId;
    private Long produtoId;

    @BeforeEach
    void setUp() throws Exception {
        limpar();
        Mercado mercado = mercadoRepository.save(Mercado.builder()
            .nome("Fort Atacadista")
            .endereco("Av. Assis Brasil, 2615")
            .ativo(true)
            .build());
        mercadoId = mercado.getId();

        Produto produto = produtoRepository.save(Produto.builder()
            .nome("Arroz Branco 1kg")
            .marca("Urbano")
            .quantidade(1.0)
            .unidade("kg")
            .categoria("Graos")
            .build());
        produtoId = produto.getId();

        Mercado big = mercadoRepository.save(Mercado.builder()
            .nome("Big Bompreco")
            .ativo(true)
            .build());

        precoRepository.save(Preco.builder()
            .produto(produto).mercado(mercado).valor(new BigDecimal("4.00"))
            .coletadoEm(LocalDateTime.of(2026, 8, 24, 19, 0)).disponivel(true).build());
        precoRepository.save(Preco.builder()
            .produto(produto).mercado(mercado).valor(new BigDecimal("8.00"))
            .coletadoEm(LocalDateTime.of(2026, 9, 7, 19, 0)).disponivel(true).build());
        precoRepository.save(Preco.builder()
            .produto(produto).mercado(big).valor(new BigDecimal("9.50"))
            .coletadoEm(LocalDateTime.of(2026, 9, 7, 19, 0)).disponivel(true).build());
        precoRepository.save(Preco.builder()
            .produto(produto).mercado(big).valor(new BigDecimal("3.00"))
            .coletadoEm(LocalDateTime.of(2026, 9, 21, 19, 0)).disponivel(false).build());

        tokenUser = token("fav-user@email.com", "Usuario Favorito", Papel.USER);
        tokenOutro = token("fav-outro@email.com", "Outro Usuario", Papel.USER);
        tokenAdmin = token("fav-admin@email.com", "Admin Favorito", Papel.ADMIN);
    }

    @AfterEach
    void limparDepois() {
        limpar();
    }

    @Test
    void favoritarMercado_DeveListarSemDuplicarERemover() throws Exception {
        mockMvc.perform(post("/api/favoritos")
                .header("Authorization", "Bearer " + tokenUser)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"mercadoId\":" + mercadoId + "}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.mercado.nome").value("Fort Atacadista"));

        mockMvc.perform(post("/api/favoritos")
                .header("Authorization", "Bearer " + tokenUser)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"mercadoId\":" + mercadoId + "}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/favoritos").header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(get("/api/favoritos").header("Authorization", "Bearer " + tokenOutro))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(delete("/api/favoritos/mercados/" + mercadoId)
                .header("Authorization", "Bearer " + tokenOutro))
            .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/favoritos/mercados/" + mercadoId)
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/favoritos").header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void favoritar_SemToken_DeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/favoritos"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void alerta_DeveUsarMenorPrecoDisponivelMaisRecente() throws Exception {
        MvcResult criado = mockMvc.perform(post("/api/alertas")
                .header("Authorization", "Bearer " + tokenUser)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"produtoId\":" + produtoId + ",\"precoAlvo\":8.00}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.menorPreco").value(8.00))
            .andExpect(jsonPath("$.mercadoMenorPrecoNome").value("Fort Atacadista"))
            .andExpect(jsonPath("$.atingido").value(true))
            .andReturn();

        int alertaId = com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
            .readTree(criado.getResponse().getContentAsString())
            .get("id").asInt();

        mockMvc.perform(post("/api/alertas")
                .header("Authorization", "Bearer " + tokenUser)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"produtoId\":" + produtoId + ",\"precoAlvo\":7.00}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(alertaId))
            .andExpect(jsonPath("$.atingido").value(false));

        mockMvc.perform(get("/api/alertas").header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(delete("/api/alertas/" + alertaId)
                .header("Authorization", "Bearer " + tokenOutro))
            .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/alertas/" + alertaId)
                .header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/alertas").header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void painelAdmin_UsuarioComumRecebe403EAdminAcessa() throws Exception {
        mockMvc.perform(get("/api/admin/painel").header("Authorization", "Bearer " + tokenUser))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/painel").header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.produtos").value(1))
            .andExpect(jsonPath("$.mercadosAtivos").value(2));
    }

    @Test
    void promocao_RejeitaPeriodoInvalidoEGravaPeriodoValido() throws Exception {
        String invalida = """
            {"produtoId":%d,"mercadoId":%d,"valorOriginal":10.00,"valorPromocional":8.00,"dataInicio":"2026-10-20","dataFim":"2026-10-01"}
            """.formatted(produtoId, mercadoId);

        mockMvc.perform(post("/api/admin/promocoes")
                .header("Authorization", "Bearer " + tokenUser)
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalida))
            .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/promocoes")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalida))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("A data de inicio nao pode ser posterior a data de fim."));

        String valida = """
            {"produtoId":%d,"mercadoId":%d,"valorOriginal":10.00,"valorPromocional":8.50,"dataInicio":"2026-10-01","dataFim":"2026-10-31"}
            """.formatted(produtoId, mercadoId);

        mockMvc.perform(post("/api/admin/promocoes")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(valida))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.produtoId").value(produtoId))
            .andExpect(jsonPath("$.mercadoId").value(mercadoId))
            .andExpect(jsonPath("$.valorPromocional").value(8.50));
    }

    @Test
    void alterarPapel_NaoPermiteOProprioAdministrador() throws Exception {
        MvcResult me = mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andReturn();
        int adminId = com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
            .readTree(me.getResponse().getContentAsString())
            .get("id").asInt();

        mockMvc.perform(patch("/api/admin/usuarios/" + adminId + "/papel")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"papel\":\"USER\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.erro").value("Voce nao pode alterar o proprio papel."));

        Usuario outro = usuarioRepository.findByEmail("fav-user@email.com").orElseThrow();
        mockMvc.perform(patch("/api/admin/usuarios/" + outro.getId() + "/papel")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"papel\":\"ADMIN\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.papel").value("ADMIN"));
    }

    private String token(String email, String nome, Papel papel) throws Exception {
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);
        if (usuario == null) {
            usuarioRepository.save(Usuario.builder()
                .nome(nome)
                .email(email)
                .senha(passwordEncoder.encode("senha123"))
                .papel(papel)
                .build());
        } else if (usuario.getPapel() != papel) {
            usuario.setPapel(papel);
            usuarioRepository.save(usuario);
        }

        MvcResult resultado = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"senha\":\"senha123\"}"))
            .andExpect(status().isOk())
            .andReturn();

        return com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
            .readTree(resultado.getResponse().getContentAsString())
            .get("token").asText();
    }

    private void limpar() {
        promocaoRepository.deleteAll();
        alertaRepository.deleteAll();
        favoritoRepository.deleteAll();
        precoRepository.deleteAll();
        produtoRepository.deleteAll();
        mercadoRepository.deleteAll();
    }
}
