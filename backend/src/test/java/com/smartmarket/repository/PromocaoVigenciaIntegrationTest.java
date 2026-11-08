package com.smartmarket.repository;

import com.smartmarket.model.Mercado;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Promocao;
import com.smartmarket.service.PromocaoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Vigência com data_fim opcional: NULL significa "sem fim conhecido", portanto vigente. */
@SpringBootTest
@ActiveProfiles("test")
class PromocaoVigenciaIntegrationTest {

    @Autowired PromocaoRepository promocaoRepository;
    @Autowired ProdutoRepository produtoRepository;
    @Autowired MercadoRepository mercadoRepository;
    @Autowired PromocaoService promocaoService;

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
        return promocao(inicio, fim, true);
    }

    private Promocao promocao(LocalDate inicio, LocalDate fim, boolean ativa) {
        return promocaoRepository.save(Promocao.builder().produto(produto).mercado(mercado)
            .valorOriginal(new BigDecimal("10.00")).valorPromocional(new BigDecimal("8.00"))
            .dataInicio(inicio).dataFim(fim).ativa(ativa).build());
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

    @Test
    void promocaoInativaSemDataFimNaoEstaVigente() {
        Promocao ativa = promocao(hoje.minusDays(3), null);
        promocao(hoje.minusDays(3), null, false);   // a rede encerrou a oferta e a coleta marcou ativa = false

        assertThat(promocaoRepository.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje))
            .extracting(Promocao::getId).containsExactly(ativa.getId());
        assertThat(promocaoRepository.countByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje)).isEqualTo(1);
    }

    @Test
    void promocaoInativaComDataFimNaoEstaVigente() {
        promocao(hoje.minusDays(1), hoje.plusDays(5), false);

        assertThat(promocaoRepository.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje)).isEmpty();
        assertThat(promocaoRepository.countByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje)).isZero();
    }

    @Test
    void consultaPorProdutosIgnoraPromocaoInativa() {
        promocao(hoje.minusDays(1), null, false);

        assertThat(promocaoRepository.findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
                List.of(produto.getId()), hoje, hoje)).isEmpty();
    }

    @Test
    void inativarNaoRecoletadasTiraAPromocaoSemDataFimDaVigencia() {
        Promocao semFim = promocao(hoje.minusDays(3), null);
        Promocao comFim = promocao(hoje.minusDays(3), hoje.plusDays(3));
        assertThat(promocaoRepository.countByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje)).isEqualTo(2);

        int inativadas = promocaoService.inativarNaoRecoletadas(mercado.getId(), LocalDateTime.now().plusHours(1));

        assertThat(inativadas).isEqualTo(1);   // só a sem data_fim
        assertThat(promocaoRepository.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje))
            .extracting(Promocao::getId).containsExactly(comFim.getId()).doesNotContain(semFim.getId());
    }
}
