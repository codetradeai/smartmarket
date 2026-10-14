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
import com.smartmarket.model.Produto;
import com.smartmarket.model.Usuario;
import com.smartmarket.repository.ItemListaRepository;
import com.smartmarket.repository.ListaCompraRepository;
import com.smartmarket.repository.ProdutoRepository;
import com.smartmarket.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ListaCompraService {

    private final ListaCompraRepository listaCompraRepository;
    private final ItemListaRepository itemListaRepository;
    private final ProdutoRepository produtoRepository;
    private final UsuarioRepository usuarioRepository;

    public ListaResponse criar(String email, ListaRequest request) {
        Usuario usuario = buscarUsuario(email);

        ListaCompra lista = ListaCompra.builder()
            .usuario(usuario)
            .nome(request.getNome())
            .build();

        for (ItemListaRequest itemRequest : request.getItens()) {
            Produto produto = buscarProduto(itemRequest.getProdutoId());
            lista.getItens().add(ItemLista.builder()
                .produto(produto)
                .quantidade(itemRequest.getQuantidade())
                .build());
        }

        ListaCompra salva = listaCompraRepository.save(lista);
        return ListaResponse.from(salva, salva.getItens().size());
    }

    @Transactional(readOnly = true)
    public List<ListaResponse> listarPorUsuario(String email) {
        Long usuarioId = buscarUsuario(email).getId();

        return listaCompraRepository.findByUsuarioId(usuarioId).stream()
            .map(lista -> ListaResponse.from(lista, (int) itemListaRepository.countByListaCompraId(lista.getId())))
            .toList();
    }

    @Transactional(readOnly = true)
    public ListaResponse buscarPorId(String email, Long listaId) {
        ListaCompra lista = buscarListaPropria(email, listaId);
        return montarDetalhe(lista);
    }

    public ListaResponse renomear(String email, Long listaId, ListaRequest request) {
        ListaCompra lista = buscarListaPropria(email, listaId);
        lista.setNome(request.getNome());
        ListaCompra salva = listaCompraRepository.save(lista);
        return montarDetalhe(salva);
    }

    public void remover(String email, Long listaId) {
        ListaCompra lista = buscarListaPropria(email, listaId);
        listaCompraRepository.delete(lista);
    }

    public ItemListaResponse adicionarItem(String email, Long listaId, ItemListaRequest request) {
        ListaCompra lista = buscarListaPropria(email, listaId);
        Produto produto = buscarProduto(request.getProdutoId());

        return lista.getItens().stream()
            .filter(item -> item.getProduto().getId().equals(produto.getId()))
            .findFirst()
            .map(item -> {
                item.setQuantidade(item.getQuantidade() + request.getQuantidade());
                itemListaRepository.save(item);
                return ItemListaResponse.from(item, produto);
            })
            .orElseGet(() -> {
                ItemLista item = ItemLista.builder()
                    .listaCompra(lista)
                    .produto(produto)
                    .quantidade(request.getQuantidade())
                    .build();
                lista.getItens().add(item);
                itemListaRepository.save(item);
                return ItemListaResponse.from(item, produto);
            });
    }

    public ItemListaResponse atualizarItem(String email, Long listaId, Long itemId, ItemListaRequest request) {
        ListaCompra lista = buscarListaPropria(email, listaId);
        ItemLista item = buscarItemDaLista(lista, itemId);
        Produto produto = buscarProduto(item.getProduto().getId());

        item.setQuantidade(request.getQuantidade());
        itemListaRepository.save(item);

        return ItemListaResponse.from(item, produto);
    }

    public void removerItem(String email, Long listaId, Long itemId) {
        ListaCompra lista = buscarListaPropria(email, listaId);
        ItemLista item = buscarItemDaLista(lista, itemId);

        lista.getItens().remove(item);
        itemListaRepository.delete(item);
    }

    private ListaResponse montarDetalhe(ListaCompra lista) {
        List<ItemLista> itens = itemListaRepository.findByListaCompraId(lista.getId());

        Map<Long, Produto> produtos = produtoRepository.findAllById(
                itens.stream().map(item -> item.getProduto().getId()).toList())
            .stream()
            .collect(Collectors.toMap(Produto::getId, Function.identity()));

        List<ItemListaResponse> itensResponse = itens.stream()
            .map(item -> ItemListaResponse.from(item, produtos.get(item.getProduto().getId())))
            .toList();

        return ListaResponse.from(lista, itensResponse.size(), itensResponse);
    }

    private Usuario buscarUsuario(String email) {
        return usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario nao encontrado"));
    }

    private Produto buscarProduto(Long produtoId) {
        return produtoRepository.findById(produtoId)
            .orElseThrow(() -> new ProdutoNaoEncontradoException(produtoId));
    }

    private ListaCompra buscarListaPropria(String email, Long listaId) {
        Long usuarioId = buscarUsuario(email).getId();
        return listaCompraRepository.findByIdAndUsuarioId(listaId, usuarioId)
            .orElseThrow(() -> new ListaNaoEncontradaException(listaId));
    }

    private ItemLista buscarItemDaLista(ListaCompra lista, Long itemId) {
        return itemListaRepository.findByIdAndListaCompraId(itemId, lista.getId())
            .orElseThrow(() -> new ItemListaNaoEncontradoException(itemId));
    }
}
