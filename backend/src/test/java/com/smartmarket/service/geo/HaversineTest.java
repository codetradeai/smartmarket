package com.smartmarket.service.geo;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class HaversineTest {

    @Test
    void mesmoPontoTemDistanciaZero() {
        assertThat(Haversine.distanciaKm(-30.0346, -51.2177, -30.0346, -51.2177)).isZero();
    }

    @Test
    void umGrauDeLatitudeNoEquadorVale111Km() {
        // 2 * pi * 6371 / 360 = 111,195 km
        assertThat(Haversine.distanciaKm(0, 0, 1, 0)).isCloseTo(111.195, within(0.01));
    }

    @Test
    void portoAlegreASaoPauloFicaPertoDe850Km() {
        double km = Haversine.distanciaKm(-30.0346, -51.2177, -23.5505, -46.6333);
        assertThat(km).isBetween(845.0, 860.0);
    }

    @Test
    void distanciaNaoDependeDaOrdemDosPontos() {
        double ida = Haversine.distanciaKm(-30.0346, -51.2177, -29.9511, -51.0944);
        double volta = Haversine.distanciaKm(-29.9511, -51.0944, -30.0346, -51.2177);
        assertThat(ida).isCloseTo(volta, within(1e-9));
        // Centro de Porto Alegre a Cachoeirinha: ~15 km (mesmos centroides de proximidadeFiliais.js).
        assertThat(ida).isBetween(13.0, 17.0);
    }

    @Test
    void cruzaOAntimeridianoPeloCaminhoCurto() {
        // 179 e -179 de longitude no equador: 2 graus, nao 358.
        assertThat(Haversine.distanciaKm(0, 179, 0, -179)).isCloseTo(222.39, within(0.05));
    }
}
