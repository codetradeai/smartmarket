package com.smartmarket.repository;

import com.smartmarket.model.Loja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LojaRepository extends JpaRepository<Loja, Long> {

    Optional<Loja> findByMercadoIdAndCodigoExterno(Long mercadoId, String codigoExterno);

    List<Loja> findByMercadoIdOrderByIdAsc(Long mercadoId);

    /** Lojas ativas de mercados ativos, com o mercado carregado (evita N+1 fora de transação). */
    @Query("select l from Loja l join fetch l.mercado m where l.ativa = true and m.ativo = true order by l.id")
    List<Loja> findAtivasComMercado();
}
