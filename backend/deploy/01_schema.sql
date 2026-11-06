-- ============================================================
-- SmartMarket — DDL completo para banco Neon (PostgreSQL)
-- Executar UMA VEZ num banco vazio, antes de subir o backend.
-- Ordem: tabelas sem FK primeiro, depois as dependentes.
-- Idempotente via "IF NOT EXISTS".
-- ============================================================

-- ----------------------------------------------------------------
-- 1. usuario
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
    id         BIGSERIAL PRIMARY KEY,
    nome       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL UNIQUE,
    senha      VARCHAR(255) NOT NULL,
    papel      VARCHAR(10)  NOT NULL DEFAULT 'USER'
                   CHECK (papel IN ('USER', 'ADMIN')),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 2. produto
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produto (
    id               BIGSERIAL PRIMARY KEY,
    nome             VARCHAR(255) NOT NULL,
    nome_normalizado VARCHAR(255),
    marca            VARCHAR(255),
    quantidade       DOUBLE PRECISION,
    unidade          VARCHAR(50),
    codigo_barras    VARCHAR(50),
    categoria        VARCHAR(255),
    imagem_url       VARCHAR(500),
    descricao        TEXT,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 3. mercado
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mercado (
    id         BIGSERIAL PRIMARY KEY,
    nome       VARCHAR(255) NOT NULL,
    endereco   VARCHAR(500),
    logo_url   VARCHAR(500),
    ativo      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 4. preco
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS preco (
    id           BIGSERIAL PRIMARY KEY,
    produto_id   BIGINT       NOT NULL REFERENCES produto(id),
    mercado_id   BIGINT       NOT NULL REFERENCES mercado(id),
    valor        NUMERIC(12,2) NOT NULL,
    coletado_em  TIMESTAMP    NOT NULL DEFAULT NOW(),
    origem       VARCHAR(100),
    nome_bruto   VARCHAR(500),
    disponivel   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preco_produto   ON preco(produto_id);
CREATE INDEX IF NOT EXISTS idx_preco_mercado   ON preco(mercado_id);
CREATE INDEX IF NOT EXISTS idx_preco_coletado  ON preco(coletado_em DESC);

-- ----------------------------------------------------------------
-- 5. promocao
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promocao (
    id               BIGSERIAL PRIMARY KEY,
    produto_id       BIGINT        NOT NULL REFERENCES produto(id),
    mercado_id       BIGINT        NOT NULL REFERENCES mercado(id),
    valor_original   NUMERIC(12,2) NOT NULL,
    valor_promocional NUMERIC(12,2) NOT NULL,
    data_inicio      DATE          NOT NULL,
    data_fim         DATE,
    coletado_em      TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 6. alerta
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerta (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT        NOT NULL REFERENCES usuario(id),
    produto_id  BIGINT        NOT NULL REFERENCES produto(id),
    preco_alvo  NUMERIC(12,2) NOT NULL,
    ativo       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, produto_id)
);

-- ----------------------------------------------------------------
-- 7. favorito (mercado favorito do usuario)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorito (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT    NOT NULL REFERENCES usuario(id),
    mercado_id  BIGINT    NOT NULL REFERENCES mercado(id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, mercado_id)
);

-- ----------------------------------------------------------------
-- 8. favorito_produto
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorito_produto (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT    NOT NULL REFERENCES usuario(id),
    produto_id  BIGINT    NOT NULL REFERENCES produto(id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, produto_id)
);

-- ----------------------------------------------------------------
-- 9. lista_compra
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lista_compra (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT       NOT NULL REFERENCES usuario(id),
    nome        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP
);

-- ----------------------------------------------------------------
-- 10. item_lista
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS item_lista (
    id              BIGSERIAL PRIMARY KEY,
    lista_compra_id BIGINT    NOT NULL REFERENCES lista_compra(id) ON DELETE CASCADE,
    produto_id      BIGINT    NOT NULL REFERENCES produto(id),
    quantidade      INTEGER   NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 11. vinculo_produto
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vinculo_produto (
    id           BIGSERIAL PRIMARY KEY,
    produto_a_id BIGINT       NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    produto_b_id BIGINT       NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    origem       VARCHAR(10)  NOT NULL,
    status       VARCHAR(10)  NOT NULL,
    motivo       VARCHAR(100),
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP,
    -- garante um unico par (a < b)
    UNIQUE (produto_a_id, produto_b_id),
    CHECK (produto_a_id < produto_b_id)
);

CREATE INDEX IF NOT EXISTS idx_vinculo_a ON vinculo_produto(produto_a_id);
CREATE INDEX IF NOT EXISTS idx_vinculo_b ON vinculo_produto(produto_b_id);
