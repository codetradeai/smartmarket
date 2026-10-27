-- ============================================================
-- SmartMarket - Script DDL
-- PostgreSQL
-- Gerado com base no mapeamento atual das entidades JPA
-- ============================================================

-- Limpa as tabelas caso o script seja executado novamente
DROP TABLE IF EXISTS alerta CASCADE;
DROP TABLE IF EXISTS favorito CASCADE;
DROP TABLE IF EXISTS item_lista CASCADE;
DROP TABLE IF EXISTS lista_compra CASCADE;
DROP TABLE IF EXISTS promocao CASCADE;
DROP TABLE IF EXISTS preco CASCADE;
DROP TABLE IF EXISTS produto CASCADE;
DROP TABLE IF EXISTS mercado CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;

-- ============================================================
-- USUARIO
-- ============================================================

CREATE TABLE usuario (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    papel VARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_usuario_papel
        CHECK (papel IN ('USER', 'ADMIN'))
);

-- ============================================================
-- PRODUTO
-- ============================================================

CREATE TABLE produto (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    nome_normalizado VARCHAR(255),
    marca VARCHAR(255),
    quantidade DOUBLE PRECISION,
    unidade VARCHAR(255),
    codigo_barras VARCHAR(255),
    categoria VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MERCADO
-- ============================================================

CREATE TABLE mercado (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    endereco VARCHAR(255),
    logo_url VARCHAR(255),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PRECO
-- ============================================================

CREATE TABLE preco (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT NOT NULL,
    mercado_id BIGINT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    coletado_em TIMESTAMP NOT NULL,
    origem VARCHAR(255),
    nome_bruto VARCHAR(255),
    disponivel BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_preco_produto
        FOREIGN KEY (produto_id)
        REFERENCES produto(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_preco_mercado
        FOREIGN KEY (mercado_id)
        REFERENCES mercado(id)
        ON DELETE CASCADE
);

-- ============================================================
-- PROMOCAO
-- ============================================================

CREATE TABLE promocao (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT NOT NULL,
    mercado_id BIGINT NOT NULL,
    valor_original NUMERIC(10, 2) NOT NULL,
    valor_promocional NUMERIC(10, 2) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    coletado_em TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_promocao_produto
        FOREIGN KEY (produto_id)
        REFERENCES produto(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_promocao_mercado
        FOREIGN KEY (mercado_id)
        REFERENCES mercado(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_promocao_valores
        CHECK (valor_promocional <= valor_original),

    CONSTRAINT chk_promocao_datas
        CHECK (data_fim >= data_inicio)
);

-- ============================================================
-- LISTA_COMPRA
-- ============================================================

CREATE TABLE lista_compra (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,

    CONSTRAINT fk_lista_compra_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE
);

-- ============================================================
-- ITEM_LISTA
-- ============================================================

CREATE TABLE item_lista (
    id BIGSERIAL PRIMARY KEY,
    lista_compra_id BIGINT NOT NULL,
    produto_id BIGINT NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_item_lista_lista
        FOREIGN KEY (lista_compra_id)
        REFERENCES lista_compra(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_item_lista_produto
        FOREIGN KEY (produto_id)
        REFERENCES produto(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_item_lista_quantidade
        CHECK (quantidade > 0)
);

-- ============================================================
-- FAVORITO
-- ============================================================

CREATE TABLE favorito (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    mercado_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_favorito_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorito_mercado
        FOREIGN KEY (mercado_id)
        REFERENCES mercado(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_favorito_usuario_mercado
        UNIQUE (usuario_id, mercado_id)
);

-- ============================================================
-- ALERTA
-- ============================================================

CREATE TABLE alerta (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    produto_id BIGINT NOT NULL,
    preco_alvo NUMERIC(10, 2) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_alerta_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_alerta_produto
        FOREIGN KEY (produto_id)
        REFERENCES produto(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_alerta_preco_alvo
        CHECK (preco_alvo >= 0)
);

-- ============================================================
-- ÍNDICES PARA CHAVES E CONSULTAS FREQUENTES
-- ============================================================

CREATE INDEX idx_preco_produto_id
    ON preco(produto_id);

CREATE INDEX idx_preco_mercado_id
    ON preco(mercado_id);

CREATE INDEX idx_promocao_produto_id
    ON promocao(produto_id);

CREATE INDEX idx_promocao_mercado_id
    ON promocao(mercado_id);

CREATE INDEX idx_lista_compra_usuario_id
    ON lista_compra(usuario_id);

CREATE INDEX idx_item_lista_lista_compra_id
    ON item_lista(lista_compra_id);

CREATE INDEX idx_item_lista_produto_id
    ON item_lista(produto_id);

CREATE INDEX idx_favorito_usuario_id
    ON favorito(usuario_id);

CREATE INDEX idx_favorito_mercado_id
    ON favorito(mercado_id);

CREATE INDEX idx_alerta_usuario_id
    ON alerta(usuario_id);

CREATE INDEX idx_alerta_produto_id
    ON alerta(produto_id);

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
