package com.smartmarket.dto.produto;

import com.smartmarket.dto.preco.PrecoResponse;
import com.smartmarket.model.Produto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * DTO enriquecido que retorna o produto junto com seus preços por mercado.
 * Este é o contrato principal consumido pelo frontend no catálogo e na comparação.
 *
 * Formato dos preços: mapa mercadoId -> valor (BigDecimal), compatível com
 * o formato flat que o frontend espera para o cálculo de cesta.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProdutoComPrecosResponse {

    private Long id;
    private String nome;
    private String marca;
    private Double quantidade;
    private String unidade;
    private String codigoBarras;
    private String categoria;
    private String imagemUrl;

    // Indicador se o produto possui promocao vigente
    private Boolean promo;

    // Valor original do produto antes da promocao (se aplicavel)
    private BigDecimal valorOriginal;

    // Grandezas normalizadas em base SI (kg, L, un)
    private Double quantidadePadrao;
    private String unidadePadrao;

    // Preço relativo por unidade de medida padrão (ex: R$ por kg ou R$ por Litro)
    private Map<Long, BigDecimal> precosPorUnidadePadrao;

    // Preços por mercado no formato { mercadoId: valor }
    private Map<Long, BigDecimal> precos;

    // Lista detalhada de preços com metadados (opcional, para views detalhadas)
    private List<PrecoResponse> precosDetalhados;

    // Menor preço disponível entre todos os mercados
    private BigDecimal menorPreco;

    // ID do mercado com o menor preço
    private Long mercadoMenorPreco;

    public static ProdutoComPrecosResponse from(Produto produto,
                                                 Map<Long, BigDecimal> precos,
                                                 List<PrecoResponse> precosDetalhados) {
        return from(produto, precos, precosDetalhados, false, null);
    }

    public static ProdutoComPrecosResponse from(Produto produto,
                                                 Map<Long, BigDecimal> precos,
                                                 List<PrecoResponse> precosDetalhados,
                                                 boolean promo,
                                                 BigDecimal valorOriginal) {
        BigDecimal menor = null;
        Long mercadoMenor = null;

        for (Map.Entry<Long, BigDecimal> entry : precos.entrySet()) {
            if (menor == null || entry.getValue().compareTo(menor) < 0) {
                menor = entry.getValue();
                mercadoMenor = entry.getKey();
            }
        }

        var grandeza = com.smartmarket.util.UnidadeConversor.normalizar(
            produto.getQuantidade(), produto.getUnidade());
        var precosPorUnidade = com.smartmarket.util.UnidadeConversor.calcularPrecoPorUnidadePadrao(
            precos, grandeza.quantidadePadrao());

        return ProdutoComPrecosResponse.builder()
            .id(produto.getId())
            .nome(produto.getNome())
            .marca(produto.getMarca())
            .quantidade(produto.getQuantidade())
            .unidade(produto.getUnidade())
            .quantidadePadrao(grandeza.quantidadePadrao())
            .unidadePadrao(grandeza.unidadePadrao())
            .precosPorUnidadePadrao(precosPorUnidade)
            .codigoBarras(produto.getCodigoBarras())
            .categoria(produto.getCategoria())
            .imagemUrl(produto.getImagemUrl())
            .promo(promo)
            .valorOriginal(valorOriginal)
            .precos(precos)
            .precosDetalhados(precosDetalhados)
            .menorPreco(menor)
            .mercadoMenorPreco(mercadoMenor)
            .build();
    }
}
