package com.smartmarket.service;

import com.smartmarket.dto.preco.PrecoRequest;
import com.smartmarket.dto.preco.PrecoResponse;
import com.smartmarket.dto.produto.ProdutoComPrecosResponse;
import com.smartmarket.exception.ResourceNotFoundException;
import com.smartmarket.model.Mercado;
import com.smartmarket.model.Preco;
import com.smartmarket.model.Produto;
import com.smartmarket.repository.MercadoRepository;
import com.smartmarket.repository.PrecoRepository;
import com.smartmarket.repository.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PrecoService {

    private final PrecoRepository precoRepository;
    private final ProdutoRepository produtoRepository;
    private final MercadoRepository mercadoRepository;
    private final com.smartmarket.repository.PromocaoRepository promocaoRepository;

    /**
     * Retorna todos os preços de um produto, agrupados por mercado.
     */
    @Transactional(readOnly = true)
    public ProdutoComPrecosResponse buscarPrecosPorProduto(Long produtoId) {
        Produto produto = produtoRepository.findById(produtoId)
            .orElseThrow(() -> new ResourceNotFoundException("Produto", produtoId));

        List<Preco> precos = precoRepository.findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(produtoId);

        Map<Long, BigDecimal> precosMap = new HashMap<>();
        List<PrecoResponse> detalhados = precos.stream()
            .map(preco -> {
                // Para o mapa, manter apenas o preco mais recente por mercado
                precosMap.putIfAbsent(preco.getMercado().getId(), preco.getValor());
                return PrecoResponse.from(preco);
            })
            .toList();

        java.time.LocalDate hoje = java.time.LocalDate.now();
        List<com.smartmarket.model.Promocao> promocoes = promocaoRepository
            .findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje);
        boolean isPromo = promocoes.stream().anyMatch(p -> p.getProduto().getId().equals(produtoId));
        BigDecimal valorOriginal = promocoes.stream()
            .filter(p -> p.getProduto().getId().equals(produtoId))
            .map(com.smartmarket.model.Promocao::getValorOriginal)
            .findFirst()
            .orElse(null);

        return ProdutoComPrecosResponse.from(produto, precosMap, detalhados, isPromo, valorOriginal);
    }

    /**
     * Retorna preços de um produto em um mercado específico.
     */
    @Transactional(readOnly = true)
    public List<PrecoResponse> buscarPorProdutoEMercado(Long produtoId, Long mercadoId) {
        return precoRepository.findByProdutoIdAndMercadoId(produtoId, mercadoId).stream()
            .map(PrecoResponse::from)
            .toList();
    }

    /**
     * Retorna preços mais recentes de todos os produtos disponíveis.
     * Usado pelo catálogo para montar a visão comparativa.
     */
    @Transactional(readOnly = true)
    public List<ProdutoComPrecosResponse> buscarTodosComPrecos() {
        List<Produto> produtos = produtoRepository.findAll();
        List<Preco> todosPrecos = precoRepository.findByDisponivelTrueOrderByColetadoEmDescIdDesc();

        java.time.LocalDate hoje = java.time.LocalDate.now();
        List<com.smartmarket.model.Promocao> promocoes = promocaoRepository
            .findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(hoje, hoje);
        Map<Long, com.smartmarket.model.Promocao> promocoesPorProduto = new HashMap<>();
        for (com.smartmarket.model.Promocao p : promocoes) {
            promocoesPorProduto.putIfAbsent(p.getProduto().getId(), p);
        }

        // Agrupar preços por produtoId garantindo que o mais recente prevalece
        Map<Long, Map<Long, BigDecimal>> precosAgrupados = new HashMap<>();
        Map<Long, List<Preco>> precosPorProduto = new HashMap<>();

        for (Preco preco : todosPrecos) {
            Long pid = preco.getProduto().getId();
            precosAgrupados
                .computeIfAbsent(pid, k -> new HashMap<>())
                .putIfAbsent(preco.getMercado().getId(), preco.getValor());
            precosPorProduto
                .computeIfAbsent(pid, k -> new java.util.ArrayList<>())
                .add(preco);
        }

        return produtos.stream()
            .map(produto -> {
                Map<Long, BigDecimal> precosMercado = precosAgrupados
                    .getOrDefault(produto.getId(), Map.of());
                List<PrecoResponse> detalhados = precosPorProduto
                    .getOrDefault(produto.getId(), List.of()).stream()
                    .map(PrecoResponse::from)
                    .toList();
                com.smartmarket.model.Promocao promo = promocoesPorProduto.get(produto.getId());
                boolean isPromo = promo != null;
                BigDecimal valorOriginal = isPromo ? promo.getValorOriginal() : null;
                return ProdutoComPrecosResponse.from(produto, precosMercado, detalhados, isPromo, valorOriginal);
            })
            .toList();
    }

    /**
     * Registra um novo preço para um produto em um mercado.
     */
    @Transactional
    public PrecoResponse criar(PrecoRequest request) {
        Produto produto = produtoRepository.findById(request.getProdutoId())
            .orElseThrow(() -> new ResourceNotFoundException("Produto", request.getProdutoId()));
        Mercado mercado = mercadoRepository.findById(request.getMercadoId())
            .orElseThrow(() -> new ResourceNotFoundException("Mercado", request.getMercadoId()));

        Preco preco = Preco.builder()
            .produto(produto)
            .mercado(mercado)
            .valor(request.getValor())
            .disponivel(request.getDisponivel() != null ? request.getDisponivel() : true)
            .build();

        return PrecoResponse.from(precoRepository.save(preco));
    }

    /**
     * Remove um registro de preço.
     */
    @Transactional
    public void remover(Long id) {
        Preco preco = precoRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Preco", id));
        precoRepository.delete(preco);
    }
}
