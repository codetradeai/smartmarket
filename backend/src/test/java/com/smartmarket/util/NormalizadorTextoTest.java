package com.smartmarket.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class NormalizadorTextoTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "Pão Cacetinho Integral Pão Francês Zaffari|pao cacetinho integral pao frances zaffari",
        "  CAFÉ   com  AÇÚCAR  |cafe com acucar",
        "ÀÈÌÒÙ Çãõ|aeiou cao",
        "Ñandú Güaraná|nandu guarana",
        "Feijão Preto 1kg|feijao preto 1kg"
    })
    void removeMarcasDeAcentoMinusculaEColapsaEspacos(String entrada, String esperado) {
        assertThat(NormalizadorTexto.normalizar(entrada)).isEqualTo(esperado);
    }

    @Test
    void textoJaNormalizadoNaoMuda() {
        assertThat(NormalizadorTexto.normalizar("arroz tio joao 5kg")).isEqualTo("arroz tio joao 5kg");
    }

    @Test
    void textoDecompostoEComposto_DaoOMesmoResultado() {
        assertThat(NormalizadorTexto.normalizar("Pão")).isEqualTo(NormalizadorTexto.normalizar("Pão"))
            .isEqualTo("pao");
    }

    @Test
    void nuloContinuaNulo() {
        assertThat(NormalizadorTexto.normalizar(null)).isNull();
    }
}
