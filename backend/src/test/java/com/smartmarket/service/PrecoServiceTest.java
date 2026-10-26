package com.smartmarket.service;

import com.smartmarket.dto.preco.PrecoRequest;
import com.smartmarket.dto.preco.PrecoResponse;
import com.smartmarket.dto.produto.ProdutoComPrecosResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Promocao;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.PromocaoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrecoServiceTest {

    @Mock
    private PrecoRepository precoRepository;

    @Mock
    private ProdutoRepository produtoRepository;

    @Mock
    private MercadoRepository mercadoRepository;

    @Mock
    private PromocaoRepository promocaoRepository;

    @InjectMocks
    private PrecoService precoService;

    private Produto arroz;
    private Produto feijao;
    private Mercado carrefour;
    private Mercado fort;

    @BeforeEach
    void setUp() {
        arroz = Produto.builder().id(1L).nome("Arroz").quantidade(5.0).unidade("kg").build();
        feijao = Produto.builder().id(2L).nome("Feijao").quantidade(1.0).unidade("kg").build();
        carrefour = Mercado.builder().id(10L).nome("Carrefour").build();
        fort = Mercado.builder().id(20L).nome("Fort").build();
    }

    private Preco preco(Long id, Produto produto, Mercado mercado, String valor, int dia) {
        return Preco.builder().id(id).produto(produto).mercado(mercado).valor(new BigDecimal(valor))
            .coletadoEm(LocalDateTime.of(2026, 1, dia, 10, 0)).disponivel(true).build();
    }

    private Promocao promocao(Produto produto, String valorOriginal) {
        return Promocao.builder().produto(produto).mercado(carrefour)
            .valorOriginal(new BigDecimal(valorOriginal)).valorPromocional(new BigDecimal("1.00"))
            .dataInicio(LocalDate.now().minusDays(1)).dataFim(LocalDate.now().plusDays(1)).build();
    }

    private void promocoesVigentes(List<Promocao> promocoes) {
        when(promocaoRepository.findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(
            any(LocalDate.class), any(LocalDate.class))).thenReturn(promocoes);
    }

    @Test
    void buscarPrecosPorProduto_DeveManterPrecoMaisRecentePorMercadoEIndicarMenorPreco() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(arroz));
        // ordem do repositorio: mais recente primeiro
        when(precoRepository.findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(1L)).thenReturn(List.of(
            preco(3L, arroz, carrefour, "25.00", 15),
            preco(2L, arroz, fort, "22.00", 14),
            preco(1L, arroz, carrefour, "30.00", 10)));
        promocoesVigentes(List.of());

        ProdutoComPrecosResponse resposta = precoService.buscarPrecosPorProduto(1L);

        assertThat(resposta.getPrecos()).containsEntry(10L, new BigDecimal("25.00"))
            .containsEntry(20L, new BigDecimal("22.00")).hasSize(2);
        assertThat(resposta.getPrecosDetalhados()).hasSize(3);
        assertThat(resposta.getMenorPreco()).isEqualByComparingTo("22.00");
        assertThat(resposta.getMercadoMenorPreco()).isEqualTo(20L);
        assertThat(resposta.getPromo()).isFalse();
        assertThat(resposta.getValorOriginal()).isNull();
    }

    @Test
    void buscarPrecosPorProduto_DeveCalcularPrecoPorUnidadePadrao() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(arroz));
        when(precoRepository.findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(1L))
            .thenReturn(List.of(preco(1L, arroz, carrefour, "25.00", 15)));
        promocoesVigentes(List.of());

        ProdutoComPrecosResponse resposta = precoService.buscarPrecosPorProduto(1L);

        assertThat(resposta.getUnidadePadrao()).isEqualTo("kg");
        assertThat(resposta.getPrecosPorUnidadePadrao().get(10L)).isEqualByComparingTo("5.00");
    }

    @Test
    void buscarPrecosPorProduto_DeveIndicarPromocaoVigenteDoProduto() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(arroz));
        when(precoRepository.findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(1L))
            .thenReturn(List.of(preco(1L, arroz, carrefour, "25.00", 15)));
        promocoesVigentes(List.of(promocao(feijao, "9.00"), promocao(arroz, "30.00")));

        ProdutoComPrecosResponse resposta = precoService.buscarPrecosPorProduto(1L);

        assertThat(resposta.getPromo()).isTrue();
        assertThat(resposta.getValorOriginal()).isEqualByComparingTo("30.00");
    }

    @Test
    void buscarPrecosPorProduto_DeveIgnorarPromocoesDeOutrosProdutos() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(arroz));
        when(precoRepository.findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(1L)).thenReturn(List.of());
        promocoesVigentes(List.of(promocao(feijao, "9.00")));

        ProdutoComPrecosResponse resposta = precoService.buscarPrecosPorProduto(1L);

        assertThat(resposta.getPromo()).isFalse();
        assertThat(resposta.getValorOriginal()).isNull();
        assertThat(resposta.getPrecos()).isEmpty();
        assertThat(resposta.getMenorPreco()).isNull();
        assertThat(resposta.getMercadoMenorPreco()).isNull();
    }

    @Test
    void buscarPrecosPorProduto_DeveFalharQuandoProdutoNaoExiste() {
        when(produtoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> precoService.buscarPrecosPorProduto(99L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Produto com id 99 nao encontrado(a)");
    }

    @Test
    void buscarPorProdutoEMercado_DeveConverterPrecosEncontrados() {
        when(precoRepository.findByProdutoIdAndMercadoId(1L, 10L))
            .thenReturn(List.of(preco(1L, arroz, carrefour, "25.00", 15)));

        List<PrecoResponse> resposta = precoService.buscarPorProdutoEMercado(1L, 10L);

        assertThat(resposta).hasSize(1);
        assertThat(resposta.get(0).getMercadoNome()).isEqualTo("Carrefour");
        assertThat(resposta.get(0).getValor()).isEqualByComparingTo("25.00");
    }

    @Test
    void buscarPorProdutoEMercado_DeveRetornarListaVaziaQuandoNaoHaPrecos() {
        when(precoRepository.findByProdutoIdAndMercadoId(1L, 10L)).thenReturn(List.of());

        assertThat(precoService.buscarPorProdutoEMercado(1L, 10L)).isEmpty();
    }

    @Test
    void buscarTodosComPrecos_DeveAgruparPorProdutoEMarcarPromocao() {
        when(produtoRepository.findAll()).thenReturn(List.of(arroz, feijao));
        when(precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc()).thenReturn(List.of(
            preco(4L, arroz, carrefour, "25.00", 15),
            preco(3L, arroz, fort, "22.00", 14),
            preco(2L, arroz, carrefour, "30.00", 10)));
        // duas promocoes do mesmo produto: prevalece a primeira
        promocoesVigentes(List.of(promocao(arroz, "30.00"), promocao(arroz, "99.00")));

        List<ProdutoComPrecosResponse> resposta = precoService.buscarTodosComPrecos();

        assertThat(resposta).hasSize(2);
        ProdutoComPrecosResponse comPrecos = resposta.get(0);
        assertThat(comPrecos.getPrecos()).containsEntry(10L, new BigDecimal("25.00"))
            .containsEntry(20L, new BigDecimal("22.00"));
        assertThat(comPrecos.getPrecosDetalhados()).hasSize(3);
        assertThat(comPrecos.getMenorPreco()).isEqualByComparingTo("22.00");
        assertThat(comPrecos.getPromo()).isTrue();
        assertThat(comPrecos.getValorOriginal()).isEqualByComparingTo("30.00");
    }

    @Test
    void buscarTodosComPrecos_DeveRetornarProdutoSemPrecosENemPromocao() {
        when(produtoRepository.findAll()).thenReturn(List.of(arroz, feijao));
        when(precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc())
            .thenReturn(List.of(preco(1L, arroz, carrefour, "25.00", 15)));
        promocoesVigentes(List.of());

        ProdutoComPrecosResponse semPrecos = precoService.buscarTodosComPrecos().get(1);

        assertThat(semPrecos.getNome()).isEqualTo("Feijao");
        assertThat(semPrecos.getPrecos()).isEmpty();
        assertThat(semPrecos.getPrecosDetalhados()).isEmpty();
        assertThat(semPrecos.getPromo()).isFalse();
        assertThat(semPrecos.getValorOriginal()).isNull();
    }

    @Test
    void buscarTodosComPrecos_DeveRetornarListaVaziaQuandoNaoHaProdutos() {
        when(produtoRepository.findAll()).thenReturn(List.of());
        when(precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc()).thenReturn(List.of());
        promocoesVigentes(List.of());

        assertThat(precoService.buscarTodosComPrecos()).isEmpty();
    }

    @Test
    void criar_DeveAssumirDisponivelQuandoNaoInformado() {
        PrecoRequest request = PrecoRequest.builder()
            .produtoId(1L).mercadoId(10L).valor(new BigDecimal("12.50")).disponivel(null).build();
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(arroz));
        when(mercadoRepository.findById(10L)).thenReturn(Optional.of(carrefour));
        when(precoRepository.save(any(Preco.class))).thenAnswer(inv -> inv.getArgument(0));

        PrecoResponse resposta = precoService.criar(request);

        assertThat(resposta.getDisponivel()).isTrue();
        assertThat(resposta.getValor()).isEqualByComparingTo("12.50");
        assertThat(resposta.getProdutoId()).isEqualTo(1L);
        assertThat(resposta.getMercadoId()).isEqualTo(10L);
    }

    @Test
    void criar_DeveRespeitarDisponivelFalso() {
        PrecoRequest request = PrecoRequest.builder()
            .produtoId(1L).mercadoId(10L).valor(new BigDecimal("12.50")).disponivel(false).build();
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(arroz));
        when(mercadoRepository.findById(10L)).thenReturn(Optional.of(carrefour));
        when(precoRepository.save(any(Preco.class))).thenAnswer(inv -> inv.getArgument(0));

        precoService.criar(request);

        ArgumentCaptor<Preco> captor = ArgumentCaptor.forClass(Preco.class);
        verify(precoRepository).save(captor.capture());
        assertThat(captor.getValue().getDisponivel()).isFalse();
    }

    @Test
    void criar_DeveFalharQuandoProdutoNaoExiste() {
        PrecoRequest request = PrecoRequest.builder()
            .produtoId(99L).mercadoId(10L).valor(new BigDecimal("1.00")).build();
        when(produtoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> precoService.criar(request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Produto com id 99 nao encontrado(a)");

        verify(precoRepository, never()).save(any());
    }

    @Test
    void criar_DeveFalharQuandoMercadoNaoExiste() {
        PrecoRequest request = PrecoRequest.builder()
            .produtoId(1L).mercadoId(99L).valor(new BigDecimal("1.00")).build();
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(arroz));
        when(mercadoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> precoService.criar(request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Mercado com id 99 nao encontrado(a)");

        verify(precoRepository, never()).save(any());
    }

    @Test
    void remover_DeveExcluirPrecoExistente() {
        Preco existente = preco(7L, arroz, carrefour, "10.00", 1);
        when(precoRepository.findById(7L)).thenReturn(Optional.of(existente));

        precoService.remover(7L);

        verify(precoRepository).delete(existente);
    }

    @Test
    void remover_DeveFalharQuandoPrecoNaoExiste() {
        when(precoRepository.findById(eq(99L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> precoService.remover(99L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Preco com id 99 nao encontrado(a)");

        verify(precoRepository, never()).delete(any());
    }
}
