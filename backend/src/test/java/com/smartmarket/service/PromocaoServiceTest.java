package com.smartmarket.service;

import com.smartmarket.dto.promocao.PromocaoRequest;
import com.smartmarket.dto.promocao.PromocaoResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Promocao;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.PromocaoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromocaoServiceTest {

    private static final LocalDate INICIO = LocalDate.of(2026, 1, 10);
    private static final LocalDate FIM = LocalDate.of(2026, 1, 20);

    @Mock
    private PromocaoRepository promocaoRepository;

    @Mock
    private ProdutoRepository produtoRepository;

    @Mock
    private MercadoRepository mercadoRepository;

    @InjectMocks
    private PromocaoService promocaoService;

    private Produto produto;
    private Mercado mercado;

    @BeforeEach
    void setUp() {
        produto = Produto.builder().id(1L).nome("Arroz").build();
        mercado = Mercado.builder().id(2L).nome("Carrefour").build();
    }

    private PromocaoRequest request(String original, String promocional, LocalDate inicio, LocalDate fim) {
        return new PromocaoRequest(1L, 2L, new BigDecimal(original), new BigDecimal(promocional), inicio, fim);
    }

    @Test
    void listar_DeveConverterTodasAsPromocoes() {
        Promocao promocao = Promocao.builder().id(5L).produto(produto).mercado(mercado)
            .valorOriginal(new BigDecimal("10.00")).valorPromocional(new BigDecimal("8.00"))
            .dataInicio(INICIO).dataFim(FIM).build();
        when(promocaoRepository.findAll()).thenReturn(List.of(promocao));

        List<PromocaoResponse> resposta = promocaoService.listar();

        assertThat(resposta).hasSize(1);
        assertThat(resposta.get(0).getProdutoNome()).isEqualTo("Arroz");
        assertThat(resposta.get(0).getMercadoNome()).isEqualTo("Carrefour");
        assertThat(resposta.get(0).getValorPromocional()).isEqualByComparingTo("8.00");
    }

    @Test
    void listar_DeveRetornarListaVaziaQuandoNaoHaPromocoes() {
        when(promocaoRepository.findAll()).thenReturn(List.of());

        assertThat(promocaoService.listar()).isEmpty();
    }

    @Test
    void criar_DeveSalvarPromocaoValida() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(mercadoRepository.findById(2L)).thenReturn(Optional.of(mercado));
        when(promocaoRepository.save(any(Promocao.class))).thenAnswer(inv -> inv.getArgument(0));

        PromocaoResponse resposta = promocaoService.criar(request("10.00", "7.50", INICIO, FIM));

        assertThat(resposta.getProdutoId()).isEqualTo(1L);
        assertThat(resposta.getMercadoId()).isEqualTo(2L);
        assertThat(resposta.getValorOriginal()).isEqualByComparingTo("10.00");
        assertThat(resposta.getValorPromocional()).isEqualByComparingTo("7.50");
        assertThat(resposta.getDataInicio()).isEqualTo(INICIO);
        assertThat(resposta.getDataFim()).isEqualTo(FIM);
    }

    @Test
    void criar_DeveAceitarPeriodoDeUmUnicoDiaEValoresIguais() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(mercadoRepository.findById(2L)).thenReturn(Optional.of(mercado));
        when(promocaoRepository.save(any(Promocao.class))).thenAnswer(inv -> inv.getArgument(0));

        PromocaoResponse resposta = promocaoService.criar(request("10.00", "10.00", INICIO, INICIO));

        assertThat(resposta.getDataInicio()).isEqualTo(resposta.getDataFim());
        assertThat(resposta.getValorPromocional()).isEqualByComparingTo(resposta.getValorOriginal());
    }

    @Test
    void criar_DeveRejeitarDataInicialPosteriorAFinal() {
        assertThatThrownBy(() -> promocaoService.criar(request("10.00", "8.00", FIM, INICIO)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("A data de inicio nao pode ser posterior a data de fim.");

        verify(promocaoRepository, never()).save(any());
    }

    @Test
    void criar_DeveRejeitarValorPromocionalMaiorQueOriginal() {
        assertThatThrownBy(() -> promocaoService.criar(request("10.00", "10.01", INICIO, FIM)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("O valor promocional nao pode ser maior que o valor original.");

        verify(promocaoRepository, never()).save(any());
    }

    @Test
    void criar_DeveFalharQuandoProdutoNaoExiste() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> promocaoService.criar(request("10.00", "8.00", INICIO, FIM)))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Produto com id 1 nao encontrado(a)");

        verify(promocaoRepository, never()).save(any());
    }

    @Test
    void criar_DeveFalharQuandoMercadoNaoExiste() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(mercadoRepository.findById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> promocaoService.criar(request("10.00", "8.00", INICIO, FIM)))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Mercado com id 2 nao encontrado(a)");

        verify(promocaoRepository, never()).save(any());
    }
}
