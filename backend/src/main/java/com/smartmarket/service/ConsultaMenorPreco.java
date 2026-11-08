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
        // Historico completo: so vale o par produto x mercado cuja linha mais recente esta
        // disponivel. Filtrar disponivel = true na consulta traria de volta um preco antigo de
        // um produto que a rede deixou de vender (ver PrecosVigentes).
        for (Preco preco : PrecosVigentes.descartandoParesIndisponiveis(
                precoRepository.findByProdutoIdOrderByColetadoEmDescIdDesc(produtoId))) {
            ultimoPorMercado.putIfAbsent(preco.getMercado().getId(), preco);
        }

        return ultimoPorMercado.values().stream()
            .min(Comparator.comparing(Preco::getValor));
    }
}
