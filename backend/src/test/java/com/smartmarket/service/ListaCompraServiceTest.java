package com.smartmarket.service;

import com.smartmarket.dto.lista.ItemListaRequest;
import com.smartmarket.dto.lista.ListaCompraRequest;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.*;
import com.smartmarket.repository.*;
import com.smartmarket.security.UsuarioAutenticado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListaCompraServiceTest {
    @Mock ListaCompraRepository listaCompraRepository;
    @Mock ItemListaRepository itemListaRepository;
    @Mock ProdutoRepository produtoRepository;
    @Mock MercadoRepository mercadoRepository;
    @Mock PrecoRepository precoRepository;
    @Mock UsuarioAutenticado usuarioAutenticado;
    @InjectMocks ListaCompraService service;

    private Usuario usuario;
    private ListaCompra lista;
    private Produto produto;

    @BeforeEach
    void preparar() {
        usuario = Usuario.builder().id(1L).email("usuario@teste.com").build();
        produto = Produto.builder().id(9L).nome("Arroz").build();
        lista = ListaCompra.builder().id(3L).nome("Compras").usuario(usuario).build();
    }

    private void permitirAcesso() {
        when(listaCompraRepository.findById(3L)).thenReturn(Optional.of(lista));
        when(usuarioAutenticado.atual()).thenReturn(usuario);
    }

    @Test
    void listarMinhas_DeveRetornarApenasListasDoUsuario() {
        when(usuarioAutenticado.atual()).thenReturn(usuario);
        when(listaCompraRepository.findByUsuarioId(1L)).thenReturn(List.of(lista));
        assertThat(service.listarMinhas()).singleElement()
            .satisfies(resposta -> assertThat(resposta.getNome()).isEqualTo("Compras"));
    }

    @Test
    void criar_DevePersistirListaDoUsuario() {
        when(usuarioAutenticado.atual()).thenReturn(usuario);
        when(listaCompraRepository.save(any(ListaCompra.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        var request = ListaCompraRequest.builder().nome("  Mercado  ").build();
        assertThat(service.criar(request).getNome()).isEqualTo("Mercado");
        verify(listaCompraRepository).save(any(ListaCompra.class));
    }

    @Test
    void buscarPorId_DeOutroUsuario_DeveNegarAcesso() {
        when(listaCompraRepository.findById(3L)).thenReturn(Optional.of(lista));
        when(usuarioAutenticado.atual()).thenReturn(Usuario.builder().id(2L).build());
        assertThatThrownBy(() -> service.buscarPorId(3L))
            .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void renomear_DevePreservarItensEAlterarNome() {
        permitirAcesso();
        when(listaCompraRepository.save(lista)).thenReturn(lista);
        var request = ListaCompraRequest.builder().nome("  Festa  ").build();

        assertThat(service.renomear(3L, request).getNome()).isEqualTo("Festa");
        verify(listaCompraRepository).save(lista);
    }

    @Test
    void atualizarItem_DeveAlterarQuantidadeSemTrocarProduto() {
        permitirAcesso();
        var item = ItemLista.builder().id(7L).listaCompra(lista)
            .produto(produto).quantidade(2).build();
        lista.getItens().add(item);
        when(itemListaRepository.findByIdAndListaCompraId(7L, 3L))
            .thenReturn(Optional.of(item));
        var request = ItemListaRequest.builder().produtoId(9L).quantidade(5).build();

        assertThat(service.atualizarItem(3L, 7L, request).getItens())
            .singleElement().satisfies(response ->
                assertThat(response.getQuantidade()).isEqualTo(5));
        verify(itemListaRepository).save(item);
    }

    @Test
    void atualizarItem_DeveImpedirTrocaDeProduto() {
        permitirAcesso();
        var item = ItemLista.builder().id(7L).listaCompra(lista)
            .produto(produto).quantidade(2).build();
        when(itemListaRepository.findByIdAndListaCompraId(7L, 3L))
            .thenReturn(Optional.of(item));

        var request = ItemListaRequest.builder().produtoId(8L).quantidade(5).build();
        assertThatThrownBy(() -> service.atualizarItem(3L, 7L, request))
            .isInstanceOf(IllegalArgumentException.class);
        verify(itemListaRepository, never()).save(any());
    }

    @Test
    void atualizarItem_Inexistente_DeveRetornarErro() {
        permitirAcesso();
        when(itemListaRepository.findByIdAndListaCompraId(99L, 3L))
            .thenReturn(Optional.empty());
        var request = ItemListaRequest.builder().produtoId(9L).quantidade(5).build();
        assertThatThrownBy(() -> service.atualizarItem(3L, 99L, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void removerLista_DeveExcluirApenasListaPropria() {
        permitirAcesso();
        service.removerLista(3L);
        verify(listaCompraRepository).delete(lista);
    }

    @Test
    void adicionarItem_ComProdutoInexistente_DeveRejeitar() {
        permitirAcesso();
        when(produtoRepository.findById(99L)).thenReturn(Optional.empty());
        var request = ItemListaRequest.builder().produtoId(99L).quantidade(1).build();
        assertThatThrownBy(() -> service.adicionarItem(3L, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
