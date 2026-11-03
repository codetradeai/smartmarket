-- ============================================================
-- Migração SmartMarket: promocao.data_fim passa a ser opcional
-- Idempotente e segura para ambientes existentes.
--
-- Motivo: nem toda rede informa a validade da promoção. O coletor grava NULL
-- (nunca uma data inventada) e o backend trata NULL como "vigente até nova coleta".
-- O CHECK chk_promocao_datas (data_fim >= data_inicio) continua valendo e aceita NULL.
-- ============================================================

ALTER TABLE promocao ALTER COLUMN data_fim DROP NOT NULL;
