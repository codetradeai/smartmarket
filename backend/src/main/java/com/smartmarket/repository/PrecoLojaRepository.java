package com.smartmarket.repository;

import com.smartmarket.model.PrecoLoja;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrecoLojaRepository extends JpaRepository<PrecoLoja, Long> {

    /** Vínculos correntes (vigente_ate nulo) da loja. */
    List<PrecoLoja> findByLojaIdAndVigenteAteIsNull(Long lojaId);

    /** Histórico de vínculos de um preço, do mais antigo ao mais novo. */
    List<PrecoLoja> findByPrecoIdOrderByVigenteDesdeAscIdAsc(Long precoId);
}
