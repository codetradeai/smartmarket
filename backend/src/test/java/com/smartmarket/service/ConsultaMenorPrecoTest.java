package com.smartmarket.service;

import com.smartmarket.model.Mercado;
import com.smartmarket.model.Preco;
import com.smartmarket.repository.PrecoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ConsultaMenorPreco - menor preco atual de um produto")
class ConsultaMenorPrecoTest {
    @Mock PrecoRepository precoRepository;
    @InjectMocks ConsultaMenorPreco consulta;

    private static final Mercado A = Mercado.builder().id(11L).nome("A").build();
    private static final Mercado B = Mercado.builder().id(12L).nome("B").build();

    private static Preco preco(Mercado mercado, String valor) {
        return Preco.builder().mercado(mercado).valor(new BigDecimal(valor)).build();
    }

    private void precosDoProduto(Preco... precos) {
        when(precoRepository.findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(9L))
            .thenReturn(List.of(precos));
    }

    @Test
    @DisplayName("Retorna o menor preco entre os mercados")
    void retornaOMenorEntreOsMercados() {
        precosDoProduto(preco(A, "7"), preco(B, "5"));

        assertThat(consulta.menorDisponivel(9L)).map(Preco::getMercado).contains(B);
    }

    @Test
    @DisplayName("Sem precos disponiveis retorna vazio")
    void semPrecosRetornaVazio() {
        precosDoProduto();

        assertThat(consulta.menorDisponivel(9L)).isEqualTo(Optional.empty());
    }

    @Test
    @DisplayName("Considera apenas o preco mais recente de cada mercado")
    void ignoraPrecoAntigoMaisBaratoDoMesmoMercado() {
        // O repositorio devolve do mais recente para o mais antigo: o 3 do mercado A e antigo.
        precosDoProduto(preco(A, "8"), preco(B, "6"), preco(A, "3"));

        var menor = consulta.menorDisponivel(9L);

        assertThat(menor).map(Preco::getMercado).contains(B);
        assertThat(menor).map(Preco::getValor).hasValueSatisfying(v -> assertThat(v).isEqualByComparingTo("6"));
    }

    @Test
    @DisplayName("Em empate de valor, mantem o preco do mercado que veio primeiro")
    void empateMantemOPrimeiroMercado() {
        precosDoProduto(preco(A, "5"), preco(B, "5"));

        assertThat(consulta.menorDisponivel(9L)).map(Preco::getMercado).contains(A);
    }
}
