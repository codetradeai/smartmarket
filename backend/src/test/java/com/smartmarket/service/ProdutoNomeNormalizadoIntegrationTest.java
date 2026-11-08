package com.smartmarket.service;

import com.smartmarket.dto.produto.ProdutoRequest;
import com.smartmarket.dto.produto.ProdutoResponse;
import com.smartmarket.model.Produto;
import com.smartmarket.repository.ProdutoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Busca por nome contra o repositório real (H2). nome_normalizado é a única fonte da
 * verdade da busca: precisa nascer sem acento, ser recalculado quando o nome muda e
 * casar com o termo digitado com ou sem acento.
 */
@SpringBootTest
@ActiveProfiles("test")
class ProdutoNomeNormalizadoIntegrationTest {

    @Autowired ProdutoService produtoService;
    @Autowired ProdutoRepository produtoRepository;
    @Autowired JdbcTemplate jdbc;

    private final List<Long> criados = new ArrayList<>();

    @AfterEach
    void limpar() {
        criados.forEach(produtoRepository::deleteById);
    }

    private Long criar(String nome) {
        ProdutoResponse r = produtoService.criar(ProdutoRequest.builder()
            .nome(nome).marca("Marca").quantidade(1.0).unidade("un").categoria("mercearia").build());
        criados.add(r.getId());
        return r.getId();
    }

    private List<Long> buscar(String termo) {
        return produtoService.buscar(termo, null, PageRequest.of(0, 50)).getContent().stream()
            .map(ProdutoResponse::getId).toList();
    }

    @Test
    void criarGravaNomeNormalizadoSemAcentoEEmMinuscula() {
        Long id = criar("Feijão  Preto QZ Caldão");
        assertThat(produtoRepository.findById(id).orElseThrow().getNomeNormalizado())
            .isEqualTo("feijao preto qz caldao");
    }

    @Test
    void buscaComOuSemAcentoEmQualquerCaixaAchaOProduto() {
        Long id = criar("Feijão Preto QZ Caldão");
        assertThat(buscar("feijao preto qz")).contains(id);
        assertThat(buscar("feijão preto qz")).contains(id);
        assertThat(buscar("FEIJÃO PRETO QZ")).contains(id);
        assertThat(buscar("caldao")).contains(id);
    }

    @Test
    void atualizarRecalculaNomeNormalizado() {
        Long id = criar("Arroz QZ Tio João");

        produtoService.atualizar(id, ProdutoRequest.builder()
            .nome("Macarrão QZ Renata").marca("Marca").quantidade(1.0).unidade("un")
            .categoria("mercearia").build());

        assertThat(produtoRepository.findById(id).orElseThrow().getNomeNormalizado())
            .isEqualTo("macarrao qz renata");
    }

    @Test
    void buscaAposRenomearUsaONomeNovoENaoOAntigo() {
        Long id = criar("Café Pilao QZ 500g");

        produtoService.atualizar(id, ProdutoRequest.builder()
            .nome("Café Pilão QZ Extra Forte 500g").marca("Marca").quantidade(1.0).unidade("un")
            .categoria("mercearia").build());

        assertThat(buscar("pilao qz extra")).contains(id);
        assertThat(buscar("pilão qz extra")).contains(id);
    }

    @Test
    void salvarDiretoPeloRepositorioTambemRecalculaAoMudarONome() {
        Long id = criar("Leite QZ Integral");
        Produto produto = produtoRepository.findById(id).orElseThrow();
        produto.setNome("Açúcar QZ Refinado");
        produtoRepository.saveAndFlush(produto);

        assertThat(produtoRepository.findById(id).orElseThrow().getNomeNormalizado())
            .isEqualTo("acucar qz refinado");
        assertThat(buscar("acucar qz")).contains(id);
        assertThat(buscar("leite qz")).doesNotContain(id);
    }

    @Test
    void buscaCompararSomenteComNomeNormalizado() {
        Long id = criar("Oleo QZ de Soja");
        jdbc.update("update produto set nome_normalizado = ? where id = ?", "sem relacao", id);

        assertThat(buscar("oleo qz")).doesNotContain(id);
        assertThat(buscar("sem relacao")).contains(id);
    }
}
