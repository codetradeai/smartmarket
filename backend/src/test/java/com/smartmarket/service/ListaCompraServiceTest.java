package com.smartmarket.service;

import com.smartmarket.dto.lista.ItemListaRequest;
import com.smartmarket.dto.lista.ItemListaResponse;
import com.smartmarket.dto.lista.ListaRequest;
import com.smartmarket.dto.lista.ListaResponse;
import com.smartmarket.exception.ItemListaNaoEncontradoException;
import com.smartmarket.exception.ListaNaoEncontradaException;
import com.smartmarket.exception.ProdutoNaoEncontradoException;
import com.smartmarket.model.ItemLista;
import com.smartmarket.model.ListaCompra;
import com.smartmarket.model.Papel;
import com.smartmarket.model.Produto;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.ItemListaRepository;
import com.smartmarket.repository.ListaCompraRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListaCompraServiceTest {

    @Mock
    private ListaCompraRepository listaCompraRepository;

    @Mock
    private ItemListaRepository itemListaRepository;

    @Mock
    private ProdutoRepository produtoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private ListaCompraService listaCompraService;

    private static final String EMAIL = "teste@email.com";

    private Usuario usuario;
    private Produto produto;
    private ListaCompra lista;

    @BeforeEach
    void setUp() {
        usuario = Usuario.builder()
            .id(1L)
            .nome("Teste")
            .email(EMAIL)
            .senha("$2a$10$hash")
            .papel(Papel.USER)
            .build();

        produto = Produto.builder()
            .id(1L)
            .nome("Arroz Tio Joao 5kg")
            .marca("Tio Joao")
            .categoria("mercearia")
            .build();

        lista = ListaCompra.builder()
            .id(1L)
            .usuario(usuario)
            .nome("Churrasco")
            .build();
    }

    @Test
    void criar_DeveCriarListaComItens() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(listaCompraRepository.save(any(ListaCompra.class))).thenAnswer(invocation -> {
            ListaCompra salva = invocation.getArgument(0);
            salva.setId(1L);
            return salva;
        });

        ListaRequest request = new ListaRequest();
        request.setNome("Churrasco");
        request.setItens(List.of(new ItemListaRequest(1L, 2)));

        ListaResponse response = listaCompraService.criar(EMAIL, request);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getNome()).isEqualTo("Churrasco");
        assertThat(response.getTotalItens()).isEqualTo(1);
        verify(listaCompraRepository).save(any(ListaCompra.class));
    }

    @Test
    void criar_ComProdutoInexistente_DeveLancarErro() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(produtoRepository.findById(99L)).thenReturn(Optional.empty());

        ListaRequest request = new ListaRequest();
        request.setNome("Churrasco");
        request.setItens(List.of(new ItemListaRequest(99L, 1)));

        assertThatThrownBy(() -> listaCompraService.criar(EMAIL, request))
            .isInstanceOf(ProdutoNaoEncontradoException.class);

        verify(listaCompraRepository, never()).save(any());
    }

    @Test
    void listarPorUsuario_DeveRetornarListasComTotalDeItens() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByUsuarioId(1L)).thenReturn(List.of(lista));
        when(itemListaRepository.countByListaCompraId(1L)).thenReturn(3L);

        List<ListaResponse> resposta = listaCompraService.listarPorUsuario(EMAIL);

        assertThat(resposta).hasSize(1);
        assertThat(resposta.get(0).getNome()).isEqualTo("Churrasco");
        assertThat(resposta.get(0).getTotalItens()).isEqualTo(3);
        assertThat(resposta.get(0).getItens()).isNull();
    }

    @Test
    void buscarPorId_DeveRetornarDetalheComItens() {
        ItemLista item = ItemLista.builder().id(5L).listaCompra(lista).produto(produto).quantidade(2).build();

        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(itemListaRepository.findByListaCompraId(1L)).thenReturn(List.of(item));
        when(produtoRepository.findAllById(List.of(1L))).thenReturn(List.of(produto));

        ListaResponse response = listaCompraService.buscarPorId(EMAIL, 1L);

        assertThat(response.getItens()).hasSize(1);
        assertThat(response.getItens().get(0).getProdutoNome()).isEqualTo("Arroz Tio Joao 5kg");
        assertThat(response.getItens().get(0).getQuantidade()).isEqualTo(2);
    }

    @Test
    void buscarPorId_DeveLancarErro_QuandoNaoEDono() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> listaCompraService.buscarPorId(EMAIL, 1L))
            .isInstanceOf(ListaNaoEncontradaException.class);
    }

    @Test
    void renomear_DeveAtualizarNome() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(listaCompraRepository.save(any(ListaCompra.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(itemListaRepository.findByListaCompraId(1L)).thenReturn(List.of());

        ListaRequest request = new ListaRequest();
        request.setNome("Natal");

        ListaResponse response = listaCompraService.renomear(EMAIL, 1L, request);

        assertThat(response.getNome()).isEqualTo("Natal");
        assertThat(lista.getNome()).isEqualTo("Natal");
    }

    @Test
    void remover_DeveExcluirLista() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));

        listaCompraService.remover(EMAIL, 1L);

        verify(listaCompraRepository).delete(lista);
    }

    @Test
    void adicionarItem_DeveCriarNovoItem() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(itemListaRepository.save(any(ItemLista.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ItemListaResponse response = listaCompraService
            .adicionarItem(EMAIL, 1L, new ItemListaRequest(1L, 3));

        assertThat(response.getQuantidade()).isEqualTo(3);
        assertThat(response.getProdutoNome()).isEqualTo("Arroz Tio Joao 5kg");
        assertThat(lista.getItens()).hasSize(1);
    }

    @Test
    void adicionarItem_ComProdutoRepetido_DeveSomarQuantidade() {
        lista.getItens().add(ItemLista.builder()
            .id(5L).listaCompra(lista).produto(produto).quantidade(2).build());

        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(itemListaRepository.save(any(ItemLista.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ItemListaResponse response = listaCompraService
            .adicionarItem(EMAIL, 1L, new ItemListaRequest(1L, 3));

        assertThat(response.getId()).isEqualTo(5L);
        assertThat(response.getQuantidade()).isEqualTo(5);
        assertThat(lista.getItens()).hasSize(1);
    }

    @Test
    void atualizarItem_DeveAlterarQuantidade() {
        ItemLista item = ItemLista.builder().id(5L).listaCompra(lista).produto(produto).quantidade(2).build();
        lista.getItens().add(item);

        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(itemListaRepository.findByIdAndListaCompraId(5L, 1L)).thenReturn(Optional.of(item));
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(itemListaRepository.save(any(ItemLista.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ItemListaResponse response = listaCompraService
            .atualizarItem(EMAIL, 1L, 5L, new ItemListaRequest(1L, 7));

        assertThat(response.getQuantidade()).isEqualTo(7);
    }

    @Test
    void removerItem_DeveExcluirItem() {
        ItemLista item = ItemLista.builder().id(5L).listaCompra(lista).produto(produto).quantidade(2).build();
        lista.getItens().add(item);

        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(itemListaRepository.findByIdAndListaCompraId(5L, 1L)).thenReturn(Optional.of(item));

        listaCompraService.removerItem(EMAIL, 1L, 5L);

        verify(itemListaRepository).delete(item);
        assertThat(lista.getItens()).isEmpty();
    }

    @Test
    void removerItem_ItemInexistente_DeveLancarErro() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(itemListaRepository.findByIdAndListaCompraId(99L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> listaCompraService.removerItem(EMAIL, 1L, 99L))
            .isInstanceOf(ItemListaNaoEncontradoException.class);

        verify(itemListaRepository, never()).delete(any(ItemLista.class));
    }

    @Test
    void adicionarItem_SomaAcimaDoTeto_DeveRecusarEManterAQuantidade() {
        ItemLista existente = ItemLista.builder()
            .id(5L).listaCompra(lista).produto(produto).quantidade(999).build();
        lista.getItens().add(existente);

        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));

        assertThatThrownBy(() -> listaCompraService.adicionarItem(EMAIL, 1L, new ItemListaRequest(1L, 1)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("999");

        assertThat(existente.getQuantidade()).isEqualTo(999);
        verify(itemListaRepository, never()).save(any(ItemLista.class));
    }

    @Test
    void adicionarItem_SomaQueEstouraInteger_NaoDeveVirarNegativa() {
        ItemLista existente = ItemLista.builder()
            .id(5L).listaCompra(lista).produto(produto).quantidade(Integer.MAX_VALUE).build();
        lista.getItens().add(existente);

        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));

        assertThatThrownBy(() -> listaCompraService
                .adicionarItem(EMAIL, 1L, new ItemListaRequest(1L, Integer.MAX_VALUE)))
            .isInstanceOf(IllegalArgumentException.class);

        assertThat(existente.getQuantidade()).isEqualTo(Integer.MAX_VALUE);
        verify(itemListaRepository, never()).save(any(ItemLista.class));
    }

    @Test
    void adicionarItem_SomaExatamenteNoTeto_DeveAceitar() {
        lista.getItens().add(ItemLista.builder()
            .id(5L).listaCompra(lista).produto(produto).quantidade(500).build());

        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(itemListaRepository.save(any(ItemLista.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ItemListaResponse response = listaCompraService
            .adicionarItem(EMAIL, 1L, new ItemListaRequest(1L, 499));

        assertThat(response.getQuantidade()).isEqualTo(999);
    }

    @Test
    void adicionarItem_ListaCheia_DeveRecusarProdutoNovoMasAceitarSomaEmItemExistente() {
        for (long i = 10; i < 10 + 100; i++) {
            Produto outro = Produto.builder().id(i).nome("Produto " + i).categoria("mercearia").build();
            lista.getItens().add(ItemLista.builder().id(i).listaCompra(lista).produto(outro).quantidade(1).build());
        }
        Produto novo = Produto.builder().id(500L).nome("Novo").categoria("mercearia").build();

        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        when(listaCompraRepository.findByIdAndUsuarioId(1L, 1L)).thenReturn(Optional.of(lista));
        when(produtoRepository.findById(500L)).thenReturn(Optional.of(novo));
        when(produtoRepository.findById(10L)).thenReturn(Optional.of(lista.getItens().get(0).getProduto()));
        when(itemListaRepository.save(any(ItemLista.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThatThrownBy(() -> listaCompraService.adicionarItem(EMAIL, 1L, new ItemListaRequest(500L, 1)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("100");
        assertThat(lista.getItens()).hasSize(100);

        ItemListaResponse somado = listaCompraService.adicionarItem(EMAIL, 1L, new ItemListaRequest(10L, 2));
        assertThat(somado.getQuantidade()).isEqualTo(3);
    }
}
