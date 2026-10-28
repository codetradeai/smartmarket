/**
 * Utilitário de Descoberta de Produtos Relacionados e Alternativas de Preço
 * SmartMarket - Fase 4
 *
 * Função pura, sem dependências externas, que correlaciona produtos de forma segura
 * e conservadora, priorizando correspondência de categoria, gramatura e relevância de mercado.
 */

// Marcas consideradas genéricas ou descritores de setor que não devem formar grupos de marca
const GENERIC_BRANDS = new Set([
  "",
  "geral",
  "açougue",
  "acougue",
  "padaria",
  "hortifruti",
  "bazar",
  "outros",
  "diversos",
  "sem marca",
  "marca própria",
  "marca propria"
]);

/**
 * Extrai o menor preço válido dentre as redes monitoradas em `prices`.
 * Ignora valores nulos, indefinidos, strings inválidas, zero e números negativos.
 * 
 * @param {Object} product
 * @returns {number|null} Menor preço válido ou null se indisponível.
 */
export function getLowestPrice(product) {
  if (!product || !product.prices || typeof product.prices !== "object") {
    return null;
  }

  const values = Object.values(product.prices);
  const validPrices = values
    .map((v) => (typeof v === "number" ? v : parseFloat(v)))
    .filter((v) => typeof v === "number" && !isNaN(v) && isFinite(v) && v > 0);

  if (validPrices.length === 0) {
    return null;
  }

  return Math.min(...validPrices);
}

/**
 * Normaliza a representação textual de gramatura/unidade para comparação segura.
 * Ex: " 500g " -> "500g", "1 L" -> "1l", "1,5l" -> "1.5l"
 */
export function normalizeUnit(unit) {
  if (!unit || typeof unit !== "string") return "";
  return unit
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(",", ".");
}

/**
 * Verifica se uma marca é válida e não-genérica.
 */
export function isValidBrand(brand) {
  if (!brand || typeof brand !== "string") return false;
  const clean = brand.trim().toLowerCase();
  return clean.length >= 2 && !GENERIC_BRANDS.has(clean);
}

/**
 * Extrai tokens representativos de tipo ou família de produto a partir do nome.
 * Ex: café "em pó", "solúvel", "cápsula", feijão "preto", "carioca", etc.
 */
function extractProductTypeTokens(name) {
  if (!name || typeof name !== "string") return [];
  const lower = name.toLowerCase();
  const knownSubtypes = [
    "em pó", "em po", "soluvel", "solúvel", "capsula", "cápsula", "grao", "grão", "torrado",
    "preto", "carioca", "branco", "integral", "parboilizado",
    "desnatado", "integral", "semidesnatado", "zero lactose",
    "extra forte", "extraforte", "tradicional", "gourmet"
  ];

  return knownSubtypes.filter((sub) => lower.includes(sub));
}

/**
 * Obtém alternativas de outras marcas e outros produtos da mesma marca.
 * 
 * @param {Object} currentProduct - Produto atualmente em exibição
 * @param {Array} allProducts - Lista completa do catálogo (ex: 530 produtos)
 * @param {number} limit - Quantidade máxima de itens por grupo (padrão: 4)
 * @returns {{ directAlternatives: Array, brandAlternatives: Array }}
 */
export function getRelatedProducts(currentProduct, allProducts, limit = 4) {
  if (!currentProduct || !currentProduct.id || !Array.isArray(allProducts) || allProducts.length === 0) {
    return { directAlternatives: [], brandAlternatives: [] };
  }

  const currentId = String(currentProduct.id);
  const currentCategory = (currentProduct.category || "").trim().toLowerCase();
  const currentUnit = normalizeUnit(currentProduct.unit);
  const currentBrand = (currentProduct.brand || "").trim().toLowerCase();
  const currentHasValidBrand = isValidBrand(currentBrand);
  const currentTypeTokens = extractProductTypeTokens(currentProduct.name);

  // Filtra candidatos eliminando o produto atual e produtos sem ID válido
  const candidates = allProducts.filter((p) => {
    if (!p || !p.id || String(p.id) === currentId) return false;
    return true;
  });

  // ==========================================================
  // GRUPO A: Alternativas de outras marcas
  // ==========================================================
  const otherBrandCandidates = candidates.filter((p) => {
    const pCat = (p.category || "").trim().toLowerCase();
    // Mesma categoria obrigatória
    if (!currentCategory || pCat !== currentCategory) return false;

    // Se o produto atual tem marca válida, a alternativa deve ser de outra marca
    if (currentHasValidBrand) {
      const pBrand = (p.brand || "").trim().toLowerCase();
      if (isValidBrand(pBrand) && pBrand === currentBrand) {
        return false;
      }
    }
    return true;
  });

  // Classifica e pontua relevância das alternativas de outras marcas
  const scoredDirect = otherBrandCandidates.map((p) => {
    const pUnit = normalizeUnit(p.unit);
    const sameUnit = currentUnit && pUnit && currentUnit === pUnit;
    const pTypeTokens = extractProductTypeTokens(p.name);
    const sharedTypes = currentTypeTokens.filter((t) => pTypeTokens.includes(t)).length;

    const lowestPrice = getLowestPrice(p);
    const hasPrice = lowestPrice !== null;

    // Score de relevância:
    // +100 para mesma unidade/gramatura (comparação direta justa)
    // +50 se possui cotação de preço válida no mercado
    // +20 por subtipo em comum (ex: solúvel com solúvel)
    let score = 0;
    if (sameUnit) score += 100;
    if (hasPrice) score += 50;
    score += sharedTypes * 20;

    return {
      product: p,
      score,
      sameUnit,
      lowestPrice,
      hasPrice
    };
  });

  // Ordena por maior pontuação de equivalência e, em caso de empate, pelo menor preço válido
  scoredDirect.sort((a, b) => {
    // 1. Quem tem cotação válida sempre precede quem não tem cotação
    if (a.hasPrice && !b.hasPrice) return -1;
    if (!a.hasPrice && b.hasPrice) return 1;

    // 2. Mesma unidade tem precedência alta
    if (a.sameUnit && !b.sameUnit) return -1;
    if (!a.sameUnit && b.sameUnit) return 1;

    // 3. Maior score de relevância
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // 4. Menor preço válido
    if (a.hasPrice && b.hasPrice) {
      return a.lowestPrice - b.lowestPrice;
    }

    return 0;
  });

  const directAlternatives = scoredDirect
    .slice(0, limit)
    .map((item) => ({
      ...item.product,
      _lowestPrice: item.lowestPrice,
      _sameUnit: item.sameUnit
    }));

  // ==========================================================
  // GRUPO B: Mais produtos da mesma marca
  // ==========================================================
  let brandAlternatives = [];

  if (currentHasValidBrand) {
    const sameBrandCandidates = candidates.filter((p) => {
      const pBrand = (p.brand || "").trim().toLowerCase();
      return pBrand === currentBrand;
    });

    const scoredBrand = sameBrandCandidates.map((p) => {
      const pCat = (p.category || "").trim().toLowerCase();
      const sameCategory = currentCategory && pCat === currentCategory;
      const pUnit = normalizeUnit(p.unit);
      const differentSize = currentUnit && pUnit && currentUnit !== pUnit;
      const lowestPrice = getLowestPrice(p);
      const hasPrice = lowestPrice !== null;

      let score = 0;
      if (sameCategory) score += 50; // Mesma categoria
      if (differentSize) score += 20; // Variedade de tamanho

      return {
        product: p,
        score,
        lowestPrice,
        hasPrice
      };
    });

    scoredBrand.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.hasPrice && b.hasPrice) {
        return a.lowestPrice - b.lowestPrice;
      }
      if (a.hasPrice && !b.hasPrice) return -1;
      if (!a.hasPrice && b.hasPrice) return 1;
      return 0;
    });

    brandAlternatives = scoredBrand
      .slice(0, limit)
      .map((item) => ({
        ...item.product,
        _lowestPrice: item.lowestPrice
      }));
  }

  return {
    directAlternatives,
    brandAlternatives
  };
}
