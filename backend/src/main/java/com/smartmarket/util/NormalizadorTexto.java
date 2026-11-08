package com.smartmarket.util;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Normalização única do texto de busca: minúsculas, sem marcas de acento (NFD) e com
 * espaços colapsados. É a mesma regra aplicada a {@code produto.nome_normalizado} (ao gravar)
 * e ao termo digitado (ao buscar); o script {@code backend/deploy/05_corrige_nome_normalizado.sql}
 * e o gerador de carga do scraper reproduzem a mesma regra.
 */
public final class NormalizadorTexto {

    private NormalizadorTexto() {}

    public static String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        return Normalizer.normalize(texto.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .replaceAll("\\s+", " ")
            .trim();
    }
}
