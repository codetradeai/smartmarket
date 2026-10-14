package com.smartmarket.repository;

import com.smartmarket.model.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;

public interface ProdutoRepository extends JpaRepository<Produto, Long>,
    JpaSpecificationExecutor<Produto> {
    List<Produto> findByCategoria(String categoria);
    List<Produto> findByNomeNormalizadoContaining(String texto);
}
