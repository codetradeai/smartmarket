package com.smartmarket.service;

import com.smartmarket.dto.preco.PrecosVinculadosResponse;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.model.VinculoProduto;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.VinculoProdutoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A coleta marca como indisponível só a linha MAIS RECENTE de um produto que sumiu da rede;
 * as linhas antigas continuam com disponivel = true. Os caminhos "preços vinculados" e
 * "menor preço do alerta" filtravam disponivel = true direto na consulta e traziam o preço
 * antigo como se fosse atual. Aqui rodam contra o repositório real (H2), como PrecoService
 * e ComparadorService já resolvem via PrecosVigentes.
 */
@SpringBootTest
@ActiveProfiles("test")
class PrecoVigenteIntegrationTest {

    @Autowired VinculoProdutoService vinculoProdutoService;
    @Autowired ConsultaMenorPreco consultaMenorPreco;
    @Autowired ProdutoRepository produtoRepository;
    @Autowired MercadoRepository mercadoRepository;
    @Autowired PrecoRepository precoRepository;
    @Autowired VinculoProdutoRepository vinculoRepository;

    private final LocalDateTime agora = LocalDateTime.of(2026, 11, 3, 10, 0);
    private Produto arroz, arrozOutraRede;
    private Mercado zaffari, master;

    @BeforeEach
    void setUp() {
        zaffari = mercadoRepository.save(Mercado.builder().nome("Zaffari PV").ativo(true).build());
        master = mercadoRepository.save(Mercado.builder().nome("Master PV").ativo(true).build());
        arroz = produtoRepository.save(Produto.builder().nome("Arroz PV Zaffari").categoria("mercearia").build());
        arrozOutraRede = produtoRepository.save(Produto.builder().nome("Arroz PV Master").categoria("mercearia").build());
    }

    @AfterEach
    void limpar() {
        precoRepository.deleteAll(precoRepository.findByProdutoId(arroz.getId()));
        precoRepository.deleteAll(precoRepository.findByProdutoId(arrozOutraRede.getId()));
        vinculoRepository.deleteAll(vinculoRepository.findAll().stream()
            .filter(v -> v.getProdutoA().getId().equals(arroz.getId()) || v.getProdutoB().getId().equals(arroz.getId()))
            .toList());
        produtoRepository.deleteById(arroz.getId());
        produtoRepository.deleteById(arrozOutraRede.getId());
        mercadoRepository.deleteById(zaffari.getId());
        mercadoRepository.deleteById(master.getId());
    }

    private void preco(Produto p, Mercado m, String valor, LocalDateTime coletadoEm, boolean disponivel) {
        precoRepository.save(Preco.builder().produto(p).mercado(m).valor(new BigDecimal(valor))
            .coletadoEm(coletadoEm).disponivel(disponivel).build());
    }

    private void vincular(Produto x, Produto y) {
        Produto a = x.getId() < y.getId() ? x : y;
        Produto b = a == x ? y : x;
        vinculoRepository.save(VinculoProduto.builder().produtoA(a).produtoB(b)
            .origem("ean").status(VinculoProduto.STATUS_CONFIRMADO).build());
    }

    @Test
    void menorPrecoIgnoraParQueSumiuDaRede_mesmoComLinhaAntigaDisponivel() {
        preco(arroz, zaffari, "10.00", agora.minusDays(2), true);   // linha antiga ainda "disponivel"
        preco(arroz, zaffari, "12.00", agora, false);               // a coleta de hoje marcou que sumiu

        assertThat(consultaMenorPreco.menorDisponivel(arroz.getId())).isEmpty();
    }

    @Test
    void menorPrecoUsaSoOsMercadosOndeOProdutoAindaEVendido() {
        preco(arroz, zaffari, "3.50", agora.minusDays(2), true);
        preco(arroz, zaffari, "4.00", agora, false);                // sumiu do Zaffari
        preco(arroz, master, "5.20", agora.minusDays(1), true);
        preco(arroz, master, "5.90", agora, true);                  // Master: o vigente é 5,90

        Preco menor = consultaMenorPreco.menorDisponivel(arroz.getId()).orElseThrow();

        assertThat(menor.getMercado().getId()).isEqualTo(master.getId());
        assertThat(menor.getValor()).isEqualByComparingTo("5.90");
    }

    @Test
    void menorPrecoDesempataPorIdQuandoDuasLinhasTemOMesmoInstante() {
        preco(arroz, zaffari, "9.00", agora, true);
        preco(arroz, zaffari, "7.00", agora, true);                 // gravada depois: id maior = vigente

        assertThat(consultaMenorPreco.menorDisponivel(arroz.getId()).orElseThrow().getValor())
            .isEqualByComparingTo("7.00");
    }

    @Test
    void precosVinculadosNaoMostramPrecoDeLojaQueNaoVendeMais() {
        vincular(arroz, arrozOutraRede);
        preco(arroz, zaffari, "10.00", agora.minusDays(2), true);
        preco(arroz, zaffari, "12.00", agora, false);               // sumiu do Zaffari
        preco(arrozOutraRede, master, "11.00", agora, true);

        PrecosVinculadosResponse resposta = vinculoProdutoService.precosVinculados(arroz.getId());

        assertThat(resposta.getPrecos()).hasSize(1);
        assertThat(resposta.getPrecos().get(0).getMercadoId()).isEqualTo(master.getId());
        assertThat(resposta.getPrecos().get(0).getValor()).isEqualByComparingTo("11.00");
    }

    @Test
    void precosVinculadosUsamAUltimaColetaDeCadaParEDesempatamPorId() {
        vincular(arroz, arrozOutraRede);
        preco(arroz, zaffari, "8.00", agora.minusDays(3), true);
        preco(arroz, zaffari, "9.00", agora, true);
        preco(arroz, zaffari, "9.50", agora, true);                 // mesmo instante, id maior: vigente
        preco(arrozOutraRede, master, "10.00", agora.minusDays(1), true);

        PrecosVinculadosResponse resposta = vinculoProdutoService.precosVinculados(arroz.getId());

        assertThat(resposta.getPrecos()).hasSize(2);
        assertThat(resposta.getPrecos()).anySatisfy(p -> {
            assertThat(p.getMercadoId()).isEqualTo(zaffari.getId());
            assertThat(p.getValor()).isEqualByComparingTo("9.50");
        });
        assertThat(resposta.getPrecos()).anySatisfy(p -> {
            assertThat(p.getMercadoId()).isEqualTo(master.getId());
            assertThat(p.getValor()).isEqualByComparingTo("10.00");
        });
        assertThat(resposta.getPrecos().get(0).getValor()).isEqualByComparingTo("9.50"); // ordenado por valor
    }
}
