package com.smartmarket.service.geo;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Valores de referencia do Haversine, fixos. O front (frontend/src/utils/haversine.test.js) usa exatamente
 * os mesmos literais: mudar a formula ou o raio de um lado so derruba o teste do outro. So teste, sem
 * alterar o codigo de producao.
 */
class HaversineReferenciaTest {

    private static final double TOLERANCIA_KM = 1e-8;

    private static void confere(double lat1, double lon1, double lat2, double lon2, double esperado) {
        assertThat(Haversine.distanciaKm(lat1, lon1, lat2, lon2)).isCloseTo(esperado, within(TOLERANCIA_KM));
    }

    @Test
    void portoAlegreCachoeirinha() {
        confere(-30.0346, -51.2177, -29.9511, -51.0944, 15.073396273429914);
    }

    @Test
    void portoAlegreCaxiasDoSul() {
        confere(-30.0346, -51.2177, -29.1681, -51.1794, 96.4215301811584);
    }

    @Test
    void mesmoPontoDaZero() {
        confere(-30.0346, -51.2177, -30.0346, -51.2177, 0.0);
    }

    @Test
    void cruzandoOEquador() {
        confere(-0.5, -51.0, 0.5, -51.0, 111.19492664455873);
    }

    @Test
    void portoAlegreCuritiba() {
        confere(-30.0346, -51.2177, -25.4284, -49.2733, 546.7371315185663);
    }

    @Test
    void uruguaianaTorres() {
        confere(-29.7547, -57.0883, -29.3354, -49.7261, 713.5925557278526);
    }

    @Test
    void pontosOpostosNoEquador() {
        confere(0.0, 0.0, 0.0, 180.0, 20015.086796020572);
    }
}
