package com.smartmarket.repository;

import com.smartmarket.model.Favorito;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FavoritoRepository extends JpaRepository<Favorito, Long> {
    List<Favorito> findByUsuarioId(Long usuarioId);
    boolean existsByUsuarioIdAndMercadoId(Long usuarioId, Long mercadoId);
}
