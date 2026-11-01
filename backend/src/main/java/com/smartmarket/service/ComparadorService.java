package com.smartmarket.service;

import com.smartmarket.dto.lista.ComparacaoResponse;
import com.smartmarket.dto.lista.MercadoComparacaoResponse;
import com.smartmarket.exception.ListaNaoEncontradaException;
import com.smartmarket.model.ItemLista;
import com.smartmarket.model.ListaCompra;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Promocao;
import com.smartmarket.repository.ItemListaRepository;
import com.smartmarket.repository.ListaCompraRepository;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.PromocaoRepository;
import com.smartmarket.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ComparadorService {

    private final ListaCompraRepository listaCompraRepository;
    private final ItemListaRepository itemListaRepository;
    private final UsuarioRepository usuarioRepository;
    private final PrecoRepository precoRepository;
    private final PromocaoRepository promocaoRepository;
    private final MercadoRepository mercadoRepository;

    public ComparacaoResponse comparar(String email, Long listaId) {
        ListaCompra lista = buscarListaPropria(email, listaId);

        List<ItemLista> itens = itemListaRepository.findByListaCompraId(listaId);
        if (itens.isEmpty()) {
            return ComparacaoResponse.builder()
                .listaId(lista.getId())
                .nome(lista.getNome())
                .totalItens(0)
                .comparacoes(List.of())
                .mercadoMaisBarato(null)
                .build();
        }

        List<Long> produtoIds = itens.stream()
            .map(item -> item.getProduto().getId())
            .distinct()
            .toList();

        Map<ChaveProdutoMercado, Preco> precos = precoRepository
            .findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(produtoIds).stream()
            .collect(Collectors.toMap(
                preco -> new ChaveProdutoMercado(preco.getProduto().getId(), preco.getMercado().getId()),
                Function.identity(),
                (atual, nova) -> atual));

        LocalDate hoje = LocalDate.now();
        Map<ChaveProdutoMercado, Promocao> promocoes = promocaoRepository
            .findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(produtoIds, hoje, hoje).stream()
            .collect(Collectors.toMap(
                promocao -> new ChaveProdutoMercado(promocao.getProduto().getId(), promocao.getMercado().getId()),
                Function.identity(),
                (atual, nova) -> atual));

        List<MercadoComparacaoResponse> comparacoes = new ArrayList<>();

        for (Mercado mercado : mercadoRepository.findByAtivoTrue()) {
            comparacoes.add(calcularTotalDoMercado(mercado, itens, precos, promocoes));
        }

        comparacoes.sort(Comparator
            .comparing(MercadoComparacaoResponse::getCompleto, Comparator.reverseOrder())
            .thenComparing(MercadoComparacaoResponse::getValorTotal));

        if (!comparacoes.isEmpty()) {
            comparacoes.getFirst().setMaisBarato(true);
        }

        return ComparacaoResponse.builder()
            .listaId(lista.getId())
            .nome(lista.getNome())
            .totalItens(itens.size())
            .comparacoes(comparacoes)
            .mercadoMaisBarato(comparacoes.isEmpty() ? null : comparacoes.getFirst())
            .build();
    }

    private MercadoComparacaoResponse calcularTotalDoMercado(
            Mercado mercado,
            List<ItemLista> itens,
            Map<ChaveProdutoMercado, Preco> precos,
            Map<ChaveProdutoMercado, Promocao> promocoes) {

        BigDecimal total = BigDecimal.ZERO;
        int encontrados = 0;
        int indisponiveis = 0;

        for (ItemLista item : itens) {
            Long produtoId = item.getProduto().getId();
            ChaveProdutoMercado chave = new ChaveProdutoMercado(produtoId, mercado.getId());

            Preco preco = precos.get(chave);
            if (preco == null) {
                indisponiveis++;
                continue;
            }

            Promocao promocao = promocoes.get(chave);
            BigDecimal valorUnitario = promocao != null
                ? promocao.getValorPromocional()
                : preco.getValor();

            total = total.add(valorUnitario.multiply(BigDecimal.valueOf(item.getQuantidade())));
            encontrados++;
        }

        return MercadoComparacaoResponse.builder()
            .mercadoId(mercado.getId())
            .mercadoNome(mercado.getNome())
            .valorTotal(total)
            .itensEncontrados(encontrados)
            .itensIndisponiveis(indisponiveis)
            .completo(indisponiveis == 0)
            .maisBarato(false)
            .build();
    }

    private ListaCompra buscarListaPropria(String email, Long listaId) {
        Long usuarioId = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario nao encontrado"))
            .getId();

        return listaCompraRepository.findByIdAndUsuarioId(listaId, usuarioId)
            .orElseThrow(() -> new ListaNaoEncontradaException(listaId));
    }

    private record ChaveProdutoMercado(Long produtoId, Long mercadoId) {}
}
