-- ============================================================
-- SmartMarket - Script DDL
-- PostgreSQL
-- Gerado com base no mapeamento atual das entidades JPA
-- ============================================================

-- Limpa as tabelas caso o script seja executado novamente
DROP TABLE IF EXISTS vinculo_produto CASCADE;
DROP TABLE IF EXISTS alerta CASCADE;
DROP TABLE IF EXISTS favorito_produto CASCADE;
DROP TABLE IF EXISTS favorito CASCADE;
DROP TABLE IF EXISTS item_lista CASCADE;
DROP TABLE IF EXISTS lista_compra CASCADE;
DROP TABLE IF EXISTS promocao CASCADE;
DROP TABLE IF EXISTS preco_loja CASCADE;
DROP TABLE IF EXISTS loja CASCADE;
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
    imagem_url TEXT,
    descricao TEXT,
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
    data_fim DATE, -- opcional: rede pode não informar validade
    ativa BOOLEAN NOT NULL DEFAULT TRUE, -- false quando a coleta deixou de encontrar a promoção (só data_fim nulo)
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
-- FAVORITO_PRODUTO
-- ============================================================

CREATE TABLE favorito_produto (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    produto_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_favorito_produto_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorito_produto_produto
        FOREIGN KEY (produto_id)
        REFERENCES produto(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_favorito_produto_usuario_produto
        UNIQUE (usuario_id, produto_id)
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
-- VINCULO_PRODUTO (mesmo item em redes diferentes; 'revisar' fica fora do comparador)
-- ============================================================

CREATE TABLE vinculo_produto (
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

CREATE INDEX idx_vinculo_produto_a ON vinculo_produto(produto_a_id);
CREATE INDEX idx_vinculo_produto_b ON vinculo_produto(produto_b_id);
CREATE INDEX idx_vinculo_produto_status ON vinculo_produto(status);

-- ============================================================
-- LOJA, PRECO_LOJA E LOCALIZACAO (mesma estrutura de deploy/06_lojas_por_cep.sql,
-- sem a carga de dados: aqui o banco nasce vazio)
-- ============================================================

CREATE TABLE loja (
    id BIGSERIAL PRIMARY KEY,
    mercado_id BIGINT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    endereco VARCHAR(500),
    cidade VARCHAR(120),
    uf VARCHAR(2),
    cep VARCHAR(8),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    codigo_externo VARCHAR(100) NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_loja_mercado
        FOREIGN KEY (mercado_id)
        REFERENCES mercado(id),

    CONSTRAINT uk_loja_mercado_codigo
        UNIQUE (mercado_id, codigo_externo),

    CONSTRAINT chk_loja_latitude
        CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),

    CONSTRAINT chk_loja_longitude
        CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

-- vigente_ate NULL = vinculo corrente; o mesmo preco pode valer em varias lojas
CREATE TABLE preco_loja (
    id BIGSERIAL PRIMARY KEY,
    preco_id BIGINT NOT NULL,
    loja_id BIGINT NOT NULL,
    disponivel BOOLEAN NOT NULL DEFAULT TRUE,
    vigente_desde TIMESTAMP NOT NULL,
    vigente_ate TIMESTAMP,
    confirmado_em TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_preco_loja_preco
        FOREIGN KEY (preco_id)
        REFERENCES preco(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_preco_loja_loja
        FOREIGN KEY (loja_id)
        REFERENCES loja(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_preco_loja_vigencia
        CHECK (vigente_ate IS NULL OR vigente_ate >= vigente_desde)
);

-- Localizacao do usuario (opcional; LGPD: pode ser editada e excluida)
ALTER TABLE usuario ADD COLUMN cep VARCHAR(8) CHECK (cep IS NULL OR LENGTH(cep) = 8);
ALTER TABLE usuario ADD COLUMN cidade VARCHAR(120);
ALTER TABLE usuario ADD COLUMN uf VARCHAR(2);
ALTER TABLE usuario ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE usuario ADD COLUMN longitude DOUBLE PRECISION;
ALTER TABLE usuario ADD COLUMN loja_preferida_id BIGINT REFERENCES loja(id) ON DELETE SET NULL;

-- Promocao por loja (NULL = vale para a rede toda)
ALTER TABLE promocao ADD COLUMN loja_id BIGINT REFERENCES loja(id) ON DELETE CASCADE;

CREATE INDEX idx_loja_mercado ON loja(mercado_id);
CREATE INDEX idx_loja_lat_long ON loja(latitude, longitude);
CREATE INDEX idx_preco_loja_loja_vigente ON preco_loja(loja_id, vigente_ate);
CREATE INDEX idx_preco_loja_preco ON preco_loja(preco_id);
CREATE INDEX idx_promocao_loja ON promocao(loja_id);
CREATE INDEX idx_usuario_loja_preferida ON usuario(loja_preferida_id);
CREATE INDEX idx_produto_codigo_barras ON produto(codigo_barras);

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
