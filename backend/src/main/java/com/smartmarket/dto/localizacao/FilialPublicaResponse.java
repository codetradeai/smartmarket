package com.smartmarket.dto.localizacao;

/**
 * Uma filial real (nunca a loja padrão) com coordenadas, de um mercado ativo. Dado público do endereço da
 * filial, sem nada do usuário e sem endereço, CEP, cidade ou UF: o cliente só precisa do nome e do ponto
 * para calcular a distância e montar o "Como chegar".
 */
public record FilialPublicaResponse(
    Long mercadoId,
    String mercadoNome,
    Long lojaId,
    String lojaNome,
    double latitude,
    double longitude
) {
}
