/**
 * SmartMarket - Motor de Resolução de Proximidade e Filiais (Front-end)
 * Caminho: frontend/src/utils/proximidadeFiliais.js
 * 
 * Implementa a Fórmula de Haversine e resolução de filiais mais próximas
 * para exibição contextualizada por CEP no React.
 */

import CATALOGO_PADRAO_FILIAIS from "../data/catalogo_filiais_rs.json";

const RAIO_TERRA_KM = 6371.0;

// Centroids geográficos de fallback para Região Metropolitana de Porto Alegre e RS
export const CENTROIDS_RS = {
  "949": { cidade: "Cachoeirinha", lat: -29.9511, lon: -51.0944 },
  "940": { cidade: "Gravataí", lat: -29.9436, lon: -50.9926 },
  "941": { cidade: "Gravataí", lat: -29.9320, lon: -50.9850 },
  "920": { cidade: "Canoas", lat: -29.9140, lon: -51.1750 },
  "923": { cidade: "Canoas", lat: -29.9180, lon: -51.1850 },
  "924": { cidade: "Canoas", lat: -29.8850, lon: -51.1710 },
  "900": { cidade: "Porto Alegre Centro", lat: -30.0346, lon: -51.2177 },
  "902": { cidade: "Porto Alegre Humaitá", lat: -29.9856, lon: -51.1925 },
  "905": { cidade: "Porto Alegre Floresta", lat: -30.0255, lon: -51.2120 },
  "906": { cidade: "Porto Alegre Ipiranga", lat: -30.0542, lon: -51.1825 },
  "910": { cidade: "Porto Alegre Zona Norte", lat: -29.9930, lon: -51.1578 },
  "915": { cidade: "Porto Alegre Leste", lat: -30.0540, lon: -51.1820 },
  "917": { cidade: "Porto Alegre Zona Sul", lat: -30.1026, lon: -51.2312 },
  "948": { cidade: "Alvorada", lat: -30.0016, lon: -51.0808 },
  "944": { cidade: "Viamão", lat: -30.0750, lon: -51.0340 },
  "932": { cidade: "Esteio / Sapucaia", lat: -29.8400, lon: -51.1600 },
  "930": { cidade: "São Leopoldo", lat: -29.7610, lon: -51.1480 },
  "933": { cidade: "Novo Hamburgo", lat: -29.6840, lon: -51.1310 },
};

/**
 * Resolução síncrona imediata usando centroids locais (evita layout shifts na UI).
 */
export function resolverCoordenadasCepSync(cep) {
  const cepLimpo = String(cep || "").replace(/\D/g, "");
  const prefixo = cepLimpo.slice(0, 3);
  if (CENTROIDS_RS[prefixo]) {
    const cinfo = CENTROIDS_RS[prefixo];
    return {
      cep: cepLimpo,
      cidade: cinfo.cidade,
      bairro: "",
      endereco: "",
      lat: cinfo.lat,
      lon: cinfo.lon,
      fonte: "Centroid_RS_Local"
    };
  }
  return {
    cep: cepLimpo || "94910000",
    cidade: "Cachoeirinha",
    bairro: "Centro",
    endereco: "",
    lat: -29.9511,
    lon: -51.0944,
    fonte: "Centroid_Cachoeirinha_Padrao"
  };
}

/**
 * Calcula a distância em km entre duas coordenadas usando a Fórmula de Haversine.
 */
export function calcularHaversine(lat1, lon1, lat2, lon2) {
  const toRad = (valor) => (valor * Math.PI) / 180.0;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((RAIO_TERRA_KM * c).toFixed(2));
}

/**
 * Resolve as coordenadas de um CEP brasileiro (com fallback resiliente para RS).
 */
export async function resolverCoordenadasCep(cep) {
  const cepLimpo = String(cep).replace(/\D/g, "");
  if (cepLimpo.length !== 8) {
    throw new Error(`CEP inválido: ${cep}`);
  }

  // 1. Tentar AwesomeAPI (retorna lat/lng geocodificados)
  try {
    const res = await fetch(`https://cep.awesomeapi.com.br/json/${cepLimpo}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.lat && data.lng) {
        return {
          cep: cepLimpo,
          cidade: data.city || "RS",
          bairro: data.district || "",
          endereco: data.address || "",
          lat: parseFloat(data.lat),
          lon: parseFloat(data.lng),
          fonte: "AwesomeAPI"
        };
      }
    }
  } catch {
    // Segue para fallback
  }

  // 2. Fallback de alta precisão por prefixo RS
  const prefixo = cepLimpo.slice(0, 3);
  if (CENTROIDS_RS[prefixo]) {
    const cinfo = CENTROIDS_RS[prefixo];
    return {
      cep: cepLimpo,
      cidade: cinfo.cidade,
      bairro: "",
      endereco: "",
      lat: cinfo.lat,
      lon: cinfo.lon,
      fonte: "Centroid_RS_Local"
    };
  }

  // Fallback geral Porto Alegre Centro
  return {
    cep: cepLimpo,
    cidade: "Porto Alegre",
    bairro: "Centro",
    endereco: "",
    lat: -30.0346,
    lon: -51.2177,
    fonte: "Centroid_POA_Padrao"
  };
}

/**
 * Encontra a filial mais próxima de cada rede dada a coordenada do usuário.
 */
export function encontrarFiliaisMaisProximas(latUsuario, lonUsuario, listaFiliais) {
  const filiais = Array.isArray(listaFiliais) && listaFiliais.length > 0 ? listaFiliais : CATALOGO_PADRAO_FILIAIS;
  const maisProximaPorRede = {};

  for (const fil of filiais) {
    const rede = fil.rede;
    const distKm = calcularHaversine(latUsuario, lonUsuario, fil.latitude, fil.longitude);

    if (!maisProximaPorRede[rede] || distKm < maisProximaPorRede[rede].distanciaKm) {
      maisProximaPorRede[rede] = {
        filialId: fil.filial_id,
        nomeFilial: fil.nome_filial,
        endereco: fil.endereco,
        cidade: fil.cidade,
        distanciaKm: distKm,
        latitude: fil.latitude,
        longitude: fil.longitude
      };
    }
  }

  return maisProximaPorRede;
}

