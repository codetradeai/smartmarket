package com.smartmarket.service;

import com.smartmarket.dto.preco.PrecoRequest;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.*;
import com.smartmarket.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrecoServiceTest {
    @Mock PrecoRepository precos;
    @Mock ProdutoRepository produtos;
    @Mock MercadoRepository mercados;
    @Mock PromocaoRepository promocoes;
    @InjectMocks PrecoService service;

    private Produto produto(long id) { return Produto.builder().id(id).nome("Produto").build(); }
    private Mercado mercado(long id) { return Mercado.builder().id(id).nome("Mercado").build(); }
    private Preco preco(long produtoId, long mercadoId, String valor) {
        return Preco.builder().id(1L).produto(produto(produtoId)).mercado(mercado(mercadoId))
            .valor(new BigDecimal(valor)).disponivel(true).build();
    }

    @Test void buscarPrecosPorProduto_Inexistente() {
        when(produtos.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.buscarPrecosPorProduto(9L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void buscarPrecosPorProduto_SemPrecosNemPromocoes() {
        when(produtos.findById(1L)).thenReturn(Optional.of(produto(1L)));
        when(precos.findByProdutoIdOrderByColetadoEmDescIdDesc(1L)).thenReturn(List.of());
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of());

        var resposta = service.buscarPrecosPorProduto(1L);

        assertThat(resposta.getId()).isEqualTo(1L);
        assertThat(resposta.getPrecos()).isEmpty();
        assertThat(resposta.getPrecosDetalhados()).isEmpty();
        assertThat(resposta.getMenorPreco()).isNull();
        assertThat(resposta.getMercadoMenorPreco()).isNull();
        assertThat(resposta.getPromo()).isFalse();
        assertThat(resposta.getValorOriginal()).isNull();
    }

    @Test void buscarPrecosPorProduto_ConsideraUltimoPrecoPorMercado() {
        when(produtos.findById(1L)).thenReturn(Optional.of(produto(1L)));
        when(precos.findByProdutoIdOrderByColetadoEmDescIdDesc(1L))
            .thenReturn(List.of(preco(1L, 2L, "8.00"), preco(1L, 2L, "10.00")));
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of());

        var resposta = service.buscarPrecosPorProduto(1L);

        // A lista vem do mais recente para o mais antigo: vale o primeiro (8.00), nao o ultimo (10.00).
        assertThat(resposta.getPrecos()).containsOnlyKeys(2L);
        assertThat(resposta.getPrecos().get(2L)).isEqualByComparingTo("8.00");
        assertThat(resposta.getMenorPreco()).isEqualByComparingTo("8.00");
        assertThat(resposta.getMercadoMenorPreco()).isEqualTo(2L);
        // O detalhamento continua com o historico completo.
        assertThat(resposta.getPrecosDetalhados()).hasSize(2);
    }

    @Test void buscarPrecosPorProduto_EscolheOMenorEntreMercadosComOUltimoPrecoDeCada() {
        when(produtos.findById(1L)).thenReturn(Optional.of(produto(1L)));
        when(precos.findByProdutoIdOrderByColetadoEmDescIdDesc(1L))
            .thenReturn(List.of(preco(1L, 2L, "8.00"), preco(1L, 3L, "6.50"), preco(1L, 2L, "4.00")));
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of());

        var resposta = service.buscarPrecosPorProduto(1L);

        assertThat(resposta.getPrecos()).containsOnlyKeys(2L, 3L);
        assertThat(resposta.getPrecos().get(2L)).isEqualByComparingTo("8.00");
        assertThat(resposta.getMenorPreco()).isEqualByComparingTo("6.50");
        assertThat(resposta.getMercadoMenorPreco()).isEqualTo(3L);
    }

    @Test void buscarPrecosPorProduto_ComPromocao() {
        when(produtos.findById(1L)).thenReturn(Optional.of(produto(1L)));
        when(precos.findByProdutoIdOrderByColetadoEmDescIdDesc(1L)).thenReturn(List.of());
        Promocao promocao = Promocao.builder().produto(produto(1L)).mercado(mercado(2L))
            .valorOriginal(new BigDecimal("10")).valorPromocional(new BigDecimal("8")).build();
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of(promocao));

        var resposta = service.buscarPrecosPorProduto(1L);

        assertThat(resposta.getPromo()).isTrue();
        assertThat(resposta.getValorOriginal()).isEqualByComparingTo("10");
    }

    @Test void buscarPrecosPorProduto_PromocaoDeOutroProdutoNaoMarcaEste() {
        when(produtos.findById(1L)).thenReturn(Optional.of(produto(1L)));
        when(precos.findByProdutoIdOrderByColetadoEmDescIdDesc(1L)).thenReturn(List.of());
        Promocao deOutro = Promocao.builder().produto(produto(7L)).mercado(mercado(2L))
            .valorOriginal(new BigDecimal("10")).valorPromocional(new BigDecimal("8")).build();
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of(deOutro));

        var resposta = service.buscarPrecosPorProduto(1L);

        assertThat(resposta.getPromo()).isFalse();
        assertThat(resposta.getValorOriginal()).isNull();
    }

    @Test void buscarPorProdutoEMercado_ConverteResultados() {
        when(precos.findByProdutoIdAndMercadoId(1L, 2L)).thenReturn(List.of(preco(1L, 2L, "10")));
        assertThat(service.buscarPorProdutoEMercado(1L, 2L)).hasSize(1);
    }

    @Test void buscarTodosComPrecos_BaseVazia() {
        when(produtos.findAll()).thenReturn(List.of());
        when(precos.findAllByOrderByColetadoEmDescIdDesc()).thenReturn(List.of());
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of());
        assertThat(service.buscarTodosComPrecos()).isEmpty();
    }

    @Test void buscarTodosComPrecos_PrecosAgrupadosEProdutosSemPreco() {
        when(produtos.findAll()).thenReturn(List.of(produto(1L), produto(3L)));
        when(precos.findAllByOrderByColetadoEmDescIdDesc())
            .thenReturn(List.of(preco(1L, 2L, "8"), preco(1L, 2L, "10")));
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of());
        assertThat(service.buscarTodosComPrecos()).hasSize(2);
    }

    @Test void buscarTodosComPrecos_ComPromocaoVigente() {
        when(produtos.findAll()).thenReturn(List.of(produto(1L)));
        when(precos.findAllByOrderByColetadoEmDescIdDesc()).thenReturn(List.of());
        var promo = Promocao.builder().produto(produto(1L)).mercado(mercado(2L))
            .valorOriginal(new BigDecimal("10")).valorPromocional(new BigDecimal("7")).build();
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of(promo, promo));
        assertThat(service.buscarTodosComPrecos()).hasSize(1);
    }

    @Test void buscarTodosComPrecos_UltimaLinhaIndisponivel_NaoReexibePrecoAntigo() {
        Preco recenteIndisponivel = preco(1L, 2L, "12");
        recenteIndisponivel.setDisponivel(false);
        when(produtos.findAll()).thenReturn(List.of(produto(1L)));
        when(precos.findAllByOrderByColetadoEmDescIdDesc())
            .thenReturn(List.of(recenteIndisponivel, preco(1L, 2L, "10"), preco(1L, 3L, "9")));
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of());

        var resposta = service.buscarTodosComPrecos();

        assertThat(resposta).hasSize(1);
        assertThat(resposta.get(0).getPrecos()).containsOnlyKeys(3L);
    }

    @Test void criar_ProdutoInexistente() {
        PrecoRequest r = mock(PrecoRequest.class);
        when(r.getProdutoId()).thenReturn(1L);
        when(produtos.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.criar(r)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void criar_MercadoInexistente() {
        PrecoRequest r = mock(PrecoRequest.class);
        when(r.getProdutoId()).thenReturn(1L);
        when(r.getMercadoId()).thenReturn(2L);
        when(produtos.findById(1L)).thenReturn(Optional.of(produto(1L)));
        when(mercados.findById(2L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.criar(r)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void criar_DisponivelDefaultTrue() {
        PrecoRequest r = mock(PrecoRequest.class);
        when(r.getDisponivel()).thenReturn(null);
        when(r.getProdutoId()).thenReturn(1L);
        when(r.getMercadoId()).thenReturn(2L);
        when(r.getValor()).thenReturn(new BigDecimal("10"));
        when(produtos.findById(1L)).thenReturn(Optional.of(produto(1L)));
        when(mercados.findById(2L)).thenReturn(Optional.of(mercado(2L)));
        when(precos.save(any(Preco.class))).thenAnswer(inv -> inv.getArgument(0));
        service.criar(r);
        verify(precos).save(argThat(p -> Boolean.TRUE.equals(p.getDisponivel())));
    }

    @Test void criar_DisponibilidadeFalsa() {
        PrecoRequest r = mock(PrecoRequest.class);
        when(r.getProdutoId()).thenReturn(1L);
        when(r.getMercadoId()).thenReturn(2L);
        when(r.getValor()).thenReturn(new BigDecimal("10"));
        when(r.getDisponivel()).thenReturn(false);
        when(produtos.findById(1L)).thenReturn(Optional.of(produto(1L)));
        when(mercados.findById(2L)).thenReturn(Optional.of(mercado(2L)));
        when(precos.save(any(Preco.class))).thenAnswer(inv -> inv.getArgument(0));
        service.criar(r);
        verify(precos).save(argThat(p -> Boolean.FALSE.equals(p.getDisponivel())));
    }

    @Test void remover_Inexistente() {
        when(precos.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.remover(9L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void remover_Encontrado() {
        Preco preco = preco(1L, 2L, "10");
        when(precos.findById(1L)).thenReturn(Optional.of(preco));
        service.remover(1L);
        verify(precos).delete(preco);
    }
}
