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
        when(precos.findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(1L)).thenReturn(List.of());
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of());
        assertThat(service.buscarPrecosPorProduto(1L)).isNotNull();
    }

    @Test void buscarPrecosPorProduto_ConsideraUltimoPrecoPorMercado() {
        when(produtos.findById(1L)).thenReturn(Optional.of(produto(1L)));
        when(precos.findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(1L))
            .thenReturn(List.of(preco(1L, 2L, "8.00"), preco(1L, 2L, "10.00")));
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of());
        assertThat(service.buscarPrecosPorProduto(1L)).isNotNull();
    }

    @Test void buscarPrecosPorProduto_ComPromocao() {
        when(produtos.findById(1L)).thenReturn(Optional.of(produto(1L)));
        when(precos.findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(1L)).thenReturn(List.of());
        Promocao promocao = Promocao.builder().produto(produto(1L)).mercado(mercado(2L))
            .valorOriginal(new BigDecimal("10")).valorPromocional(new BigDecimal("8")).build();
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of(promocao));
        assertThat(service.buscarPrecosPorProduto(1L)).isNotNull();
    }

    @Test void buscarPorProdutoEMercado_ConverteResultados() {
        when(precos.findByProdutoIdAndMercadoId(1L, 2L)).thenReturn(List.of(preco(1L, 2L, "10")));
        assertThat(service.buscarPorProdutoEMercado(1L, 2L)).hasSize(1);
    }

    @Test void buscarTodosComPrecos_BaseVazia() {
        when(produtos.findAll()).thenReturn(List.of());
        when(precos.findByDisponivelTrueOrderByColetadoEmDescIdDesc()).thenReturn(List.of());
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of());
        assertThat(service.buscarTodosComPrecos()).isEmpty();
    }

    @Test void buscarTodosComPrecos_PrecosAgrupadosEProdutosSemPreco() {
        when(produtos.findAll()).thenReturn(List.of(produto(1L), produto(3L)));
        when(precos.findByDisponivelTrueOrderByColetadoEmDescIdDesc())
            .thenReturn(List.of(preco(1L, 2L, "8"), preco(1L, 2L, "10")));
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of());
        assertThat(service.buscarTodosComPrecos()).hasSize(2);
    }

    @Test void buscarTodosComPrecos_ComPromocaoVigente() {
        when(produtos.findAll()).thenReturn(List.of(produto(1L)));
        when(precos.findByDisponivelTrueOrderByColetadoEmDescIdDesc()).thenReturn(List.of());
        var promo = Promocao.builder().produto(produto(1L)).mercado(mercado(2L))
            .valorOriginal(new BigDecimal("10")).valorPromocional(new BigDecimal("7")).build();
        when(promocoes.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(any(), any())).thenReturn(List.of(promo, promo));
        assertThat(service.buscarTodosComPrecos()).hasSize(1);
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
