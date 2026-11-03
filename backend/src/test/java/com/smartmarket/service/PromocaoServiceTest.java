package com.smartmarket.service;

import com.smartmarket.dto.promocao.PromocaoRequest;
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
class PromocaoServiceTest {
    @Mock PromocaoRepository promocoes;
    @Mock ProdutoRepository produtos;
    @Mock MercadoRepository mercados;
    @InjectMocks PromocaoService service;

    private PromocaoRequest request(LocalDate inicio, LocalDate fim, String original, String promocional) {
        PromocaoRequest r = mock(PromocaoRequest.class);
        lenient().when(r.getDataInicio()).thenReturn(inicio);
        lenient().when(r.getDataFim()).thenReturn(fim);
        lenient().when(r.getValorOriginal()).thenReturn(new BigDecimal(original));
        lenient().when(r.getValorPromocional()).thenReturn(new BigDecimal(promocional));
        return r;
    }

    @Test void listar_SemPromocoes() {
        when(promocoes.findAll()).thenReturn(List.of());
        assertThat(service.listar()).isEmpty();
    }

    @Test void criar_DataInicialPosterior_DeveRejeitarAntesDeConsultarBanco() {
        var r = request(LocalDate.of(2026, 10, 28), LocalDate.of(2026, 10, 27), "10", "8");
        assertThatThrownBy(() -> service.criar(r)).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("data de inicio");
        verifyNoInteractions(produtos, mercados);
    }

    @Test void criar_DescontoNegativo_DeveRejeitar() {
        var hoje = LocalDate.now();
        var r = request(hoje, hoje.plusDays(1), "10", "11");
        assertThatThrownBy(() -> service.criar(r)).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("valor promocional");
    }

    @Test void criar_ProdutoInexistente() {
        var hoje = LocalDate.now();
        var r = request(hoje, hoje, "10", "8");
        when(r.getProdutoId()).thenReturn(4L);
        when(produtos.findById(4L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.criar(r)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void criar_MercadoInexistente() {
        var hoje = LocalDate.now();
        var r = request(hoje, hoje, "10", "8");
        when(r.getProdutoId()).thenReturn(4L);
        when(r.getMercadoId()).thenReturn(5L);
        when(produtos.findById(4L)).thenReturn(Optional.of(Produto.builder().id(4L).nome("Leite").build()));
        when(mercados.findById(5L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.criar(r)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void criar_SemDataFim_AceitaEGravaNull() {
        var hoje = LocalDate.now();
        var r = request(hoje, null, "10", "8");
        when(r.getProdutoId()).thenReturn(4L);
        when(r.getMercadoId()).thenReturn(5L);
        when(produtos.findById(4L)).thenReturn(Optional.of(Produto.builder().id(4L).nome("Leite").build()));
        when(mercados.findById(5L)).thenReturn(Optional.of(Mercado.builder().id(5L).nome("Fort").build()));
        when(promocoes.save(any(Promocao.class))).thenAnswer(i -> i.getArgument(0));

        var resposta = service.criar(r);

        assertThat(resposta.getDataFim()).isNull();
        verify(promocoes).save(argThat((Promocao p) -> p.getDataFim() == null && p.getDataInicio().equals(hoje)));
    }

    @Test void listar_OrdenaPorDataFimComNuloPorUltimo() {
        var hoje = LocalDate.now();
        Promocao semFim = promo(1L, hoje, null), tarde = promo(2L, hoje, hoje.plusDays(9)), cedo = promo(3L, hoje, hoje.plusDays(1));
        when(promocoes.findAll()).thenReturn(List.of(semFim, tarde, cedo));

        assertThat(service.listar()).extracting("id").containsExactly(3L, 2L, 1L);
    }

    private Promocao promo(long id, LocalDate inicio, LocalDate fim) {
        return Promocao.builder().id(id)
            .produto(Produto.builder().id(4L).nome("Leite").build())
            .mercado(Mercado.builder().id(5L).nome("Fort").build())
            .valorOriginal(new BigDecimal("10")).valorPromocional(new BigDecimal("8"))
            .dataInicio(inicio).dataFim(fim).build();
    }

    @Test void criar_ValidaEntidadesESalvaValores() {
        var hoje = LocalDate.now();
        var r = request(hoje, hoje.plusDays(2), "10", "8");
        when(r.getProdutoId()).thenReturn(4L);
        when(r.getMercadoId()).thenReturn(5L);
        when(produtos.findById(4L)).thenReturn(Optional.of(Produto.builder().id(4L).nome("Leite").build()));
        when(mercados.findById(5L)).thenReturn(Optional.of(Mercado.builder().id(5L).nome("Fort").build()));
        when(promocoes.save(any(Promocao.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.criar(r).getValorPromocional()).isEqualByComparingTo("8");
        verify(promocoes).save(argThat(p -> p.getValorOriginal().compareTo(new BigDecimal("10")) == 0));
    }
}
