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

  describe("encontrarFiliaisMaisProximas", () => {
    const FILIAIS = [
      { rede: "asun", filial_id: "asun_1", nome_filial: "Asun Cachoeirinha", endereco: "Av. A, 1", cidade: "Cachoeirinha", latitude: -29.9511, longitude: -51.0944 },
      { rede: "asun", filial_id: "asun_2", nome_filial: "Asun Porto Alegre", endereco: "Av. B, 2", cidade: "Porto Alegre", latitude: -30.0346, longitude: -51.2177 },
      { rede: "fort", filial_id: "fort_1", nome_filial: "Fort Canoas", endereco: "Av. C, 3", cidade: "Canoas", latitude: -29.9140, longitude: -51.1750 },
    ];

    test("escolhe a filial mais próxima de cada rede entre as recebidas", () => {
      const r = encontrarFiliaisMaisProximas(-29.9511, -51.0944, FILIAIS);
      expect(Object.keys(r).sort()).toEqual(["asun", "fort"]);
      expect(r.asun.filialId).toBe("asun_1");
      expect(r.asun.distanciaKm).toBeLessThan(1);
      expect(r.fort.filialId).toBe("fort_1");
      expect(r.fort.distanciaKm).toBeGreaterThan(5);
      expect(r.fort.distanciaKm).toBeLessThan(12);
    });

    test("sem lista não há catálogo embutido: devolve objeto vazio", () => {
      expect(encontrarFiliaisMaisProximas(-29.9511, -51.0944)).toEqual({});
      expect(encontrarFiliaisMaisProximas(-29.9511, -51.0944, [])).toEqual({});
      expect(encontrarFiliaisMaisProximas(-29.9511, -51.0944, null)).toEqual({});
    });
  });
});
