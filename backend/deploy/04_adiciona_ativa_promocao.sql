-- ============================================================
-- SmartMarket — migration: adiciona coluna `ativa` em promocao
-- Executar DEPOIS de 01_schema.sql, 02_mercados.sql e 03_carga.sql.
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- ============================================================

ALTER TABLE promocao
    ADD COLUMN IF NOT EXISTS ativa BOOLEAN NOT NULL DEFAULT TRUE;

-- Promoções com data_fim já vencida não precisam de ativa=false porque
-- a consulta de vigência já as filtra por data. Apenas as sem data_fim
-- precisam do campo para o caso de não serem reencontradas na coleta.
