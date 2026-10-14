package com.smartmarket.repository;

import com.smartmarket.model.Alerta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlertaRepository extends JpaRepository<Alerta, Long> {
    List<Alerta> findByUsuarioIdAndAtivoTrue(Long usuarioId);
    List<Alerta> findByProdutoIdAndAtivoTrue(Long produtoId);
}
