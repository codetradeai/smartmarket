package com.smartmarket.repository;

import com.smartmarket.model.Alerta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AlertaRepository extends JpaRepository<Alerta, Long> {
    List<Alerta> findByUsuarioIdAndAtivoTrue(Long usuarioId);
    List<Alerta> findByProdutoIdAndAtivoTrue(Long produtoId);
    Optional<Alerta> findByUsuarioIdAndProdutoId(Long usuarioId, Long produtoId);
    long countByAtivoTrue();
}
