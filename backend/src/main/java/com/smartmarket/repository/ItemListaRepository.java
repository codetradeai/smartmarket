package com.smartmarket.repository;

import com.smartmarket.model.ItemLista;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ItemListaRepository extends JpaRepository<ItemLista, Long> {
    List<ItemLista> findByListaCompraId(Long listaCompraId);
    Optional<ItemLista> findByIdAndListaCompraId(Long id, Long listaCompraId);
    long countByListaCompraId(Long listaCompraId);
}
