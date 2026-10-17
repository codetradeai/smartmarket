package com.smartmarket.repository;

import com.smartmarket.model.Favorito;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoritoRepository extends JpaRepository<Favorito, Long> {
    List<Favorito> findByUsuarioId(Long usuarioId);
    Optional<Favorito> findByUsuarioIdAndMercadoId(Long usuarioId, Long mercadoId);
    boolean existsByUsuarioIdAndMercadoId(Long usuarioId, Long mercadoId);
}
