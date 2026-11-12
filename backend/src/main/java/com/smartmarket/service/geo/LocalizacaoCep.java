package com.smartmarket.service.geo;

/** Resultado da consulta de um CEP. Cidade/UF e coordenadas podem faltar de forma independente. */
public record LocalizacaoCep(String cidade, String uf, Double latitude, Double longitude) {

    public boolean temCoordenadas() {
        return latitude != null && longitude != null;
    }
}
