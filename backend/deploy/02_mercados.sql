-- ============================================================
-- SmartMarket — carga inicial de mercados (8 redes com scraper ativo)
-- Executar DEPOIS do 01_schema.sql.
-- Idempotente: o INSERT ignora linhas com o mesmo nome.
-- Os 530+ produtos chegam via pipeline do scraper ou via 03_carga.sql.
-- ============================================================

INSERT INTO mercado (nome, endereco, logo_url, ativo, created_at)
SELECT v.nome, v.endereco, v.logo_url, v.ativo, v.created_at
FROM (VALUES
    ('Fort Atacadista', 'Av. Assis Brasil, 2615, Porto Alegre, RS',  NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00'),
    ('Carrefour',       'Av. Ipiranga, 5300, Porto Alegre, RS',       NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00'),
    ('Zaffari',         'Av. Ipiranga, 1575, Porto Alegre, RS',       NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00'),
    ('Rissul',          'Av. Protásio Alves, 7000, Porto Alegre, RS', NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00'),
    ('Atacadão',        'Av. Presidente Vargas, 1000, Porto Alegre, RS', NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00'),
    ('Asun',            'Av. Cavalhada, 2200, Porto Alegre, RS',      NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00'),
    ('Stok',            'RS-020, km 5, Viamão, RS',                   NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00'),
    ('Master',          'Av. Nilo Peçanha, 2900, Porto Alegre, RS',   NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00')
) AS v(nome, endereco, logo_url, ativo, created_at)
WHERE NOT EXISTS (SELECT 1 FROM mercado m WHERE m.nome = v.nome);
