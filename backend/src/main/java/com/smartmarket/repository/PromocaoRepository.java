package com.smartmarket.repository;

import com.smartmarket.model.Promocao;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface PromocaoRepository extends JpaRepository<Promocao, Long> {
    List<Promocao> findByDataInicioLessThanEqualAndDataFimGreaterThanEqual(
        LocalDate dataAtual1, LocalDate dataAtual2);
}
