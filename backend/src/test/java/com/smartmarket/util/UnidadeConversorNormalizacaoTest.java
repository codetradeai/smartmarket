package com.smartmarket.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UnidadeConversorNormalizacaoTest {
    @Test void normalizar_IgnoraMaiusculasEEspacosDaUnidade() {
        var resultado = UnidadeConversor.normalizar(500.0, " G ");
        assertThat(resultado.quantidadePadrao()).isEqualTo(0.5);
        assertThat(resultado.unidadePadrao()).isEqualTo("kg");
    }

    @Test void normalizar_UnidadeDesconhecidaMantemQuantidadeEPassaParaMinusculas() {
        var resultado = UnidadeConversor.normalizar(3.0, "PCT");
        assertThat(resultado.quantidadePadrao()).isEqualTo(3.0);
        assertThat(resultado.unidadePadrao()).isEqualTo("pct");
    }
}
