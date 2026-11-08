package com.smartmarket.service;

import com.smartmarket.model.Preco;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Seleciona os precos que valem hoje a partir do historico completo.
 *
 * A coleta marca como indisponivel apenas a linha mais recente de um produto que
 * sumiu da rede; as linhas antigas continuam com disponivel = true. Filtrar
 * disponivel = true direto na consulta faria o preco antigo reaparecer como
 * atual. Aqui o par produto x mercado e decidido pela linha MAIS RECENTE: se ela
 * estiver indisponivel, o par inteiro e descartado.
 */
final class PrecosVigentes {

    private PrecosVigentes() {}

    /**
     * @param historicoMaisRecentePrimeiro precos ordenados por coletadoEm desc (e id desc)
     * @return linhas disponiveis, na mesma ordem, de pares cuja linha mais recente esta disponivel
     */
    static List<Preco> descartandoParesIndisponiveis(List<Preco> historicoMaisRecentePrimeiro) {
        Set<List<Long>> vistos = new HashSet<>();
        Set<List<Long>> bloqueados = new HashSet<>();
        for (Preco preco : historicoMaisRecentePrimeiro) {
            List<Long> chave = chave(preco);
            if (vistos.add(chave) && !Boolean.TRUE.equals(preco.getDisponivel())) {
                bloqueados.add(chave);
            }
        }
        return historicoMaisRecentePrimeiro.stream()
            .filter(preco -> Boolean.TRUE.equals(preco.getDisponivel()))
            .filter(preco -> !bloqueados.contains(chave(preco)))
            .toList();
    }

    private static List<Long> chave(Preco preco) {
        return List.of(preco.getProduto().getId(), preco.getMercado().getId());
    }
}
