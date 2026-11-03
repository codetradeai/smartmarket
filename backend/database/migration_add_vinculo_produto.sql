-- ============================================================
-- Migração SmartMarket: vínculos entre produtos de redes diferentes
-- Idempotente e segura para ambientes existentes.
--
-- Cada linha liga dois registros de produto (um por rede) que representam o mesmo item.
--   origem: como o vínculo foi feito ('ean' = mesmo EAN válido; 'nome' = chave idêntica marca+nome+unidade)
--   status: 'confirmado' entra no comparador; 'revisar' (ex.: mesmo EAN, mas 45g vs 6 unidades) fica de fora
-- produto_a_id < produto_b_id garante um único registro por par, em qualquer ordem de gravação.
-- ============================================================

CREATE TABLE IF NOT EXISTS vinculo_produto (
    id BIGSERIAL PRIMARY KEY,
    produto_a_id BIGINT NOT NULL,
    produto_b_id BIGINT NOT NULL,
    origem VARCHAR(10) NOT NULL,
    status VARCHAR(10) NOT NULL,
    motivo VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    CONSTRAINT fk_vinculo_produto_a
        FOREIGN KEY (produto_a_id) REFERENCES produto(id) ON DELETE CASCADE,
    CONSTRAINT fk_vinculo_produto_b
        FOREIGN KEY (produto_b_id) REFERENCES produto(id) ON DELETE CASCADE,
    CONSTRAINT chk_vinculo_ordem CHECK (produto_a_id < produto_b_id),
    CONSTRAINT chk_vinculo_origem CHECK (origem IN ('ean', 'nome')),
    CONSTRAINT chk_vinculo_status CHECK (status IN ('confirmado', 'revisar')),
    CONSTRAINT uk_vinculo_produto_par UNIQUE (produto_a_id, produto_b_id)
);

CREATE INDEX IF NOT EXISTS idx_vinculo_produto_a ON vinculo_produto(produto_a_id);
CREATE INDEX IF NOT EXISTS idx_vinculo_produto_b ON vinculo_produto(produto_b_id);
CREATE INDEX IF NOT EXISTS idx_vinculo_produto_status ON vinculo_produto(status);
