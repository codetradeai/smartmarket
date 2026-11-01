package com.smartmarket.service;

import com.smartmarket.model.Produto;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProdutoSpecificationTest {

    @Test void normalizar_RemoveAcentosEspacosEConverteCaixa() {
        assertThat(ProdutoSpecification.normalizar("  CAFÉ   com  AÇÚCAR  "))
            .isEqualTo("cafe com acucar");
        assertThat(ProdutoSpecification.normalizar("ÀÈÌÒÙ Çãõ"))
            .isEqualTo("aeiou cao");
    }

    @Test void nome_EscapaCaracteresEspeciaisDeLike() {
        @SuppressWarnings("unchecked") Root<Produto> root = mock(Root.class);
        @SuppressWarnings("unchecked") CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        @SuppressWarnings("unchecked") Path<String> path = mock(Path.class);
        @SuppressWarnings("unchecked") Expression<String> lower = mock(Expression.class);
        Predicate predicate = mock(Predicate.class);
        when(root.<String>get("nome")).thenReturn(path);
        when(root.<String>get("nomeNormalizado")).thenReturn(path);
        when(cb.lower(path)).thenReturn(lower);
        when(cb.like(eq(lower), anyString())).thenReturn(predicate);
        when(cb.or(any(Predicate.class), any(Predicate.class))).thenReturn(predicate);
        assertThat(ProdutoSpecification.withNome("  CAFÉ%_\\  ").toPredicate(root, query, cb))
            .isSameAs(predicate);
        verify(cb, times(2)).like(lower, "%cafe\\%\\_\\\\%");
    }

    @ParameterizedTest
    @CsvSource({
        "graos,grão", "grao,grão", "leites,leite", "leite,leite",
        "oleos,óleo", "oleo,óleo", "cafe,café", "higiene,higiene", "outros,outros"
    })
    void categoria_ExpandeSinonimos(String entrada, String esperado) {
        @SuppressWarnings("unchecked") Root<Produto> root = mock(Root.class);
        @SuppressWarnings("unchecked") CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        @SuppressWarnings("unchecked") Path<String> path = mock(Path.class);
        @SuppressWarnings("unchecked") Expression<String> lower = mock(Expression.class);
        Predicate predicate = mock(Predicate.class);
        when(root.<String>get("categoria")).thenReturn(path);
        when(cb.lower(path)).thenReturn(lower);
        when(cb.equal(lower, entrada)).thenReturn(predicate);
        when(cb.like(lower, "%" + esperado + "%")).thenReturn(predicate);
        when(cb.or(any(Predicate.class), any(Predicate.class))).thenReturn(predicate);
        assertThat(ProdutoSpecification.withCategoria(" " + entrada.toUpperCase() + " ")
            .toPredicate(root, query, cb)).isSameAs(predicate);
        verify(cb).like(lower, "%" + esperado + "%");
    }
}
