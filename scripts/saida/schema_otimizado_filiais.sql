-- SmartMarket Schema Otimizado com Agrupamento de Filiais
-- Gerado em: 2026-11-11T22:15:01.155315+00:00

CREATE TABLE IF NOT EXISTS produtos_canonicos (
    produto_id VARCHAR(150) PRIMARY KEY,
    nome_canonico VARCHAR(255) NOT NULL,
    marca VARCHAR(100),
    categoria VARCHAR(100),
    ean VARCHAR(20),
    imagem_url TEXT,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ofertas_agrupadas (
    oferta_id VARCHAR(150) PRIMARY KEY,
    produto_id VARCHAR(150) REFERENCES produtos_canonicos(produto_id),
    rede VARCHAR(100) NOT NULL,
    preco NUMERIC(10, 2) NOT NULL,
    preco_normal NUMERIC(10, 2),
    em_promocao BOOLEAN DEFAULT FALSE,
    filiais_ids TEXT[] NOT NULL,
    data_coleta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ofertas_prod_id ON ofertas_agrupadas(produto_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_rede ON ofertas_agrupadas(rede);
