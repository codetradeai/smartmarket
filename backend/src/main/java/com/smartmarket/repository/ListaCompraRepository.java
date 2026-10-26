package com.smartmarket.repository;

import com.smartmarket.model.ListaCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ListaCompraRepository extends JpaRepository<ListaCompra, Long> {
    List<ListaCompra> findByUsuarioId(Long usuarioId);
    Optional<ListaCompra> findByIdAndUsuarioId(Long id, Long usuarioId);
}
