package com.smartmarket.service;

import com.smartmarket.dto.favorito.FavoritoRequest;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.*;
import com.smartmarket.repository.*;
import com.smartmarket.security.UsuarioAutenticado;
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
class FavoritoServiceTest {
    @Mock FavoritoRepository favoritos;
    @Mock FavoritoProdutoRepository favoritosProduto;
    @Mock MercadoRepository mercados;
    @Mock ProdutoRepository produtos;
    @Mock PrecoService precos;
    @Mock UsuarioAutenticado autenticado;
    @InjectMocks FavoritoService service;

    private Usuario usuario() { return Usuario.builder().id(1L).nome("Ana").build(); }
    private Mercado mercado(boolean ativo) { return Mercado.builder().id(2L).nome("Fort").ativo(ativo).build(); }
    private Produto produto() { return Produto.builder().id(3L).nome("Arroz").build(); }

    @Test void listarMeus_SemFavoritos() {
        when(autenticado.atual()).thenReturn(usuario());
        when(favoritos.findByUsuarioId(1L)).thenReturn(List.of());
        assertThat(service.listarMeus()).isEmpty();
    }

    @Test void favoritar_MercadoInexistente() {
        FavoritoRequest r = mock(FavoritoRequest.class);
        when(autenticado.atual()).thenReturn(usuario());
        when(r.getMercadoId()).thenReturn(2L);
        when(mercados.findById(2L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.favoritar(r)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void favoritar_MercadoInativo() {
        FavoritoRequest r = mock(FavoritoRequest.class);
        when(autenticado.atual()).thenReturn(usuario());
        when(r.getMercadoId()).thenReturn(2L);
        when(mercados.findById(2L)).thenReturn(Optional.of(mercado(false)));
        assertThatThrownBy(() -> service.favoritar(r)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(favoritos);
    }

    @Test void favoritar_ExistenteNaoDuplica() {
        FavoritoRequest r = mock(FavoritoRequest.class);
        when(autenticado.atual()).thenReturn(usuario());
        when(r.getMercadoId()).thenReturn(2L);
        when(mercados.findById(2L)).thenReturn(Optional.of(mercado(true)));
        when(favoritos.findByUsuarioIdAndMercadoId(1L, 2L))
            .thenReturn(Optional.of(Favorito.builder().id(5L).usuario(usuario()).mercado(mercado(true)).build()));
        assertThat(service.favoritar(r).isCriado()).isFalse();
        verify(favoritos, never()).save(any());
    }

    @Test void favoritar_NovoGravaUmaVez() {
        FavoritoRequest r = mock(FavoritoRequest.class);
        when(autenticado.atual()).thenReturn(usuario());
        when(r.getMercadoId()).thenReturn(2L);
        when(mercados.findById(2L)).thenReturn(Optional.of(mercado(true)));
        when(favoritos.findByUsuarioIdAndMercadoId(1L, 2L)).thenReturn(Optional.empty());
        when(favoritos.save(any(Favorito.class))).thenAnswer(inv -> inv.getArgument(0));
        assertThat(service.favoritar(r).isCriado()).isTrue();
        verify(favoritos).save(any(Favorito.class));
    }

    @Test void desfavoritar_Inexistente() {
        when(autenticado.atual()).thenReturn(usuario());
        when(favoritos.findByUsuarioIdAndMercadoId(1L, 2L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.desfavoritar(2L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void desfavoritar_Existente() {
        Favorito f = Favorito.builder().id(5L).usuario(usuario()).mercado(mercado(true)).build();
        when(autenticado.atual()).thenReturn(usuario());
        when(favoritos.findByUsuarioIdAndMercadoId(1L, 2L)).thenReturn(Optional.of(f));
        service.desfavoritar(2L);
        verify(favoritos).delete(f);
    }

    @Test void favoritarProduto_Inexistente() {
        when(autenticado.atual()).thenReturn(usuario());
        when(produtos.findById(3L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.favoritarProduto(3L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void favoritarProduto_NovoGrava() {
        when(autenticado.atual()).thenReturn(usuario());
        when(produtos.findById(3L)).thenReturn(Optional.of(produto()));
        when(favoritosProduto.existsByUsuarioIdAndProdutoId(1L, 3L)).thenReturn(false);
        service.favoritarProduto(3L);
        verify(favoritosProduto).save(any(FavoritoProduto.class));
    }

    @Test void favoritarProduto_RepetidoNaoDuplica() {
        when(autenticado.atual()).thenReturn(usuario());
        when(produtos.findById(3L)).thenReturn(Optional.of(produto()));
        when(favoritosProduto.existsByUsuarioIdAndProdutoId(1L, 3L)).thenReturn(true);
        service.favoritarProduto(3L);
        verify(favoritosProduto, never()).save(any());
    }

    @Test void desfavoritarProduto_Inexistente() {
        when(autenticado.atual()).thenReturn(usuario());
        when(favoritosProduto.findByUsuarioIdAndProdutoId(1L, 3L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.desfavoritarProduto(3L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void desfavoritarProduto_Existente() {
        FavoritoProduto fp = FavoritoProduto.builder().usuario(usuario()).produto(produto()).build();
        when(autenticado.atual()).thenReturn(usuario());
        when(favoritosProduto.findByUsuarioIdAndProdutoId(1L, 3L)).thenReturn(Optional.of(fp));
        service.desfavoritarProduto(3L);
        verify(favoritosProduto).delete(fp);
    }

    @Test void listarProdutosFavoritos_ListaVazia() {
        when(autenticado.atual()).thenReturn(usuario());
        when(favoritosProduto.findByUsuarioId(1L)).thenReturn(List.of());
        assertThat(service.listarProdutosFavoritos()).isEmpty();
    }
}
