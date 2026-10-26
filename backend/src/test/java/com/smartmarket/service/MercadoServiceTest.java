package com.smartmarket.service;

import com.smartmarket.dto.mercado.MercadoRequest;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Mercado;
import com.smartmarket.repository.MercadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MercadoServiceTest {
    @Mock MercadoRepository repository;
    @InjectMocks MercadoService service;

    private Mercado mercado() {
        return Mercado.builder().id(5L).nome("Fort").endereco("Centro").ativo(true).build();
    }

    @Test void listarAtivos_RetornaApenasAtivos() {
        when(repository.findByAtivoTrue()).thenReturn(List.of(mercado()));
        assertThat(service.listarAtivos()).hasSize(1);
        verify(repository, never()).findAll();
    }

    @Test void listarTodos_PodeRetornarVazio() {
        when(repository.findAll()).thenReturn(List.of());
        assertThat(service.listarTodos()).isEmpty();
    }

    @Test void buscarPorId_Encontrado() {
        when(repository.findById(5L)).thenReturn(Optional.of(mercado()));
        assertThat(service.buscarPorId(5L).getNome()).isEqualTo("Fort");
    }

    @Test void buscarPorId_Inexistente() {
        when(repository.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.buscarPorId(9L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void criar_IniciaAtivo() {
        MercadoRequest request = mock(MercadoRequest.class);
        when(request.getNome()).thenReturn("Novo");
        when(repository.save(any(Mercado.class))).thenAnswer(inv -> inv.getArgument(0));
        assertThat(service.criar(request).getNome()).isEqualTo("Novo");
        verify(repository).save(argThat(Mercado::getAtivo));
    }

    @Test void atualizar_AlteraMercadoExistente() {
        MercadoRequest request = mock(MercadoRequest.class);
        when(request.getNome()).thenReturn("Atualizado");
        when(repository.findById(5L)).thenReturn(Optional.of(mercado()));
        when(repository.save(any(Mercado.class))).thenAnswer(inv -> inv.getArgument(0));
        assertThat(service.atualizar(5L, request).getNome()).isEqualTo("Atualizado");
    }

    @Test void atualizar_Inexistente() {
        MercadoRequest request = mock(MercadoRequest.class);
        when(repository.findById(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.atualizar(7L, request)).isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).save(any());
    }

    @Test void remover_Encontrado() {
        Mercado mercado = mercado();
        when(repository.findById(5L)).thenReturn(Optional.of(mercado));
        service.remover(5L);
        verify(repository).delete(mercado);
    }

    @Test void remover_Inexistente() {
        when(repository.findById(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.remover(7L)).isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).delete(any());
    }
}
