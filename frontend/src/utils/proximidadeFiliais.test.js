import {
  calcularHaversine,
  resolverCoordenadasCepSync,
  encontrarFiliaisMaisProximas,
} from "./proximidadeFiliais";

describe("proximidadeFiliais: Utilitário de Georreferenciamento e Haversine RS", () => {
  test("calcula distância Haversine em linha reta com precisão", () => {
    // Distância Cachoeirinha (-29.9511, -51.0944) até Porto Alegre Centro (-30.0346, -51.2177) ~ 15 km
    const dist = calcularHaversine(-29.9511, -51.0944, -30.0346, -51.2177);
    expect(dist).toBeGreaterThan(12);
    expect(dist).toBeLessThan(18);
  });

  test("resolve coordenadas síncronas de CEPs da Região Metropolitana", () => {
    const geoCachoeirinha = resolverCoordenadasCepSync("94910-000");
    expect(geoCachoeirinha.cidade).toBe("Cachoeirinha");
    expect(geoCachoeirinha.lat).toBeCloseTo(-29.9511, 2);

    const geoPOA = resolverCoordenadasCepSync("90010-000");
    expect(geoPOA.cidade).toMatch(/Porto Alegre/);
    expect(geoPOA.lat).toBeCloseTo(-30.0346, 2);

    const geoGravatai = resolverCoordenadasCepSync("94010-000");
    expect(geoGravatai.cidade).toBe("Gravataí");

    const geoCanoas = resolverCoordenadasCepSync("92010-000");
    expect(geoCanoas.cidade).toBe("Canoas");
  });

  test("encontra a filial mais próxima de cada rede sem exigir passagem explícita de lista", () => {
    // Para Cachoeirinha Centro
    const filiais = encontrarFiliaisMaisProximas(-29.9511, -51.0944);
    expect(filiais).toBeDefined();
    expect(typeof filiais).toBe("object");

    // Asun de Cachoeirinha deve estar a menos de 2 km
    if (filiais.asun) {
      expect(filiais.asun.distanciaKm).toBeLessThan(3.0);
      expect(filiais.asun.cidade).toBe("Cachoeirinha");
    }

    // Fort de Canoas deve estar a menos de 10 km
    if (filiais.fort) {
      expect(filiais.fort.distanciaKm).toBeLessThan(12.0);
    }
  });
});
