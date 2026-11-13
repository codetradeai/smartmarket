package com.smartmarket.dto.localizacao;

/**
 * A loja que atende o usuário em uma rede (mercado).
 *
 * @param latitude    latitude da loja (dado público do endereço da filial, não do usuário); nula, junto com
 *                    a longitude, na loja padrão (ela representa a rede, não um lugar) e em loja sem
 *                    coordenadas. Nunca vem uma coordenada sozinha
 * @param longitude   longitude da loja, com as mesmas regras da latitude
 * @param distanciaKm distância em linha reta até o CEP do usuário, em km com 2 casas; nulo quando
 *                    não dá para calcular (usuário sem coordenadas ou loja sem coordenadas)
 * @param padrao      verdadeiro quando é a loja padrão do mercado (sem localização ou sem filial próxima)
 * @param preferida   verdadeiro quando é a loja que o usuário escolheu para esta rede
 */
public record LojaProximaResponse(
    Long mercadoId,
    String mercadoNome,
    Long lojaId,
    String lojaNome,
    String endereco,
    String cidade,
    String uf,
    Double latitude,
    Double longitude,
    Double distanciaKm,
    boolean padrao,
    boolean preferida
) {
}
