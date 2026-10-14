package com.smartmarket.service;

import com.smartmarket.model.Produto;
import org.springframework.data.jpa.domain.Specification;

public class ProdutoSpecification {

    public static Specification<Produto> withNome(String nome) {
        return (root, query, cb) -> {
            String normalizado = "%" + escapar(normalizar(nome)) + "%";
            return cb.or(
                cb.like(cb.lower(root.get("nome")), normalizado),
                cb.like(cb.lower(root.get("nomeNormalizado")), normalizado)
            );
        };
    }

    public static Specification<Produto> withCategoria(String categoria) {
        return (root, query, cb) ->
            cb.equal(cb.lower(root.get("categoria")), categoria.trim().toLowerCase());
    }

    public static String normalizar(String texto) {
        return texto.toLowerCase()
            .replaceAll("[àáâãäå]", "a")
            .replaceAll("[èéêë]", "e")
            .replaceAll("[ìíîï]", "i")
            .replaceAll("[òóôõö]", "o")
            .replaceAll("[ùúûü]", "u")
            .replaceAll("[ç]", "c")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private static String escapar(String texto) {
        return texto
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_");
    }
}
