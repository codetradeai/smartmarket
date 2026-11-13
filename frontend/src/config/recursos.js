/**
 * Chaves de recursos do frontend.
 *
 * LOJAS_PROXIMAS_ATIVO: seletor de CEP/raio e "loja mais próxima" no catálogo.
 * LIGADO desde a Fase 4D: o backend (API de lojas próximas, Haversine em Java) está em produção
 * e o banco tem 82 filiais reais de Fort, Asun e Zaffari/Bourbon no RS, 74 delas com coordenadas
 * (backend/deploy/08_lojas_filiais.sql, aplicado em 13/11/2026). As outras cinco redes seguem só
 * com a loja padrão (sem distância) até uma segunda carga de filiais.
 * Para desligar de novo, volte o valor para false: o catálogo deixa de chamar as rotas de loja.
 * Nunca alimente o catálogo com um arquivo local de filiais (o JSON antigo saiu do repositório,
 * ver docs/EXPANSAO_RS_SCRAPERS.md).
 */
export const LOJAS_PROXIMAS_ATIVO = true;
