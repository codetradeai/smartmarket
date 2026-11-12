package com.smartmarket.service.geo;

/**
 * Distância em linha reta entre dois pontos da Terra (fórmula de Haversine).
 * Porte de {@code calcularHaversine} de frontend/src/utils/proximidadeFiliais.js (mesmo raio,
 * 6371 km, e mesma fórmula), sem o arredondamento: quem exibe decide as casas decimais.
 */
public final class Haversine {

    public static final double RAIO_TERRA_KM = 6371.0;

    private Haversine() {
    }

    public static double distanciaKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        return RAIO_TERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
