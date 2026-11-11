-- SmartMarket Schema Otimizado com Agrupamento de Filiais
-- Gerado em: 2026-11-11T22:52:37.101641+00:00

CREATE TABLE IF NOT EXISTS produtos_canonicos (
    produto_id VARCHAR(150) PRIMARY KEY,
    nome_canonico VARCHAR(255) NOT NULL,
    marca VARCHAR(100),
    categoria VARCHAR(100),
    imagem_url TEXT,
    ean VARCHAR(20),
    total_mercados INT DEFAULT 1,
    menor_preco DECIMAL(10, 2),
    maior_preco DECIMAL(10, 2),
    economia_maxima DECIMAL(10, 2),
    data_atualizacao TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ofertas_filiais (
    oferta_id VARCHAR(180) PRIMARY KEY,
    produto_id VARCHAR(150) REFERENCES produtos_canonicos(produto_id),
    rede VARCHAR(100) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    preco_normal DECIMAL(10, 2),
    em_promocao BOOLEAN DEFAULT FALSE,
    filiais_ids JSONB NOT NULL,
    data_coleta TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ofertas_produto ON ofertas_filiais(produto_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_rede ON ofertas_filiais(rede);
CREATE INDEX IF NOT EXISTS idx_ofertas_filiais_gin ON ofertas_filiais USING gin (filiais_ids);
