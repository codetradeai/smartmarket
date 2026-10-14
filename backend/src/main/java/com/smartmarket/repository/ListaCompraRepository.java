package com.smartmarket.repository;

import com.smartmarket.model.ListaCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ListaCompraRepository extends JpaRepository<ListaCompra, Long> {
    List<ListaCompra> findByUsuarioId(Long usuarioId);
}
