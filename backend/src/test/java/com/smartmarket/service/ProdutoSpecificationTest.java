package com.smartmarket.service;

import com.smartmarket.model.Produto;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class ProdutoSpecificationTest {

    @Mock
    private Root<Produto> root;

    @Mock
    private CriteriaQuery<?> query;

    @Mock
    private CriteriaBuilder cb;

    @Mock
    private Path<String> caminho;

    @Mock
    private Expression<String> minusculo;

    @Mock
    private Predicate igual;

    @Mock
    private Predicate parecido;

    @Mock
    private Predicate resultado;

    private void stubMinusculo() {
        when(cb.lower(caminho)).thenReturn(minusculo);
    }

    @ParameterizedTest
    @CsvSource({
        "graos,grão",
        "grao,grão",
        "Leites,leite",
        "leite,leite",
        "oleos,óleo",
        "oleo,óleo",
        "cafe,café",
        "higiene,higiene",
        "bebidas,bebidas"
    })
    void withCategoria_DeveTraduzirApelidosParaOTermoDeBusca(String categoria, String termoEsperado) {
        stubMinusculo();
        when(root.<String>get("categoria")).thenReturn(caminho);
        when(cb.equal(minusculo, categoria.toLowerCase())).thenReturn(igual);
        when(cb.like(minusculo, "%" + termoEsperado + "%")).thenReturn(parecido);
        when(cb.or(igual, parecido)).thenReturn(resultado);

        Predicate predicado = ProdutoSpecification.withCategoria(categoria).toPredicate(root, query, cb);

        assertThat(predicado).isSameAs(resultado);
    }

    @Test
    void withCategoria_DeveIgnorarEspacosNasExtremidades() {
        stubMinusculo();
        when(root.<String>get("categoria")).thenReturn(caminho);
        when(cb.equal(minusculo, "cafe")).thenReturn(igual);
        when(cb.like(minusculo, "%café%")).thenReturn(parecido);
        when(cb.or(igual, parecido)).thenReturn(resultado);

        Predicate predicado = ProdutoSpecification.withCategoria("  CAFE ").toPredicate(root, query, cb);

        assertThat(predicado).isSameAs(resultado);
    }

    @Test
    void withNome_DeveBuscarNoNomeENoNomeNormalizadoSemAcentos() {
        stubMinusculo();
        Path<String> caminhoNormalizado = org.mockito.Mockito.mock(Path.class);
        Expression<String> minusculoNormalizado = org.mockito.Mockito.mock(Expression.class);
        when(root.<String>get("nome")).thenReturn(caminho);
        when(root.<String>get("nomeNormalizado")).thenReturn(caminhoNormalizado);
        when(cb.lower(caminhoNormalizado)).thenReturn(minusculoNormalizado);
        when(cb.like(minusculo, "%acucar cristal%")).thenReturn(igual);
        when(cb.like(minusculoNormalizado, "%acucar cristal%")).thenReturn(parecido);
        when(cb.or(igual, parecido)).thenReturn(resultado);

        Predicate predicado = ProdutoSpecification.withNome("  Açúcar   Cristal ").toPredicate(root, query, cb);

        assertThat(predicado).isSameAs(resultado);
    }

    @Test
    void withNome_DeveEscaparCaracteresCuringaDoLike() {
        stubMinusculo();
        Path<String> caminhoNormalizado = org.mockito.Mockito.mock(Path.class);
        Expression<String> minusculoNormalizado = org.mockito.Mockito.mock(Expression.class);
        when(root.<String>get("nome")).thenReturn(caminho);
        when(root.<String>get("nomeNormalizado")).thenReturn(caminhoNormalizado);
        when(cb.lower(caminhoNormalizado)).thenReturn(minusculoNormalizado);

        ProdutoSpecification.withNome("100%_a\\b").toPredicate(root, query, cb);

        verify(cb).like(minusculo, "%100\\%\\_a\\\\b%");
        verify(cb).like(minusculoNormalizado, "%100\\%\\_a\\\\b%");
    }

    @ParameterizedTest
    @CsvSource({
        "'ÀÁÂÃÄÅ èéêë ÌÍÎÏ','aaaaaa eeee iiii'",
        "'ÒÓÔÕÖ ÙÚÛÜ Ç','ooooo uuuu c'",
        "'  Arroz    Tipo   1  ','arroz tipo 1'"
    })
    void normalizar_DeveRemoverAcentosColapsarEspacosEUsarMinusculas(String entrada, String esperado) {
        assertThat(ProdutoSpecification.normalizar(entrada)).isEqualTo(esperado);
    }
}
