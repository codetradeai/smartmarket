package com.smartmarket.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartmarket.dto.auth.RegisterRequest;
import com.smartmarket.dto.lista.ItemListaRequest;
import com.smartmarket.dto.lista.ListaRequest;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Promocao;
import com.smartmarket.repository.ItemListaRepository;
import com.smartmarket.repository.ListaCompraRepository;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.PromocaoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ListaCompraControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private MercadoRepository mercadoRepository;

    @Autowired
    private PrecoRepository precoRepository;

    @Autowired
    private PromocaoRepository promocaoRepository;

    @Autowired
    private ListaCompraRepository listaCompraRepository;

    @Autowired
    private ItemListaRepository itemListaRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final AtomicInteger SEQUENCIA = new AtomicInteger();

    private String token;
    private String tokenOutroUsuario;
    private Long idLista;
    private Long idArroz;
    private Long idFeijao;

    @BeforeEach
    void setUp() throws Exception {
        limparECriarDados();

        token = registrar("lista-user-" + SEQUENCIA.incrementAndGet() + "@email.com");
        tokenOutroUsuario = registrar("lista-outro-" + SEQUENCIA.incrementAndGet() + "@email.com");

        idLista = criarLista(token, "Churrasco", List.of(
            new ItemListaRequest(idArroz, 1),
            new ItemListaRequest(idFeijao, 1)));
    }

    private void limparECriarDados() {
        promocaoRepository.deleteAll();
        precoRepository.deleteAll();
        itemListaRepository.deleteAll();
        listaCompraRepository.deleteAll();
        produtoRepository.deleteAll();
        mercadoRepository.deleteAll();

        Long idFort = mercadoRepository.save(Mercado.builder()
            .nome("Fort Atacadista").ativo(true).build()).getId();
        Long idCarrefour = mercadoRepository.save(Mercado.builder()
            .nome("Carrefour").ativo(true).build()).getId();
        Long idAssai = mercadoRepository.save(Mercado.builder()
            .nome("Assai").ativo(true).build()).getId();

        idArroz = produtoRepository.save(Produto.builder()
            .nome("Arroz Tio João 5kg").categoria("mercearia").build()).getId();
        idFeijao = produtoRepository.save(Produto.builder()
            .nome("Feijão Carioca 1kg").categoria("mercearia").build()).getId();

        salvarPreco(idArroz, idFort, "9.99", LocalDateTime.now().minusDays(3));
        salvarPreco(idArroz, idFort, "5.00", LocalDateTime.now());
        salvarPreco(idFeijao, idFort, "4.00", LocalDateTime.now());

        salvarPreco(idArroz, idCarrefour, "6.00", LocalDateTime.now());

        salvarPreco(idArroz, idAssai, "8.00", LocalDateTime.now());
        salvarPreco(idFeijao, idAssai, "7.00", LocalDateTime.now());

        promocaoRepository.save(Promocao.builder()
            .produto(produtoRepository.findById(idArroz).orElseThrow())
            .mercado(mercadoRepository.findById(idCarrefour).orElseThrow())
            .valorOriginal(new BigDecimal("6.00"))
            .valorPromocional(new BigDecimal("4.50"))
            .dataInicio(LocalDate.now().minusDays(1))
            .dataFim(LocalDate.now().plusDays(1))
            .coletadoEm(LocalDateTime.now())
            .build());

        promocaoRepository.save(Promocao.builder()
            .produto(produtoRepository.findById(idFeijao).orElseThrow())
            .mercado(mercadoRepository.findById(idAssai).orElseThrow())
            .valorOriginal(new BigDecimal("7.00"))
            .valorPromocional(new BigDecimal("1.00"))
            .dataInicio(LocalDate.now().minusDays(10))
            .dataFim(LocalDate.now().minusDays(5))
            .coletadoEm(LocalDateTime.now())
            .build());
    }

    private void salvarPreco(Long produtoId, Long mercadoId, String valor, LocalDateTime coletadoEm) {
        precoRepository.save(Preco.builder()
            .produto(produtoRepository.findById(produtoId).orElseThrow())
            .mercado(mercadoRepository.findById(mercadoId).orElseThrow())
            .valor(new BigDecimal(valor))
            .coletadoEm(coletadoEm)
            .disponivel(true)
            .build());
    }

    private String registrar(String email) throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setNome("Usuario Lista");
        request.setEmail(email);
        request.setSenha("senha123");

        MvcResult resultado = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andReturn();

        return objectMapper.readTree(resultado.getResponse().getContentAsString())
            .get("token").asText();
    }

    private Long criarLista(String token, String nome, List<ItemListaRequest> itens) throws Exception {
        ListaRequest request = new ListaRequest(nome, itens);

        MvcResult resultado = mockMvc.perform(post("/api/listas")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        return objectMapper.readTree(resultado.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void listar_SemToken_DeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/listas"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void criarLista_ComToken_DeveRetornar201ComItens() throws Exception {
        ListaRequest request = new ListaRequest("Mercado Semanal", List.of(new ItemListaRequest(idArroz, 2)));

        mockMvc.perform(post("/api/listas")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.nome").value("Mercado Semanal"))
            .andExpect(jsonPath("$.totalItens").value(1));
    }

    @Test
    void criarLista_SemNome_DeveRetornar400() throws Exception {
        mockMvc.perform(post("/api/listas")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.campos.nome").isNotEmpty());
    }

    @Test
    void listar_ComToken_DeveRetornarListasDoUsuario() throws Exception {
        mockMvc.perform(get("/api/listas")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].nome").value("Churrasco"))
            .andExpect(jsonPath("$[0].totalItens").value(2));
    }

    @Test
    void buscarPorId_DeveRetornarDetalheComItens() throws Exception {
        mockMvc.perform(get("/api/listas/" + idLista)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nome").value("Churrasco"))
            .andExpect(jsonPath("$.itens.length()").value(2))
            .andExpect(jsonPath("$.itens[0].produtoNome").isNotEmpty())
            .andExpect(jsonPath("$.itens[0].quantidade").isNumber());
    }

    @Test
    void buscarPorId_DeListaDeOutroUsuario_DeveRetornar404() throws Exception {
        mockMvc.perform(get("/api/listas/" + idLista)
                .header("Authorization", "Bearer " + tokenOutroUsuario))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.erro").isNotEmpty());
    }

    @Test
    void renomear_DeveRetornar200ComNomeNovo() throws Exception {
        mockMvc.perform(put("/api/listas/" + idLista)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ListaRequest("Natal", List.of()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nome").value("Natal"));
    }

    @Test
    void remover_DeveRetornar200EDepois404() throws Exception {
        mockMvc.perform(delete("/api/listas/" + idLista)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/listas/" + idLista)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());
    }

    @Test
    void adicionarItem_DeveRetornar201() throws Exception {
        mockMvc.perform(post("/api/listas/" + idLista + "/itens")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ItemListaRequest(idArroz, 3))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.quantidade").value(4));
    }

    @Test
    void adicionarItem_Duplicado_DeveSomarQuantidade() throws Exception {
        mockMvc.perform(post("/api/listas/" + idLista + "/itens")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ItemListaRequest(idArroz, 3))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.quantidade").value(4));

        mockMvc.perform(get("/api/listas/" + idLista)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalItens").value(2));
    }

    @Test
    void adicionarItem_ProdutoInexistente_DeveRetornar404() throws Exception {
        mockMvc.perform(post("/api/listas/" + idLista + "/itens")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ItemListaRequest(9999L, 1))))
            .andExpect(status().isNotFound());
    }

    @Test
    void adicionarItem_QuantidadeInvalida_DeveRetornar400() throws Exception {
        mockMvc.perform(post("/api/listas/" + idLista + "/itens")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ItemListaRequest(idArroz, 0))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.campos.quantidade").isNotEmpty());
    }

    @Test
    void atualizarItem_DeveAlterarQuantidade() throws Exception {
        MvcResult detalhe = mockMvc.perform(get("/api/listas/" + idLista)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        long idItem = objectMapper.readTree(detalhe.getResponse().getContentAsString())
            .get("itens").get(0).get("id").asLong();

        mockMvc.perform(put("/api/listas/" + idLista + "/itens/" + idItem)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ItemListaRequest(idArroz, 5))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.quantidade").value(5));
    }

    @Test
    void removerItem_DeveRetornar200EDepois404() throws Exception {
        MvcResult detalhe = mockMvc.perform(get("/api/listas/" + idLista)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        long idItem = objectMapper.readTree(detalhe.getResponse().getContentAsString())
            .get("itens").get(0).get("id").asLong();

        mockMvc.perform(delete("/api/listas/" + idLista + "/itens/" + idItem)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        mockMvc.perform(delete("/api/listas/" + idLista + "/itens/" + idItem)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/listas/" + idLista)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalItens").value(1));
    }

    @Test
    void comparacao_DeveRetornarMercadosOrdenadosComMaisBarato() throws Exception {
        mockMvc.perform(get("/api/listas/" + idLista + "/comparacao")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.listaId").value(idLista))
            .andExpect(jsonPath("$.totalItens").value(2))
            .andExpect(jsonPath("$.comparacoes.length()").value(3))
            .andExpect(jsonPath("$.comparacoes[0].mercadoNome").value("Fort Atacadista"))
            .andExpect(jsonPath("$.comparacoes[0].valorTotal").value(9.0))
            .andExpect(jsonPath("$.comparacoes[0].completo").value(true))
            .andExpect(jsonPath("$.comparacoes[0].maisBarato").value(true))
            .andExpect(jsonPath("$.comparacoes[1].mercadoNome").value("Assai"))
            .andExpect(jsonPath("$.comparacoes[1].valorTotal").value(15.0))
            .andExpect(jsonPath("$.comparacoes[2].mercadoNome").value("Carrefour"))
            .andExpect(jsonPath("$.comparacoes[2].valorTotal").value(4.5))
            .andExpect(jsonPath("$.comparacoes[2].completo").value(false))
            .andExpect(jsonPath("$.comparacoes[2].itensIndisponiveis").value(1))
            .andExpect(jsonPath("$.mercadoMaisBarato.mercadoNome").value("Fort Atacadista"));
    }

    @Test
    void comparacao_ListaInexistente_DeveRetornar404() throws Exception {
        mockMvc.perform(get("/api/listas/9999/comparacao")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.erro").isNotEmpty());
    }

    @Test
    void comparacao_ListaVazia_DeveRetornarSemComparacoes() throws Exception {
        Long idVazia = criarLista(token, "Vazia", List.of());

        mockMvc.perform(get("/api/listas/" + idVazia + "/comparacao")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalItens").value(0))
            .andExpect(jsonPath("$.comparacoes").isEmpty())
            .andExpect(jsonPath("$.mercadoMaisBarato").doesNotExist());
    }

    @Test
    void comparacao_SemToken_DeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/listas/" + idLista + "/comparacao"))
            .andExpect(status().isUnauthorized());
    }
}
