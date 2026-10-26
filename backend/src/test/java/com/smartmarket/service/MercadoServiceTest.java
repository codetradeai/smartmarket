package com.smartmarket.service;

import com.smartmarket.dto.mercado.MercadoRequest;
import com.smartmarket.dto.mercado.MercadoResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Mercado;
import com.smartmarket.repository.MercadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MercadoServiceTest {

    @Mock
    private MercadoRepository mercadoRepository;

    @InjectMocks
    private MercadoService mercadoService;

    private Mercado mercado(Long id, String nome, boolean ativo) {
        return Mercado.builder().id(id).nome(nome).endereco("Rua A, 1").logoUrl("logo.png").ativo(ativo).build();
    }

    @Test
    void listarAtivos_DeveRetornarSomenteOsMercadosDoRepositorioDeAtivos() {
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of(mercado(1L, "Carrefour", true)));

        List<MercadoResponse> resposta = mercadoService.listarAtivos();

        assertThat(resposta).hasSize(1);
        assertThat(resposta.get(0).getNome()).isEqualTo("Carrefour");
        assertThat(resposta.get(0).getAtivo()).isTrue();
    }

    @Test
    void listarAtivos_DeveRetornarListaVaziaQuandoNaoHaMercados() {
        when(mercadoRepository.findByAtivoTrue()).thenReturn(List.of());

        assertThat(mercadoService.listarAtivos()).isEmpty();
    }

    @Test
    void listarTodos_DeveIncluirMercadosInativos() {
        when(mercadoRepository.findAll()).thenReturn(
            List.of(mercado(1L, "Carrefour", true), mercado(2L, "Fort", false)));

        List<MercadoResponse> resposta = mercadoService.listarTodos();

        assertThat(resposta).extracting(MercadoResponse::getNome).containsExactly("Carrefour", "Fort");
        assertThat(resposta).extracting(MercadoResponse::getAtivo).containsExactly(true, false);
    }

    @Test
    void buscarPorId_DeveRetornarMercado() {
        when(mercadoRepository.findById(1L)).thenReturn(Optional.of(mercado(1L, "Carrefour", true)));

        MercadoResponse resposta = mercadoService.buscarPorId(1L);

        assertThat(resposta.getId()).isEqualTo(1L);
        assertThat(resposta.getEndereco()).isEqualTo("Rua A, 1");
        assertThat(resposta.getLogoUrl()).isEqualTo("logo.png");
    }

    @Test
    void buscarPorId_DeveLancarErroQuandoNaoEncontrado() {
        when(mercadoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> mercadoService.buscarPorId(99L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Mercado com id 99 nao encontrado(a)");
    }

    @Test
    void criar_DeveSalvarMercadoAtivo() {
        MercadoRequest request = MercadoRequest.builder()
            .nome("Novo").endereco("Rua B, 2").logoUrl("novo.png").build();
        when(mercadoRepository.save(any(Mercado.class))).thenAnswer(inv -> inv.getArgument(0));

        MercadoResponse resposta = mercadoService.criar(request);

        ArgumentCaptor<Mercado> captor = ArgumentCaptor.forClass(Mercado.class);
        verify(mercadoRepository).save(captor.capture());
        assertThat(captor.getValue().getAtivo()).isTrue();
        assertThat(captor.getValue().getNome()).isEqualTo("Novo");
        assertThat(resposta.getEndereco()).isEqualTo("Rua B, 2");
        assertThat(resposta.getAtivo()).isTrue();
    }

    @Test
    void atualizar_DeveAlterarDadosSemMudarOStatusAtivo() {
        Mercado existente = mercado(1L, "Antigo", false);
        when(mercadoRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(mercadoRepository.save(any(Mercado.class))).thenAnswer(inv -> inv.getArgument(0));
        MercadoRequest request = MercadoRequest.builder()
            .nome("Renomeado").endereco("Rua C, 3").logoUrl("c.png").build();

        MercadoResponse resposta = mercadoService.atualizar(1L, request);

        assertThat(resposta.getNome()).isEqualTo("Renomeado");
        assertThat(resposta.getEndereco()).isEqualTo("Rua C, 3");
        assertThat(resposta.getLogoUrl()).isEqualTo("c.png");
        assertThat(resposta.getAtivo()).isFalse();
    }

    @Test
    void atualizar_DeveLancarErroQuandoNaoEncontrado() {
        when(mercadoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> mercadoService.atualizar(99L, MercadoRequest.builder().nome("X").build()))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(mercadoRepository, never()).save(any());
    }

    @Test
    void remover_DeveExcluirMercadoExistente() {
        Mercado existente = mercado(1L, "Carrefour", true);
        when(mercadoRepository.findById(1L)).thenReturn(Optional.of(existente));

        mercadoService.remover(1L);

        verify(mercadoRepository).delete(existente);
    }

    @Test
    void remover_DeveLancarErroQuandoNaoEncontrado() {
        when(mercadoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> mercadoService.remover(99L))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(mercadoRepository, never()).delete(any());
    }
}
