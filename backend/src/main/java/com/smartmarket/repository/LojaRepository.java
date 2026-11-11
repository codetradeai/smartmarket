package com.smartmarket.repository;

import com.smartmarket.model.Loja;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LojaRepository extends JpaRepository<Loja, Long> {

    Optional<Loja> findByMercadoIdAndCodigoExterno(Long mercadoId, String codigoExterno);

    List<Loja> findByMercadoIdOrderByIdAsc(Long mercadoId);
}
