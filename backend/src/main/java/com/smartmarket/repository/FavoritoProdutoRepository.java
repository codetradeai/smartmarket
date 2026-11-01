package com.smartmarket.repository;

import com.smartmarket.model.FavoritoProduto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FavoritoProdutoRepository extends JpaRepository<FavoritoProduto, Long> {
    List<FavoritoProduto> findByUsuarioId(Long usuarioId);
    Optional<FavoritoProduto> findByUsuarioIdAndProdutoId(Long usuarioId, Long produtoId);
    boolean existsByUsuarioIdAndProdutoId(Long usuarioId, Long produtoId);
}
