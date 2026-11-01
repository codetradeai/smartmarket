package com.smartmarket.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class UnidadeConversorAdicionalTest {
    @ParameterizedTest
    @CsvSource({
        "g,500,0.5,kg", "gr,500,0.5,kg", "grama,500,0.5,kg", "gramas,500,0.5,kg",
        "mg,500000,0.5,kg", "miligrama,500000,0.5,kg", "miligramas,500000,0.5,kg",
        "kg,0.5,0.5,kg", "kilo,0.5,0.5,kg", "quilo,0.5,0.5,kg", "quilos,0.5,0.5,kg",
        "ml,500,0.5,L", "mililitro,500,0.5,L", "mililitros,500,0.5,L",
        "l,0.5,0.5,L", "litro,0.5,0.5,L", "litros,0.5,0.5,L",
        "un,5,5,un"
    })
    void normalizar_ConverteFamiliasDeUnidades(String unidade, double valor, double quantidadeEsperada, String unidadeEsperada) {
        var resultado = UnidadeConversor.normalizar(valor, unidade);
        assertThat(resultado.quantidadePadrao()).isEqualTo(quantidadeEsperada);
        assertThat(resultado.unidadePadrao()).isEqualTo(unidadeEsperada);
    }

    @Test void normalizar_ValoresAusentesOuInvalidos() {
        assertThat(UnidadeConversor.normalizar(null, "kg").quantidadePadrao()).isNull();
        assertThat(UnidadeConversor.normalizar(0.0, "kg").quantidadePadrao()).isZero();
        assertThat(UnidadeConversor.normalizar(-2.0, "kg").quantidadePadrao()).isEqualTo(-2.0);
        assertThat(UnidadeConversor.normalizar(1.0, null).unidadePadrao()).isNull();
        assertThat(UnidadeConversor.normalizar(1.0, " ").unidadePadrao()).isEqualTo(" ");
    }

    @Test void precoEquivalente_IgnoraEntradasInvalidas() {
        assertThat(UnidadeConversor.calcularPrecoPorUnidadePadrao(null, 1.0)).isEmpty();
        assertThat(UnidadeConversor.calcularPrecoPorUnidadePadrao(Map.of(1L, BigDecimal.ONE), null)).isEmpty();
        assertThat(UnidadeConversor.calcularPrecoPorUnidadePadrao(Map.of(1L, BigDecimal.ONE), 0.0)).isEmpty();
        Map<Long, BigDecimal> precos = new LinkedHashMap<>();
        precos.put(1L, new BigDecimal("10"));
        precos.put(2L, BigDecimal.ZERO);
        precos.put(3L, new BigDecimal("-2"));
        precos.put(4L, null);
        assertThat(UnidadeConversor.calcularPrecoPorUnidadePadrao(precos, 0.5))
            .containsOnlyKeys(1L).containsEntry(1L, new BigDecimal("20.00"));
    }
}
