package com.smartmarket.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Testes de Unidade - Normalização de Grandezas e Preço Equivalente")
class UnidadeConversorTest {

    @Test
    @DisplayName("Deve converter gramas para quilogramas com precisao")
    void deveConverterGramasParaQuilos() {
        var res = UnidadeConversor.normalizar(500.0, "g");
        assertEquals(0.5, res.quantidadePadrao());
        assertEquals("kg", res.unidadePadrao());
    }

    @Test
    @DisplayName("Deve converter mililitros para litros com precisao")
    void deveConverterMililitrosParaLitros() {
        var res = UnidadeConversor.normalizar(900.0, "ml");
        assertEquals(0.9, res.quantidadePadrao());
        assertEquals("L", res.unidadePadrao());
    }

    @Test
    @DisplayName("Deve manter quilogramas e litros inalterados na base SI")
    void deveManterGrandezasSi() {
        var resKg = UnidadeConversor.normalizar(5.0, "kg");
        assertEquals(5.0, resKg.quantidadePadrao());
        assertEquals("kg", resKg.unidadePadrao());

        var resL = UnidadeConversor.normalizar(1.0, "L");
        assertEquals(1.0, resL.quantidadePadrao());
        assertEquals("L", resL.unidadePadrao());
    }

    @Test
    @DisplayName("Deve calcular preco relativo por kg corretamente")
    void deveCalcularPrecoPorUnidadePadrao() {
        // Ex: R$ 4.50 por 500g -> R$ 9.00/kg
        Map<Long, BigDecimal> precos = Map.of(1L, new BigDecimal("4.50"));
        Map<Long, BigDecimal> precosPorKg = UnidadeConversor.calcularPrecoPorUnidadePadrao(precos, 0.5);

        assertNotNull(precosPorKg);
        assertEquals(new BigDecimal("9.00"), precosPorKg.get(1L));
    }
}
