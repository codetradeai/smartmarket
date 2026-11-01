package com.smartmarket.service;

import com.smartmarket.model.Preco;
import com.smartmarket.repository.PrecoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ConsultaMenorPreco {

    private final PrecoRepository precoRepository;

    @Transactional(readOnly = true)
    public Optional<Preco> menorDisponivel(Long produtoId) {
        Map<Long, Preco> ultimoPorMercado = new LinkedHashMap<>();
        for (Preco preco : precoRepository.findByProdutoIdAndDisponivelTrueOrderByColetadoEmDescIdDesc(produtoId)) {
            ultimoPorMercado.putIfAbsent(preco.getMercado().getId(), preco);
        }

        return ultimoPorMercado.values().stream()
            .min(Comparator.comparing(Preco::getValor));
    }
}
