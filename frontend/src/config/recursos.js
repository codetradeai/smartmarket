/**
 * Chaves de recursos do frontend.
 *
 * LOJAS_PROXIMAS_ATIVO: seletor de CEP/raio e "loja mais próxima" no catálogo.
 * Fica DESLIGADO de propósito. A primeira versão lia um JSON estático de filiais
 * (frontend/src/data/catalogo_filiais_rs.json), que saiu do repositório junto com o
 * sistema paralelo de coleta (ver docs/EXPANSAO_RS_SCRAPERS.md). Só ligue quando a
 * Fase 3 (API de lojas próximas, Haversine no backend Java) existir e o CatalogPage
 * receber a lista de lojas dela. Não religue a um arquivo local.
 */
export const LOJAS_PROXIMAS_ATIVO = false;
