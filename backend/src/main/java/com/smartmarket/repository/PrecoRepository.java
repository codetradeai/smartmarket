package com.smartmarket.repository;

import com.smartmarket.model.Preco;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;

public interface PrecoRepository extends JpaRepository<Preco, Long> {
    List<Preco> findByProdutoId(Long produtoId);
    List<Preco> findByProdutoIdAndMercadoId(Long produtoId, Long mercadoId);
    List<Preco> findByMercadoId(Long mercadoId);
    List<Preco> findByDisponivelTrue();
    List<Preco> findByDisponivelTrueOrderByColetadoEmDescIdDesc();
    List<Preco> findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(Long produtoId);
    List<Preco> findByProdutoIdInAndDisponivelTrueOrderByColetadoEmDesc(Collection<Long> produtoIds);

    // Variantes SEM filtro de disponivel: o servico precisa enxergar a linha mais
    // recente do par produto x mercado mesmo quando ela esta indisponivel, para nao
    // cair numa linha antiga ainda marcada como disponivel (ver PrecosVigentes).
    List<Preco> findByProdutoIdOrderByColetadoEmDescIdDesc(Long produtoId);
    List<Preco> findByProdutoIdInOrderByColetadoEmDescIdDesc(Collection<Long> produtoIds);
    List<Preco> findAllByOrderByColetadoEmDescIdDesc();
}

