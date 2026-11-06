-- ============================================================
-- SmartMarket — carga inicial de mercados (8 redes com scraper ativo)
-- Executar DEPOIS do 01_schema.sql.
-- IDs explícitos idênticos aos da carga_completa_530_produtos.sql;
-- o 03_carga.sql usa subselect por nome, mas os IDs fixos eliminam
-- qualquer ambiguidade em banco vazio.
-- Idempotente: ON CONFLICT (id) não falha em re-execução.
-- Os 530 produtos chegam via 03_carga.sql.
-- ============================================================

INSERT INTO mercado (id, nome, endereco, logo_url, ativo)
VALUES
    (1, 'Fort Atacadista',       'Av. Assis Brasil, 2615, Porto Alegre, RS',         NULL, TRUE),
    (2, 'Carrefour Mercado',     'Av. Ipiranga, 5300, Porto Alegre, RS',              NULL, TRUE),
    (3, 'Asun Supermercados',    'Av. Cavalhada, 2200, Porto Alegre, RS',             NULL, TRUE),
    (4, 'Atacadão',              'Av. Presidente Vargas, 1000, Porto Alegre, RS',     NULL, TRUE),
    (5, 'Master Supermercados',  'Av. Nilo Peçanha, 2900, Porto Alegre, RS',          NULL, TRUE),
    (6, 'Zaffari / Bourbon',     'Av. Ipiranga, 1575, Porto Alegre, RS',              NULL, TRUE),
    (7, 'Supermercados Rissul',  'Av. Protásio Alves, 7000, Porto Alegre, RS',        NULL, TRUE),
    (8, 'Stok Center',           'RS-020, km 5, Viamão, RS',                          NULL, TRUE)
ON CONFLICT (id) DO UPDATE
    SET nome     = EXCLUDED.nome,
        endereco = EXCLUDED.endereco;

SELECT setval(pg_get_serial_sequence('mercado', 'id'), COALESCE((SELECT MAX(id) FROM mercado), 0));
