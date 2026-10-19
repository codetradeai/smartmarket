package com.smartmarket.service;

import com.smartmarket.dto.produto.ProdutoRequest;
import com.smartmarket.dto.produto.ProdutoResponse;
import com.smartmarket.exception.ProdutoNaoEncontradoException;
import com.smartmarket.model.Produto;
import com.smartmarket.repository.ProdutoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProdutoServiceTest {

    @Mock
    private ProdutoRepository produtoRepository;

    @InjectMocks
    private ProdutoService produtoService;

    private Produto produto;
    private ProdutoRequest produtoRequest;
    private Pageable pageable;

    @BeforeEach
    void setUp() {
        produto = Produto.builder()
            .id(1L)
            .nome("Arroz Tio Joao 5kg")
            .marca("Tio Joao")
            .quantidade(5.0)
            .unidade("kg")
            .codigoBarras("7891234567890")
            .categoria("mercearia")
            .build();

        produtoRequest = ProdutoRequest.builder()
            .nome("Feijao Carioca 1kg")
            .marca("Kicaldo")
            .quantidade(1.0)
            .unidade("kg")
            .codigoBarras("7898123456789")
            .categoria("mercearia")
            .build();

        pageable = PageRequest.of(0, 10);
    }

    @Test
    void buscar_SemFiltros_DeveRetornarPaginaDeProdutos() {
        when(produtoRepository.findAll(any(Specification.class), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(produto), pageable, 1));

        Page<ProdutoResponse> resultado = produtoService.buscar(null, null, pageable);

        assertThat(resultado.getContent()).hasSize(1);
        assertThat(resultado.getContent().get(0).getId()).isEqualTo(1L);
        assertThat(resultado.getContent().get(0).getNome()).isEqualTo("Arroz Tio Joao 5kg");
        assertThat(resultado.getContent().get(0).getCategoria()).isEqualTo("mercearia");
        verify(produtoRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void buscar_ComNomeECategoria_DeveConsultarRepositorioComFiltros() {
        when(produtoRepository.findAll(any(Specification.class), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(produto), pageable, 1));

        Page<ProdutoResponse> resultado = produtoService.buscar("arroz", "mercearia", pageable);

        assertThat(resultado.getContent()).hasSize(1);
        verify(produtoRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void buscar_PaginaForaDoRange_DeveRetornarVazia() {
        when(produtoRepository.findAll(any(Specification.class), any(Pageable.class)))
            .thenReturn(Page.empty(pageable));

        Page<ProdutoResponse> resultado = produtoService.buscar(null, null, pageable);

        assertThat(resultado.getContent()).isEmpty();
        assertThat(resultado.getTotalElements()).isZero();
    }

    @Test
    void buscarPorId_DeveRetornarProduto() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));

        ProdutoResponse resultado = produtoService.buscarPorId(1L);

        assertThat(resultado.getId()).isEqualTo(1L);
        assertThat(resultado.getNome()).isEqualTo("Arroz Tio Joao 5kg");
        assertThat(resultado.getMarca()).isEqualTo("Tio Joao");
        assertThat(resultado.getUnidade()).isEqualTo("kg");
        assertThat(resultado.getCodigoBarras()).isEqualTo("7891234567890");
    }

    @Test
    void buscarPorId_DeveLancarErro_QuandoNaoEncontrado() {
        when(produtoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> produtoService.buscarPorId(99L))
            .isInstanceOf(ProdutoNaoEncontradoException.class)
            .hasMessageContaining("99");
    }

    @Test
    void criar_DeveSalvarERetornarResponse() {
        when(produtoRepository.save(any(Produto.class))).thenAnswer(invocation -> {
            Produto salvo = invocation.getArgument(0);
            salvo.setId(10L);
            return salvo;
        });

        ProdutoResponse resultado = produtoService.criar(produtoRequest);

        assertThat(resultado.getId()).isEqualTo(10L);
        assertThat(resultado.getNome()).isEqualTo("Feijao Carioca 1kg");
        assertThat(resultado.getCategoria()).isEqualTo("mercearia");
        verify(produtoRepository).save(any(Produto.class));
    }

    @Test
    void atualizar_DeveAtualizarCamposDoProduto() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(produtoRepository.save(any(Produto.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProdutoRequest novoRequest = ProdutoRequest.builder()
            .nome("Arroz Integral 1kg")
            .marca("Tio Joao")
            .quantidade(1.0)
            .unidade("kg")
            .codigoBarras("7891234567890")
            .categoria("mercearia")
            .build();

        ProdutoResponse resultado = produtoService.atualizar(1L, novoRequest);

        assertThat(resultado.getNome()).isEqualTo("Arroz Integral 1kg");
        assertThat(resultado.getQuantidade()).isEqualTo(1.0);
        verify(produtoRepository).save(any(Produto.class));
    }

    @Test
    void atualizar_DeveLancarErro_QuandoNaoEncontrado() {
        when(produtoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> produtoService.atualizar(99L, produtoRequest))
            .isInstanceOf(ProdutoNaoEncontradoException.class);

        verify(produtoRepository, never()).save(any());
    }

    @Test
    void remover_DeveExcluirProduto() {
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));

        produtoService.remover(1L);

        verify(produtoRepository).delete(produto);
    }

    @Test
    void remover_DeveLancarErro_QuandoNaoEncontrado() {
        when(produtoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> produtoService.remover(99L))
            .isInstanceOf(ProdutoNaoEncontradoException.class);

        verify(produtoRepository, never()).delete(any(Produto.class));
    }

    @Test
    void normalizar_DeveRemoverAcentosECaixaAlta() {
        assertThat(ProdutoSpecification.normalizar("Arroz Tio João 5kg"))
            .isEqualTo("arroz tio joao 5kg");
        assertThat(ProdutoSpecification.normalizar("  Leite  Ninho "))
            .isEqualTo("leite ninho");
    }
}
