package com.smartmarket.repository;

import com.smartmarket.model.Preco;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrecoRepository extends JpaRepository<Preco, Long> {
    List<Preco> findByProdutoIdAndMercadoId(Long produtoId, Long mercadoId);
    List<Preco> findByMercadoId(Long mercadoId);
    List<Preco> findByDisponivelTrue();
}
