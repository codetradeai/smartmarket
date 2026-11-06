package com.smartmarket.service;

import com.smartmarket.dto.preco.PrecosVinculadosResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.model.VinculoProduto;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.VinculoProdutoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VinculoProdutoServiceTest {

    @Mock ProdutoRepository produtos;
    @Mock PrecoRepository precos;
    @Mock VinculoProdutoRepository vinculos;
    @InjectMocks VinculoProdutoService service;

    private Produto produto(long id, String nome) { return Produto.builder().id(id).nome(nome).build(); }
    private Mercado mercado(long id, String nome) { return Mercado.builder().id(id).nome(nome).build(); }
    private Preco preco(Produto p, Mercado m, String valor, int minutosAtras) {
        return Preco.builder().produto(p).mercado(m).valor(new BigDecimal(valor)).disponivel(true)
            .coletadoEm(LocalDateTime.of(2026, 11, 3, 12, 0).minusMinutes(minutosAtras)).build();
    }
    private VinculoProduto vinculo(Produto a, Produto b, String origem) {
        return VinculoProduto.builder().produtoA(a).produtoB(b).origem(origem)
            .status(VinculoProduto.STATUS_CONFIRMADO).build();
    }

    @Test
    void produtoInexistente() {
        when(produtos.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.precosVinculados(9L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void consultaSomenteVinculosConfirmados() {
        Produto a = produto(1, "Lã de Aço 45g");
        when(produtos.findById(1L)).thenReturn(Optional.of(a));
        when(vinculos.findDoProdutoComStatus(eq(1L), eq("confirmado"))).thenReturn(List.of());
        when(precos.findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(any())).thenReturn(List.of());

        service.precosVinculados(1L);

        verify(vinculos).findDoProdutoComStatus(1L, VinculoProduto.STATUS_CONFIRMADO);
    }

    @Test
    void devolvePrecosDoProdutoEDosVinculadosOrdenadosPorValor() {
        Produto a = produto(1, "Arroz Camil 1kg"), b = produto(2, "Arroz Camil Tipo 1 1kg");
        Mercado m1 = mercado(10, "Atacadão"), m2 = mercado(20, "Master");
        when(produtos.findById(2L)).thenReturn(Optional.of(b));
        // o produto consultado (2) é o lado B do vínculo
        when(vinculos.findDoProdutoComStatus(2L, "confirmado")).thenReturn(List.of(vinculo(a, b, "ean")));
        when(precos.findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(any()))
            .thenReturn(List.of(preco(b, m2, "6.50", 0), preco(a, m1, "5.90", 0)));

        PrecosVinculadosResponse r = service.precosVinculados(2L);

        assertThat(r.getProdutoId()).isEqualTo(2L);
        assertThat(r.getPrecos()).extracting("valor").containsExactly(new BigDecimal("5.90"), new BigDecimal("6.50"));
        assertThat(r.getPrecos()).extracting("origemVinculo").containsExactly("ean", "proprio");
        assertThat(r.getPrecos()).extracting("mercadoNome").containsExactly("Atacadão", "Master");
    }

    @Test
    void mantemSoOPrecoMaisRecentePorProdutoEMercado() {
        Produto a = produto(1, "Arroz");
        Mercado m = mercado(10, "Atacadão");
        when(produtos.findById(1L)).thenReturn(Optional.of(a));
        when(vinculos.findDoProdutoComStatus(1L, "confirmado")).thenReturn(List.of());
        when(precos.findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(any()))
            .thenReturn(List.of(preco(a, m, "5.00", 0), preco(a, m, "9.99", 60)));

        PrecosVinculadosResponse r = service.precosVinculados(1L);

        assertThat(r.getPrecos()).hasSize(1);
        assertThat(r.getPrecos().get(0).getValor()).isEqualByComparingTo("5.00");
    }

    @Test
    void produtoSemVinculosDevolveSoOsProprios() {
        Produto a = produto(1, "Arroz");
        when(produtos.findById(1L)).thenReturn(Optional.of(a));
        when(vinculos.findDoProdutoComStatus(1L, "confirmado")).thenReturn(List.of());
        when(precos.findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(any())).thenReturn(List.of());

        assertThat(service.precosVinculados(1L).getPrecos()).isEmpty();
    }
}
