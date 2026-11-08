package com.smartmarket.repository;

import com.smartmarket.model.Promocao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Vigência: ativa e dataInicio <= data e (dataFim nula OU dataFim >= data).
 * Promoção sem data de fim (rede não informou validade) continua vigente enquanto ativa;
 * a flag ativa é o que tira do ar a que a coleta deixou de encontrar (inativarNaoRecoletadas).
 * Os nomes dos métodos foram mantidos; a regra vem do @Query.
 */
public interface PromocaoRepository extends JpaRepository<Promocao, Long> {
    @Query("select p from Promocao p where p.ativa = true and p.dataInicio <= :dataAtual1 and (p.dataFim is null or p.dataFim >= :dataAtual2)")
    List<Promocao> findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(
        @Param("dataAtual1") LocalDate dataAtual1, @Param("dataAtual2") LocalDate dataAtual2);

    @Query("select count(p) from Promocao p where p.ativa = true and p.dataInicio <= :dataAtual1 and (p.dataFim is null or p.dataFim >= :dataAtual2)")
    long countByDataInicioLessThanEqualAndDataFimGreaterThanEqual(
        @Param("dataAtual1") LocalDate dataAtual1, @Param("dataAtual2") LocalDate dataAtual2);

    @Query("select p from Promocao p where p.produto.id in :produtoIds and p.ativa = true and p.dataInicio <= :dataInicio "
         + "and (p.dataFim is null or p.dataFim >= :dataFim)")
    List<Promocao> findByProdutoIdInAndDataInicioLessThanEqualAndDataFimGreaterThanEqual(
        @Param("produtoIds") Collection<Long> produtoIds,
        @Param("dataInicio") LocalDate dataInicio, @Param("dataFim") LocalDate dataFim);

    /**
     * Marca como inativas as promoções sem data_fim do mercado informado
     * que não foram encontradas na coleta iniciada em {@code inicioColeta}.
     * Chamado após cada coleta bem-sucedida de uma rede.
     */
    @Modifying
    @Query("update Promocao p set p.ativa = false "
         + "where p.mercado.id = :mercadoId "
         + "and p.dataFim is null "
         + "and p.coletadoEm < :inicioColeta")
    int inativarNaoRecoletadas(
        @Param("mercadoId") Long mercadoId,
        @Param("inicioColeta") LocalDateTime inicioColeta);
}
