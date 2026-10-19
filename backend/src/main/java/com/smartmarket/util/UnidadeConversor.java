package com.smartmarket.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

/**
 * Utilitário para normalização de grandezas em unidades base do Sistema Internacional (SI)
 * e cálculo do preço equivalente por unidade de medida padrão (R$/kg, R$/L).
 */
public final class UnidadeConversor {

    private UnidadeConversor() {}

    public record GrandezaNormalizada(
        Double quantidadePadrao,
        String unidadePadrao
    ) {}

    /**
     * Normaliza a quantidade e unidade para a grandeza canônica (kg, L, un).
     */
    public static GrandezaNormalizada normalizar(Double quantidade, String unidade) {
        if (quantidade == null || quantidade <= 0 || unidade == null || unidade.isBlank()) {
            return new GrandezaNormalizada(quantidade, unidade);
        }

        String u = unidade.trim().toLowerCase();

        switch (u) {
            case "g":
            case "gr":
            case "grama":
            case "gramas":
                return new GrandezaNormalizada(quantidade / 1000.0, "kg");
            case "mg":
            case "miligrama":
            case "miligramas":
                return new GrandezaNormalizada(quantidade / 1_000_000.0, "kg");
            case "kg":
            case "kilo":
            case "quilo":
            case "quilos":
                return new GrandezaNormalizada(quantidade, "kg");
            case "ml":
            case "mililitro":
            case "mililitros":
                return new GrandezaNormalizada(quantidade / 1000.0, "L");
            case "l":
            case "litro":
            case "litros":
                return new GrandezaNormalizada(quantidade, "L");
            default:
                return new GrandezaNormalizada(quantidade, u);
        }
    }

    /**
     * Calcula o preço relativo por unidade de medida padrão (ex: R$ por kg ou R$ por Litro)
     * para cada mercado parceiro.
     */
    public static Map<Long, BigDecimal> calcularPrecoPorUnidadePadrao(
            Map<Long, BigDecimal> precosPorMercado,
            Double quantidadePadrao) {

        if (precosPorMercado == null || quantidadePadrao == null || quantidadePadrao <= 0) {
            return Map.of();
        }

        Map<Long, BigDecimal> resultado = new HashMap<>();
        BigDecimal qtdBd = BigDecimal.valueOf(quantidadePadrao);

        for (Map.Entry<Long, BigDecimal> entry : precosPorMercado.entrySet()) {
            if (entry.getValue() != null && entry.getValue().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal precoRelativo = entry.getValue().divide(qtdBd, 2, RoundingMode.HALF_UP);
                resultado.put(entry.getKey(), precoRelativo);
            }
        }

        return resultado;
    }
}
