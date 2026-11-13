/**
 * Chaves de recursos do frontend.
 *
 * LOJAS_PROXIMAS_ATIVO: seletor de CEP/raio e "loja mais próxima" no catálogo.
 * Continua DESLIGADO de propósito. A Fase 3 (API de lojas próximas, Haversine no backend Java)
 * já existe e o CatalogPage já recebe as lojas dela (hook useLocalizacao); o que falta é dado:
 * só ligue quando houver ao menos uma filial real, com coordenadas, em produção. Sem isso a
 * loja mais próxima não tem distância e a loja padrão (sem distância) fica fora dos cartões.
 * Nunca alimente o catálogo com um arquivo local de filiais (o JSON antigo saiu do repositório,
 * ver docs/EXPANSAO_RS_SCRAPERS.md).
 */
export const LOJAS_PROXIMAS_ATIVO = false;
