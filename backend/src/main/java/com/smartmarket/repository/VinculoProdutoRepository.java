package com.smartmarket.repository;

import com.smartmarket.model.VinculoProduto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VinculoProdutoRepository extends JpaRepository<VinculoProduto, Long> {

    /** Vínculos de um produto com o status informado, trazendo os dois lados (sem lazy fora da transação). */
    @Query("select v from VinculoProduto v join fetch v.produtoA join fetch v.produtoB "
         + "where v.status = :status and (v.produtoA.id = :produtoId or v.produtoB.id = :produtoId)")
    List<VinculoProduto> findDoProdutoComStatus(@Param("produtoId") Long produtoId,
                                                @Param("status") String status);
}
