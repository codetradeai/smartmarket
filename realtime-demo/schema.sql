-- Tabela da demonstração de live query (Neon Realtime).
-- Precisa de chave primária: é ela que dá a "identidade estável" da linha ao Realtime.
CREATE TABLE IF NOT EXISTS realtime_demo (
    id        BIGSERIAL   PRIMARY KEY,
    mensagem  TEXT        NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
