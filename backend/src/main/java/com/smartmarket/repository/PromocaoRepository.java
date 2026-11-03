package com.smartmarket.repository;

import com.smartmarket.model.Promocao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * Vigência: dataInicio <= data e (dataFim nula OU dataFim >= data).
 * Promoção sem data de fim (rede não informou validade) continua vigente.
 * Os nomes dos métodos foram mantidos; a regra vem do @Query.
 */
public interface PromocaoRepository extends JpaRepository<Promocao, Long> {
    @Query("select p from Promocao p where p.dataInicio <= :dataAtual1 and (p.dataFim is null or p.dataFim >= :dataAtual2)")
    List<Promocao> findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(
        @Param("dataAtual1") LocalDate dataAtual1, @Param("dataAtual2") LocalDate dataAtual2);

    @Query("select count(p) from Promocao p where p.dataInicio <= :dataAtual1 and (p.dataFim is null or p.dataFim >= :dataAtual2)")
    long countByDataInicioLessThanEqualAndDataFimGreaterThanEqual(
        @Param("dataAtual1") LocalDate dataAtual1, @Param("dataAtual2") LocalDate dataAtual2);

    @Query("select p from Promocao p where p.produto.id in :produtoIds and p.dataInicio <= :dataInicio "
         + "and (p.dataFim is null or p.dataFim >= :dataFim)")
    List<Promocao> findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
        @Param("produtoIds") Collection<Long> produtoIds,
        @Param("dataInicio") LocalDate dataInicio, @Param("dataFim") LocalDate dataFim);
}
