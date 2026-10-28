-- ============================================================
-- Migração SmartMarket: Adição de imagem_url e descricao em produto
-- Idempotente e segura para ambientes existentes
-- ============================================================

ALTER TABLE produto ADD COLUMN IF NOT EXISTS imagem_url TEXT;
ALTER TABLE produto ADD COLUMN IF NOT EXISTS descricao TEXT;
