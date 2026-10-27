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
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ListaCompraService {

    private final ListaCompraRepository listaCompraRepository;
    private final ItemListaRepository itemListaRepository;
    private final ProdutoRepository produtoRepository;
    private final MercadoRepository mercadoRepository;
    private final PrecoRepository precoRepository;
    private final PromocaoRepository promocaoRepository;
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
    public ListaCompraResponse renomear(Long listaId, ListaCompraRequest request) {
        ListaCompra lista = buscarEValidarProprietario(listaId);
        lista.setNome(request.getNome().trim());
        return montarResponse(listaCompraRepository.save(lista));
    }

    @Transactional
    public ListaCompraResponse atualizarItem(Long listaId, Long itemId, ItemListaRequest request) {
        ListaCompra lista = buscarEValidarProprietario(listaId);
        ItemLista item = itemListaRepository.findByIdAndListaCompraId(itemId, listaId)
            .orElseThrow(() -> new ResourceNotFoundException("Item da lista", itemId));
        if (!item.getProduto().getId().equals(request.getProdutoId())) {
            throw new IllegalArgumentException("O produto de um item existente nao pode ser alterado");
        }
        item.setQuantidade(request.getQuantidade());
        itemListaRepository.save(item);
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
        if (lista.getItens().isEmpty()) {
            return ComparacaoCestaResponse.builder()
                .listaId(lista.getId())
                .nomeLista(lista.getNome())
                .totalItensDistintos(0)
                .mercados(List.of())
                .mercadoMaisBarato(null)
                .economiaMaxima(BigDecimal.ZERO)
                .build();
        }
        List<Mercado> mercados = mercadoRepository.findByAtivoTrue();

        Map<Long, Map<Long, BigDecimal>> ultimosPrecos = buscarUltimosPrecosPorProduto();
        List<Long> produtoIds = lista.getItens().stream()
            .map(item -> item.getProduto().getId()).distinct().toList();
        LocalDate hoje = LocalDate.now();
        Map<Long, Map<Long, BigDecimal>> promocoesAtivas = new HashMap<>();
        for (Promocao promocao : promocaoRepository
            .findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(produtoIds, hoje, hoje)) {
            promocoesAtivas
                .computeIfAbsent(promocao.getProduto().getId(), id -> new HashMap<>())
                .merge(promocao.getMercado().getId(), promocao.getValorPromocional(), BigDecimal::min);
        }

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
                    BigDecimal promocional = promocoesAtivas
                        .getOrDefault(pid, Map.of()).get(mercado.getId());
                    if (promocional != null && promocional.compareTo(BigDecimal.ZERO) >= 0
                        && promocional.compareTo(preco) <= 0) {
                        preco = promocional;
                    }
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

        // Mercados completos primeiro; um total parcial nao representa o preco da cesta inteira.
        cestasMercado.sort(Comparator
            .comparing((CestaMercadoResponse cesta) ->
                cesta.getItensDisponiveis() == cesta.getTotalItensSolicitados()).reversed()
            .thenComparing(CestaMercadoResponse::getTotal)
            .thenComparing(CestaMercadoResponse::getMercadoId));

        List<CestaMercadoResponse> completos = cestasMercado.stream()
            .filter(cesta -> cesta.getItensDisponiveis() == cesta.getTotalItensSolicitados())
            .toList();
        CestaMercadoResponse maisBarato = completos.isEmpty() ? null : completos.get(0);
        BigDecimal economia = BigDecimal.ZERO;

        if (completos.size() >= 2) {
            CestaMercadoResponse maisCaro = completos.get(completos.size() - 1);
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
