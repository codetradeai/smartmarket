package com.smartmarket.repository;

import com.smartmarket.model.ItemLista;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemListaRepository extends JpaRepository<ItemLista, Long> {
    List<ItemLista> findByListaCompraId(Long listaCompraId);
}
