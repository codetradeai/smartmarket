-- =========================================================================
-- SmartMarket - Schema DDL Otimizado de Filiais e Ofertas Desduplicadas
-- PostgreSQL 15+ / Neon Database
-- =========================================================================

-- 1. Tabela de Filiais Físicas Georreferenciadas
CREATE TABLE IF NOT EXISTS filial (
    id VARCHAR(64) PRIMARY KEY,
    rede_id INTEGER NOT NULL,
    rede VARCHAR(64) NOT NULL,
    nome_filial VARCHAR(128) NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    cidade VARCHAR(64) NOT NULL,
    uf VARCHAR(2) NOT NULL DEFAULT 'RS',
    cep_base VARCHAR(10) NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    parametros_scraping JSONB,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_filial_cidade ON filial(cidade);
CREATE INDEX IF NOT EXISTS idx_filial_geo ON filial(latitude, longitude);

-- 2. Tabela de Produtos Canônicos (Zero Duplicação)
CREATE TABLE IF NOT EXISTS produto_canonico (
    id VARCHAR(128) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    marca VARCHAR(64),
    categoria VARCHAR(64) NOT NULL,
    imagem_url TEXT,
    ean VARCHAR(14),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_produto_categoria ON produto_canonico(categoria);

-- 3. Tabela de Ofertas Agrupadas (1 registro por preço compartilhado)
CREATE TABLE IF NOT EXISTS oferta_agrupada (
    id VARCHAR(128) PRIMARY KEY,
    produto_id VARCHAR(128) NOT NULL REFERENCES produto_canonico(id) ON DELETE CASCADE,
    rede VARCHAR(64) NOT NULL,
    preco NUMERIC(10, 2) NOT NULL,
    preco_normal NUMERIC(10, 2),
    em_promocao BOOLEAN NOT NULL DEFAULT FALSE,
    coletado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oferta_produto ON oferta_agrupada(produto_id);
CREATE INDEX IF NOT EXISTS idx_oferta_preco ON oferta_agrupada(preco);

-- 4. Tabela Associativa Oferta <-> Filiais (N:N)
CREATE TABLE IF NOT EXISTS oferta_filial (
    oferta_id VARCHAR(128) NOT NULL REFERENCES oferta_agrupada(id) ON DELETE CASCADE,
    filial_id VARCHAR(64) NOT NULL REFERENCES filial(id) ON DELETE CASCADE,
    PRIMARY KEY (oferta_id, filial_id)
);

CREATE INDEX IF NOT EXISTS idx_oferta_filial_fid ON oferta_filial(filial_id);
