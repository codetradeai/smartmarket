package com.smartmarket.service;

import com.smartmarket.dto.lista.*;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.*;
import com.smartmarket.repository.*;
import com.smartmarket.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ListaCompraService {

    private final ListaCompraRepository listaCompraRepository;
    private final ItemListaRepository itemListaRepository;
    private final ProdutoRepository produtoRepository;
    private final MercadoRepository mercadoRepository;
    private final PrecoRepository precoRepository;
    private final UsuarioAutenticado usuarioAutenticado;

    @Transactional(readOnly = true)
    public List<ListaCompraResponse> listarMinhas() {
        Usuario usuario = usuarioAutenticado.atual();
        List<ListaCompra> listas = listaCompraRepository.findByUsuarioId(usuario.getId());

        return listas.stream()
            .map(this::montarResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public ListaCompraResponse buscarPorId(Long id) {
        ListaCompra lista = buscarEValidarProprietario(id);
        return montarResponse(lista);
    }

    @Transactional
    public ListaCompraResponse criar(ListaCompraRequest request) {
        Usuario usuario = usuarioAutenticado.atual();

        ListaCompra lista = ListaCompra.builder()
            .nome(request.getNome().trim())
            .usuario(usuario)
            .build();

        lista = listaCompraRepository.save(lista);

        if (request.getItens() != null && !request.getItens().isEmpty()) {
            for (ItemListaRequest itemReq : request.getItens()) {
                Produto produto = produtoRepository.findById(itemReq.getProdutoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", itemReq.getProdutoId()));

                ItemLista item = ItemLista.builder()
                    .listaCompra(lista)
                    .produto(produto)
                    .quantidade(Math.max(itemReq.getQuantidade(), 1))
                    .build();

                lista.getItens().add(item);
            }
            lista = listaCompraRepository.save(lista);
        }

        return montarResponse(lista);
    }

    @Transactional
    public ListaCompraResponse adicionarItem(Long listaId, ItemListaRequest request) {
        ListaCompra lista = buscarEValidarProprietario(listaId);

        Produto produto = produtoRepository.findById(request.getProdutoId())
            .orElseThrow(() -> new ResourceNotFoundException("Produto", request.getProdutoId()));

        Optional<ItemLista> existente = lista.getItens().stream()
            .filter(item -> item.getProduto().getId().equals(request.getProdutoId()))
            .findFirst();

        if (existente.isPresent()) {
            existente.get().setQuantidade(request.getQuantidade());
        } else {
            ItemLista item = ItemLista.builder()
                .listaCompra(lista)
                .produto(produto)
                .quantidade(Math.max(request.getQuantidade(), 1))
                .build();
            lista.getItens().add(item);
        }

        lista = listaCompraRepository.save(lista);
        return montarResponse(lista);
    }

    @Transactional
    public ListaCompraResponse removerItem(Long listaId, Long produtoId) {
        ListaCompra lista = buscarEValidarProprietario(listaId);

        lista.getItens().removeIf(item -> item.getProduto().getId().equals(produtoId));
        lista = listaCompraRepository.save(lista);

        return montarResponse(lista);
    }

    @Transactional
    public void removerLista(Long listaId) {
        ListaCompra lista = buscarEValidarProprietario(listaId);
        listaCompraRepository.delete(lista);
    }

    @Transactional(readOnly = true)
    public ComparacaoCestaResponse compararCesta(Long listaId) {
        ListaCompra lista = buscarEValidarProprietario(listaId);
        List<Mercado> mercados = mercadoRepository.findByAtivoTrue();

        Map<Long, Map<Long, BigDecimal>> ultimosPrecos = buscarUltimosPrecosPorProduto();

        List<CestaMercadoResponse> cestasMercado = new ArrayList<>();

        for (Mercado mercado : mercados) {
            BigDecimal totalCesta = BigDecimal.ZERO;
            int disponiveis = 0;
            List<String> faltantes = new ArrayList<>();

            for (ItemLista item : lista.getItens()) {
                Long pid = item.getProduto().getId();
                Map<Long, BigDecimal> precosPorMercado = ultimosPrecos.getOrDefault(pid, Map.of());
                BigDecimal preco = precosPorMercado.get(mercado.getId());

                if (preco != null) {
                    BigDecimal subtotal = preco.multiply(BigDecimal.valueOf(item.getQuantidade()));
                    totalCesta = totalCesta.add(subtotal);
                    disponiveis++;
                } else {
                    faltantes.add(item.getProduto().getNome());
                }
            }

            cestasMercado.add(CestaMercadoResponse.builder()
                .mercadoId(mercado.getId())
                .nomeMercado(mercado.getNome())
                .logoUrl(mercado.getLogoUrl())
                .total(totalCesta)
                .itensDisponiveis(disponiveis)
                .totalItensSolicitados(lista.getItens().size())
                .itensIndisponiveis(faltantes)
                .build());
        }

        // Ordenar mercados do menor para o maior preco total
        cestasMercado.sort(Comparator.comparing(CestaMercadoResponse::getTotal));

        CestaMercadoResponse maisBarato = cestasMercado.isEmpty() ? null : cestasMercado.get(0);
        BigDecimal economia = BigDecimal.ZERO;

        if (cestasMercado.size() >= 2 && maisBarato != null) {
            CestaMercadoResponse maisCaro = cestasMercado.get(cestasMercado.size() - 1);
            if (maisCaro.getTotal().compareTo(maisBarato.getTotal()) > 0) {
                economia = maisCaro.getTotal().subtract(maisBarato.getTotal());
            }
        }

        return ComparacaoCestaResponse.builder()
            .listaId(lista.getId())
            .nomeLista(lista.getNome())
            .totalItensDistintos(lista.getItens().size())
            .mercados(cestasMercado)
            .mercadoMaisBarato(maisBarato)
            .economiaMaxima(economia)
            .build();
    }

    private ListaCompra buscarEValidarProprietario(Long listaId) {
        ListaCompra lista = listaCompraRepository.findById(listaId)
            .orElseThrow(() -> new ResourceNotFoundException("Lista de compras", listaId));

        Usuario usuario = usuarioAutenticado.atual();
        if (!lista.getUsuario().getId().equals(usuario.getId())) {
            throw new AccessDeniedException("Voce nao tem permissao para acessar esta lista de compras.");
        }

        return lista;
    }

    private ListaCompraResponse montarResponse(ListaCompra lista) {
        Map<Long, Map<Long, BigDecimal>> ultimosPrecos = buscarUltimosPrecosPorProduto();

        List<ItemListaResponse> itensResp = lista.getItens().stream()
            .map(item -> {
                Map<Long, BigDecimal> precos = ultimosPrecos.getOrDefault(item.getProduto().getId(), Map.of());
                return ItemListaResponse.from(item, precos);
            })
            .toList();

        return ListaCompraResponse.from(lista, itensResp);
    }

    private Map<Long, Map<Long, BigDecimal>> buscarUltimosPrecosPorProduto() {
        List<Preco> precos = precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc();
        Map<Long, Map<Long, BigDecimal>> resultado = new HashMap<>();

        for (Preco preco : precos) {
            resultado
                .computeIfAbsent(preco.getProduto().getId(), k -> new HashMap<>())
                .putIfAbsent(preco.getMercado().getId(), preco.getValor());
        }

        return resultado;
    }
}
