-- Metadados exclusivos da coleta. Somente CREATE; não altera tabelas da equipe.
-- Aplicar apenas em banco descartável smartmarket_fixture_* nesta entrega.
CREATE SCHEMA IF NOT EXISTS smartmarket_ingest;
CREATE TABLE IF NOT EXISTS smartmarket_ingest.source_store (
    source TEXT NOT NULL,
    store TEXT NOT NULL,
    mercado_id BIGINT NOT NULL REFERENCES mercado(id),
    PRIMARY KEY (source, store)
);
CREATE TABLE IF NOT EXISTS smartmarket_ingest.run (
    run_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    store TEXT NOT NULL,
    mercado_id BIGINT NOT NULL REFERENCES mercado(id),
    payload_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS smartmarket_ingest.source_product (
    source TEXT NOT NULL,
    store TEXT NOT NULL,
    external_id TEXT NOT NULL,
    produto_id BIGINT NOT NULL REFERENCES produto(id),
    source_signature TEXT NOT NULL,
    PRIMARY KEY (source, store, external_id)
);
CREATE TABLE IF NOT EXISTS smartmarket_ingest.event (
    source TEXT NOT NULL,
    store TEXT NOT NULL,
    external_id TEXT NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL,
    payload_hash TEXT NOT NULL,
    preco_id BIGINT NOT NULL REFERENCES preco(id),
    run_id TEXT NOT NULL REFERENCES smartmarket_ingest.run(run_id),
    PRIMARY KEY (source, store, external_id, collected_at)
);
