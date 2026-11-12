package com.smartmarket.service.geo;

/** Regras do CEP: aceito com ou sem hífen, guardado sempre com 8 dígitos. */
public final class Cep {

    /** Formato aceito na entrada: 12345-678 ou 12345678. Usado nas anotações de validação. */
    public static final String REGEX = "^\\d{5}-?\\d{3}$";

    public static final String MENSAGEM_INVALIDO = "CEP invalido: use 8 digitos, com ou sem hifen (ex.: 90010-000)";

    private Cep() {
    }

    /** Tira o hífen (e espaços das pontas). Supõe que o valor já passou pela validação do {@link #REGEX}. */
    public static String normalizar(String cep) {
        return cep.trim().replace("-", "");
    }
}
