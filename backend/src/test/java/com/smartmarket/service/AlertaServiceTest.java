package com.smartmarket.service;

import com.smartmarket.dto.alerta.AlertaRequest;
import com.smartmarket.dto.alerta.AtualizarAlertaRequest;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.*;
import com.smartmarket.repository.*;
import com.smartmarket.security.UsuarioAutenticado;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertaServiceTest {
    @Mock AlertaRepository alertas;
    @Mock ProdutoRepository produtos;
    @Mock ConsultaMenorPreco menorPreco;
    @Mock UsuarioAutenticado autenticado;
    @InjectMocks AlertaService service;

    private Usuario usuario(long id) { return Usuario.builder().id(id).nome("Ana").build(); }
    private Produto produto() { return Produto.builder().id(3L).nome("Arroz").build(); }
    private Alerta alerta(long usuarioId) {
        return Alerta.builder().id(8L).usuario(usuario(usuarioId)).produto(produto())
            .precoAlvo(new BigDecimal("10")).ativo(true).build();
    }

    @Test void listarMeus_Vazio() {
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(alertas.findByUsuarioIdAndAtivoTrue(1L)).thenReturn(List.of());
        assertThat(service.listarMeus()).isEmpty();
    }

    @Test void listarMeus_SemPrecoDisponivel() {
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(alertas.findByUsuarioIdAndAtivoTrue(1L)).thenReturn(List.of(alerta(1L)));
        when(menorPreco.menorDisponivel(3L)).thenReturn(Optional.empty());
        assertThat(service.listarMeus().get(0).isAtingido()).isFalse();
    }

    @Test void listarMeus_AlertaAtingido() {
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(alertas.findByUsuarioIdAndAtivoTrue(1L)).thenReturn(List.of(alerta(1L)));
        var preco = Preco.builder().valor(new BigDecimal("8")).mercado(Mercado.builder().id(4L).nome("Fort").build()).build();
        when(menorPreco.menorDisponivel(3L)).thenReturn(Optional.of(preco));
        assertThat(service.listarMeus().get(0).isAtingido()).isTrue();
    }

    @Test void listarMeus_PrecoSuperiorNaoAtingido() {
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(alertas.findByUsuarioIdAndAtivoTrue(1L)).thenReturn(List.of(alerta(1L)));
        var preco = Preco.builder().valor(new BigDecimal("12")).mercado(Mercado.builder().id(4L).nome("Fort").build()).build();
        when(menorPreco.menorDisponivel(3L)).thenReturn(Optional.of(preco));
        assertThat(service.listarMeus().get(0).isAtingido()).isFalse();
    }

    @Test void salvar_ProdutoInexistente() {
        AlertaRequest r = mock(AlertaRequest.class);
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(r.getProdutoId()).thenReturn(3L);
        when(produtos.findById(3L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.salvar(r)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void salvar_AtualizaAlertaExistente() {
        AlertaRequest r = mock(AlertaRequest.class);
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(r.getProdutoId()).thenReturn(3L);
        when(r.getPrecoAlvo()).thenReturn(new BigDecimal("7"));
        when(produtos.findById(3L)).thenReturn(Optional.of(produto()));
        when(alertas.findByUsuarioIdAndProdutoId(1L, 3L)).thenReturn(Optional.of(alerta(1L)));
        when(alertas.save(any(Alerta.class))).thenAnswer(inv -> inv.getArgument(0));
        when(menorPreco.menorDisponivel(3L)).thenReturn(Optional.empty());
        assertThat(service.salvar(r).isCriado()).isFalse();
        verify(alertas).save(argThat(a -> a.getPrecoAlvo().compareTo(new BigDecimal("7")) == 0));
    }

    @Test void salvar_CriaNovoAlerta() {
        AlertaRequest r = mock(AlertaRequest.class);
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(r.getProdutoId()).thenReturn(3L);
        when(r.getPrecoAlvo()).thenReturn(new BigDecimal("7"));
        when(produtos.findById(3L)).thenReturn(Optional.of(produto()));
        when(alertas.findByUsuarioIdAndProdutoId(1L, 3L)).thenReturn(Optional.empty());
        when(alertas.save(any(Alerta.class))).thenAnswer(inv -> inv.getArgument(0));
        when(menorPreco.menorDisponivel(3L)).thenReturn(Optional.empty());
        assertThat(service.salvar(r).isCriado()).isTrue();
    }

    @Test void atualizar_AlertaDeOutroUsuarioBloqueado() {
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(alertas.findById(8L)).thenReturn(Optional.of(alerta(2L)));
        assertThatThrownBy(() -> service.atualizar(8L, mock(AtualizarAlertaRequest.class)))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void atualizar_AlteraAlvoEReativa() {
        AtualizarAlertaRequest r = mock(AtualizarAlertaRequest.class);
        when(r.getPrecoAlvo()).thenReturn(new BigDecimal("6"));
        Alerta a = alerta(1L);
        a.setAtivo(false);
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(alertas.findById(8L)).thenReturn(Optional.of(a));
        when(alertas.save(a)).thenReturn(a);
        when(menorPreco.menorDisponivel(3L)).thenReturn(Optional.empty());
        assertThat(service.atualizar(8L, r).getAtivo()).isTrue();
    }

    @Test void desativar_AlertaNaoEncontrado() {
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(alertas.findById(8L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.desativar(8L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void desativar_AlteraEstado() {
        Alerta a = alerta(1L);
        when(autenticado.atual()).thenReturn(usuario(1L));
        when(alertas.findById(8L)).thenReturn(Optional.of(a));
        service.desativar(8L);
        assertThat(a.getAtivo()).isFalse();
        verify(alertas).save(a);
    }
}
