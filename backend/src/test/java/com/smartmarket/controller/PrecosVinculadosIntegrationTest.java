package com.smartmarket.controller;

import com.smartmarket.model.Mercado;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.model.VinculoProduto;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.VinculoProdutoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PrecosVinculadosIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ProdutoRepository produtoRepository;
    @Autowired MercadoRepository mercadoRepository;
    @Autowired PrecoRepository precoRepository;
    @Autowired VinculoProdutoRepository vinculoRepository;

    private Produto lascaAtacadao, esponjaMaster, esponjaStok, arrozA, arrozB;

    @BeforeEach
    void setUp() {
        vinculoRepository.deleteAll();
        precoRepository.deleteAll();
        produtoRepository.deleteAll();
        mercadoRepository.deleteAll();

        Mercado atacadao = mercadoRepository.save(Mercado.builder().nome("Atacadão").ativo(true).build());
        Mercado master = mercadoRepository.save(Mercado.builder().nome("Master").ativo(true).build());
        Mercado stok = mercadoRepository.save(Mercado.builder().nome("Stok").ativo(true).build());

        // Caso Bombril: mesmo EAN, embalagens diferentes
        lascaAtacadao = produto("Lã de Aço Bombril 45g");
        esponjaMaster = produto("Esponja Aço Bombril Eco Com 6 Unidade");
        esponjaStok = produto("Esponja Bombril Aço Eco 45g Com 6 Unidades");
        arrozA = produto("Arroz Camil Tipo 1 1kg");
        arrozB = produto("Arroz Bco Camil Tp1 1kg");

        preco(lascaAtacadao, atacadao, "2.49");
        preco(esponjaMaster, master, "11.90");
        preco(esponjaStok, stok, "10.90");
        preco(arrozA, atacadao, "5.90");
        preco(arrozB, master, "6.10");

        vincular(lascaAtacadao, esponjaMaster, "ean", "revisar");
        vincular(lascaAtacadao, esponjaStok, "ean", "revisar");
        vincular(esponjaMaster, esponjaStok, "ean", "confirmado");
        vincular(arrozA, arrozB, "ean", "confirmado");
    }

    private Produto produto(String nome) {
        return produtoRepository.save(Produto.builder().nome(nome).categoria("mercearia").build());
    }

    private void preco(Produto p, Mercado m, String valor) {
        precoRepository.save(Preco.builder().produto(p).mercado(m).valor(new BigDecimal(valor)).disponivel(true).build());
    }

    private void vincular(Produto x, Produto y, String origem, String status) {
        Produto a = x.getId() < y.getId() ? x : y;
        Produto b = a == x ? y : x;
        vinculoRepository.save(VinculoProduto.builder().produtoA(a).produtoB(b).origem(origem).status(status).build());
    }

    @Test
    void devolvePrecosDeTodasAsRedesVinculadasConfirmadas() throws Exception {
        mockMvc.perform(get("/api/precos/produto/" + arrozA.getId() + "/vinculados"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.precos.length()").value(2))
            .andExpect(jsonPath("$.precos[0].mercadoNome").value("Atacadão"))
            .andExpect(jsonPath("$.precos[0].origemVinculo").value("proprio"))
            .andExpect(jsonPath("$.precos[1].mercadoNome").value("Master"))
            .andExpect(jsonPath("$.precos[1].origemVinculo").value("ean"));
    }

    @Test
    void vinculoEmRevisaoNaoApareceNoComparador_casoBombril() throws Exception {
        // A lã de aço 45g (Atacadão) tem vínculos "revisar" com as esponjas de 6 unidades: não compara
        mockMvc.perform(get("/api/precos/produto/" + lascaAtacadao.getId() + "/vinculados"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.precos.length()").value(1))
            .andExpect(jsonPath("$.precos[0].mercadoNome").value("Atacadão"))
            .andExpect(jsonPath("$.precos[0].origemVinculo").value("proprio"));
    }

    @Test
    void vinculoConfirmadoEntreAsEsponjasDe6UnidadesContinuaDisponivel() throws Exception {
        mockMvc.perform(get("/api/precos/produto/" + esponjaMaster.getId() + "/vinculados"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.precos.length()").value(2))
            .andExpect(jsonPath("$.precos[0].mercadoNome").value("Stok"))
            .andExpect(jsonPath("$.precos[1].mercadoNome").value("Master"));
    }

    @Test
    void produtoInexistenteDevolve404() throws Exception {
        mockMvc.perform(get("/api/precos/produto/999999/vinculados")).andExpect(status().isNotFound());
    }
}
