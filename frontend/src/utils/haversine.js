const RAIO_TERRA_KM = 6371

const paraRadianos = (graus) => (graus * Math.PI) / 180

/**
 * Distância em linha reta entre dois pontos da Terra, em km (fórmula de Haversine). Mesmo raio (6371 km)
 * e mesma fórmula do Haversine.java do backend, e sem arredondar: quem exibe decide as casas decimais.
 * Os testes comparam com valores calculados pelo próprio Java.
 */
export function distanciaKm(lat1, lon1, lat2, lon2) {
  const dLat = paraRadianos(lat2 - lat1)
  const dLon = paraRadianos(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(paraRadianos(lat1)) * Math.cos(paraRadianos(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return RAIO_TERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
