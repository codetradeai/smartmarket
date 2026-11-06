package com.smartmarket.repository;

import com.smartmarket.model.Mercado;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Promocao;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Vigência com data_fim opcional: NULL significa "sem fim conhecido", portanto vigente. */
@SpringBootTest
@ActiveProfiles("test")
class PromocaoVigenciaIntegrationTest {

    @Autowired PromocaoRepository promocaoRepository;
    @Autowired ProdutoRepository produtoRepository;
    @Autowired MercadoRepository mercadoRepository;

    private final LocalDate hoje = LocalDate.of(2026, 11, 3);
    private Produto produto;
    private Mercado mercado;

    @BeforeEach
    void setUp() {
        promocaoRepository.deleteAll();
        produtoRepository.deleteAll();
        mercadoRepository.deleteAll();
        produto = produtoRepository.save(Produto.builder().nome("Arroz").categoria("mercearia").build());
        mercado = mercadoRepository.save(Mercado.builder().nome("Fort").ativo(true).build());
    }

    @AfterEach
    void limpar() {
        promocaoRepository.deleteAll();
        produtoRepository.deleteAll();
        mercadoRepository.deleteAll();
    }

    private Promocao promocao(LocalDate inicio, LocalDate fim) {
        return promocaoRepository.save(Promocao.builder().produto(produto).mercado(mercado)
            .valorOriginal(new BigDecimal("10.00")).valorPromocional(new BigDecimal("8.00"))
            .dataInicio(inicio).dataFim(fim).build());
    }

    @Test
    void promocaoSemDataFimPodeSerGravadaELida() {
        Promocao salva = promocao(hoje, null);
        assertThat(promocaoRepository.findById(salva.getId()).orElseThrow().getDataFim()).isNull();
    }

    @Test
    void promocaoSemDataFimIniciadaEstaVigente() {
        Promocao semFim = promocao(hoje.minusDays(3), null);
        assertThat(promocaoRepository.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje))
            .extracting(Promocao::getId).containsExactly(semFim.getId());
        assertThat(promocaoRepository.countByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje)).isEqualTo(1);
    }

    @Test
    void promocaoSemDataFimQueAindaNaoComecouNaoEstaVigente() {
        promocao(hoje.plusDays(2), null);
        assertThat(promocaoRepository.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje)).isEmpty();
    }

    @Test
    void promocaoComDataFimContinuaRespeitandoOPeriodo() {
        Promocao vigente = promocao(hoje.minusDays(1), hoje);        // termina hoje: ainda vale
        promocao(hoje.minusDays(10), hoje.minusDays(1));             // expirou ontem
        promocao(hoje.plusDays(1), hoje.plusDays(5));                // começa amanhã
        List<Promocao> achadas = promocaoRepository.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje);
        assertThat(achadas).extracting(Promocao::getId).containsExactly(vigente.getId());
    }

    @Test
    void consultaPorProdutosTambemTrataDataFimNula() {
        Promocao semFim = promocao(hoje.minusDays(1), null);
        promocao(hoje.minusDays(9), hoje.minusDays(2));
        assertThat(promocaoRepository.findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
                List.of(produto.getId()), hoje, hoje))
            .extracting(Promocao::getId).containsExactly(semFim.getId());
    }
}
