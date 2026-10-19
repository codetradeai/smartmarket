-- SmartMarket — massa inicial para o perfil dev
-- Banco: PostgreSQL. Idempotente: pode rodar de novo sem duplicar linha.
--
-- Escopo: 3 mercados, 30 produtos, 3 observacoes de preco (270 linhas).
-- Linhagem:
--   coleta-fort
--     preco real de scraper/produtos_coletados.json em 2026-09-07, somente Fort Atacadista.
--   seed-historico
--     cenario de teste. Nao e coleta. Desloca o preco real do Fort para 2026-08-24 e 2026-09-21.
--   seed-comparativo
--     cenario de teste para Carrefour e Big Bompreco. Nao ha coleta dessas redes no repositorio.
--
-- Carrefour fica de 6,5 a 10,5 pontos percentuais acima do Fort na mesma data.
-- Big Bompreco fica de 2,5 a 5,5 pontos percentuais acima do Fort na mesma data.
-- Duas rupturas sinteticas em 2026-09-21 no Big Bompreco:
--   - Feijão Preto Caldão 1kg
--   - Leite em Pó Piracanjuba Integral Lata 300g
-- codigo_barras fica nulo: o arquivo de coleta nao traz EAN.
-- Usuarios locais do perfil dev, com senha em BCrypt. Nao usar fora da maquina de desenvolvimento.

BEGIN;

-- ----------------------------------------------------------------
-- Mercados
-- ----------------------------------------------------------------
INSERT INTO mercado (nome, endereco, logo_url, ativo, created_at)
SELECT v.nome, v.endereco, v.logo_url, v.ativo, v.created_at
FROM (VALUES
    ('Fort Atacadista', 'Av. Assis Brasil, 2615, Porto Alegre, RS', NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00'),
    ('Carrefour', 'Av. Ipiranga, 5300, Porto Alegre, RS', NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00'),
    ('Big Bompreço', 'Av. Bento Gonçalves, 3200, Porto Alegre, RS', NULL::varchar, TRUE, TIMESTAMP '2026-09-01 10:00:00')
) AS v(nome, endereco, logo_url, ativo, created_at)
WHERE NOT EXISTS (SELECT 1 FROM mercado m WHERE m.nome = v.nome);

-- ----------------------------------------------------------------
-- Produtos (30 itens com embalagem simples na coleta do Fort)
-- ----------------------------------------------------------------
INSERT INTO produto (
    nome, nome_normalizado, marca, quantidade, unidade, codigo_barras, categoria, created_at
)
SELECT
    v.nome, v.nome_normalizado, v.marca, v.quantidade, v.unidade,
    v.codigo_barras, v.categoria, v.created_at
FROM (VALUES
    ('Arroz Branco Tio Urbano Tipo 1 com 1kg', 'arroz branco tio urbano tipo 1 com 1kg', 'Urbano', 1.000::double precision, 'kg', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Milho para Pipoca Juréia 400g', 'milho para pipoca jureia 400g', 'Jureia', 400.000::double precision, 'g', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Arroz Branco Catarinão 1kg', 'arroz branco catarinao 1kg', 'Catarinão', 1.000::double precision, 'kg', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Milho Verde Quero Lata 170g', 'milho verde quero lata 170g', 'Quero', 170.000::double precision, 'g', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Arroz Parboilizado Buriti Tipo 1 5kg', 'arroz parboilizado buriti tipo 1 5kg', 'Buriti', 5.000::double precision, 'kg', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Feijão Preto Caldão 1kg', 'feijao preto caldao 1kg', 'Caldão', 1.000::double precision, 'kg', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Feijão Carioca Caldão 1kg', 'feijao carioca caldao 1kg', 'Caldão', 1.000::double precision, 'kg', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Arroz Branco Prato Fino Tipo 1 com 5kg', 'arroz branco prato fino tipo 1 com 5kg', 'Prato Fino', 5.000::double precision, 'kg', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Arroz Arbório Caldo Bom Tipo 1 Seleção Especial 500g', 'arroz arborio caldo bom tipo 1 selecao especial 500g', 'Caldo Bom', 500.000::double precision, 'g', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Ervilha Quero Lata 170g', 'ervilha quero lata 170g', 'Quero', 170.000::double precision, 'g', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Milho para Pipoca Caldão Premium 400g', 'milho para pipoca caldao premium 400g', 'Caldão', 400.000::double precision, 'g', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Ervilha Seara Nature Congelada 300g', 'ervilha seara nature congelada 300g', 'Seara', 300.000::double precision, 'g', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Feijão Preto Mãe Véia 1kg', 'feijao preto mae veia 1kg', 'Mae Veia', 1.000::double precision, 'kg', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Arroz Parboilizado Tio Urbano Tipo 1 com 1kg', 'arroz parboilizado tio urbano tipo 1 com 1kg', 'Urbano', 1.000::double precision, 'kg', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Arroz Branco Urbano 1kg', 'arroz branco urbano 1kg', 'Urbano', 1.000::double precision, 'kg', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Arroz Parboilizado Catarinão 1kg', 'arroz parboilizado catarinao 1kg', 'Catarinão', 1.000::double precision, 'kg', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Canjiquinha Yoki 500g', 'canjiquinha yoki 500g', 'Yoki', 500.000::double precision, 'g', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Pipoca para Micro-ondas Yoki Cheddar com Sal 95g', 'pipoca para micro-ondas yoki cheddar com sal 95g', 'Yoki', 95.000::double precision, 'g', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Pipoca Pronta Amorita Caramelo 115g', 'pipoca pronta amorita caramelo 115g', 'Amorita', 115.000::double precision, 'g', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Pipoca Doce Amorita Ninho Trufada 115g', 'pipoca doce amorita ninho trufada 115g', 'Amorita', 115.000::double precision, 'g', NULL::varchar, 'Grãos, Arroz e Feijão', TIMESTAMP '2026-09-07 19:06:25'),
    ('Leite Condensado Semidesnatado Piracanjuba 395g', 'leite condensado semidesnatado piracanjuba 395g', 'Piracanjuba', 395.000::double precision, 'g', NULL::varchar, 'Leites e Derivados', TIMESTAMP '2026-09-07 19:06:25'),
    ('Leite UHT Semidesnatado Zero Lactose Tirol Biociclos + Proteína 1L', 'leite uht semidesnatado zero lactose tirol biociclos + proteina 1l', 'Tirol', 1.000::double precision, 'L', NULL::varchar, 'Leites e Derivados', TIMESTAMP '2026-09-07 19:06:25'),
    ('Leite Fermentado Frutap 1,2kg', 'leite fermentado frutap 1,2kg', 'Frutap', 1.200::double precision, 'kg', NULL::varchar, 'Leites e Derivados', TIMESTAMP '2026-09-07 19:06:25'),
    ('Leite Tirol Zero Lactose Integral 1L', 'leite tirol zero lactose integral 1l', 'Tirol', 1.000::double precision, 'L', NULL::varchar, 'Leites e Derivados', TIMESTAMP '2026-09-07 19:06:25'),
    ('Bebida de Amêndoas Nuts Zero Açúcar Original 1L', 'bebida de amendoas nuts zero acucar original 1l', 'Nuts', 1.000::double precision, 'L', NULL::varchar, 'Leites e Derivados', TIMESTAMP '2026-09-07 19:06:25'),
    ('Leite em Pó Piracanjuba Integral Lata 300g', 'leite em po piracanjuba integral lata 300g', 'Piracanjuba', 300.000::double precision, 'g', NULL::varchar, 'Leites e Derivados', TIMESTAMP '2026-09-07 19:06:25'),
    ('Bebida Láctea Starbucks Frappuccino 280ml', 'bebida lactea starbucks frappuccino 280ml', 'Starbucks', 280.000::double precision, 'ml', NULL::varchar, 'Leites e Derivados', TIMESTAMP '2026-09-07 19:06:25'),
    ('Leite em Pó Ninho Adulto Lata 350g', 'leite em po ninho adulto lata 350g', 'Ninho', 350.000::double precision, 'g', NULL::varchar, 'Leites e Derivados', TIMESTAMP '2026-09-07 19:06:25'),
    ('Leite UHT Desnatado Zero Lactose Batavo Caixinha 1L', 'leite uht desnatado zero lactose batavo caixinha 1l', 'Batavo', 1.000::double precision, 'L', NULL::varchar, 'Leites e Derivados', TIMESTAMP '2026-09-07 19:06:25'),
    ('Molico Zero Lactose Lata 260g', 'molico zero lactose lata 260g', 'Molico', 260.000::double precision, 'g', NULL::varchar, 'Leites e Derivados', TIMESTAMP '2026-09-07 19:06:25')
) AS v(nome, nome_normalizado, marca, quantidade, unidade, codigo_barras, categoria, created_at)
WHERE NOT EXISTS (
    SELECT 1 FROM produto p
    WHERE p.nome = v.nome AND p.marca IS NOT DISTINCT FROM v.marca
);

-- ----------------------------------------------------------------
-- Precos: 30 produtos x 3 mercados x 3 datas
-- ----------------------------------------------------------------
INSERT INTO preco (
    produto_id, mercado_id, valor, coletado_em, origem, nome_bruto, disponivel, created_at
)
SELECT
    p.id, m.id, s.valor, s.coletado_em, s.origem, s.nome_bruto, s.disponivel, s.coletado_em
FROM (VALUES
    ('Arroz Branco Tio Urbano Tipo 1 com 1kg', 'Fort Atacadista', 4.96, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Arroz Branco Tio Urbano Tipo 1 com 1kg', 'Fort Atacadista', 4.79, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Arroz Branco Tio Urbano Tipo 1 com 1kg', 'Fort Atacadista', 4.72, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Arroz Branco Tio Urbano Tipo 1 com 1kg', 'Carrefour', 5.28, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Tio Urbano Tipo 1 com 1kg', 'Carrefour', 5.10, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Tio Urbano Tipo 1 com 1kg', 'Carrefour', 5.03, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Tio Urbano Tipo 1 com 1kg', 'Big Bompreço', 5.08, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Tio Urbano Tipo 1 com 1kg', 'Big Bompreço', 4.91, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Tio Urbano Tipo 1 com 1kg', 'Big Bompreço', 4.84, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Juréia 400g', 'Fort Atacadista', 3.82, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Milho para Pipoca Juréia 400g', 'Fort Atacadista', 3.69, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Milho para Pipoca Juréia 400g', 'Fort Atacadista', 3.75, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Milho para Pipoca Juréia 400g', 'Carrefour', 4.11, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Juréia 400g', 'Carrefour', 3.97, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Juréia 400g', 'Carrefour', 4.03, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Juréia 400g', 'Big Bompreço', 4.03, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Juréia 400g', 'Big Bompreço', 3.89, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Juréia 400g', 'Big Bompreço', 3.96, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Catarinão 1kg', 'Fort Atacadista', 2.92, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Arroz Branco Catarinão 1kg', 'Fort Atacadista', 2.82, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Arroz Branco Catarinão 1kg', 'Fort Atacadista', 2.86, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Arroz Branco Catarinão 1kg', 'Carrefour', 3.17, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Catarinão 1kg', 'Carrefour', 3.06, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Catarinão 1kg', 'Carrefour', 3.10, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Catarinão 1kg', 'Big Bompreço', 3.05, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Catarinão 1kg', 'Big Bompreço', 2.95, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Catarinão 1kg', 'Big Bompreço', 2.99, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Milho Verde Quero Lata 170g', 'Fort Atacadista', 4.34, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Milho Verde Quero Lata 170g', 'Fort Atacadista', 4.19, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Milho Verde Quero Lata 170g', 'Fort Atacadista', 4.25, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Milho Verde Quero Lata 170g', 'Carrefour', 4.75, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Milho Verde Quero Lata 170g', 'Carrefour', 4.59, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Milho Verde Quero Lata 170g', 'Carrefour', 4.65, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Milho Verde Quero Lata 170g', 'Big Bompreço', 4.49, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Milho Verde Quero Lata 170g', 'Big Bompreço', 4.34, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Milho Verde Quero Lata 170g', 'Big Bompreço', 4.40, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Buriti Tipo 1 5kg', 'Fort Atacadista', 12.26, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Arroz Parboilizado Buriti Tipo 1 5kg', 'Fort Atacadista', 11.85, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Arroz Parboilizado Buriti Tipo 1 5kg', 'Fort Atacadista', 11.67, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Arroz Parboilizado Buriti Tipo 1 5kg', 'Carrefour', 13.55, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Buriti Tipo 1 5kg', 'Carrefour', 13.09, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Buriti Tipo 1 5kg', 'Carrefour', 12.90, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Buriti Tipo 1 5kg', 'Big Bompreço', 12.57, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Buriti Tipo 1 5kg', 'Big Bompreço', 12.15, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Buriti Tipo 1 5kg', 'Big Bompreço', 11.96, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Caldão 1kg', 'Fort Atacadista', 6.20, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Feijão Preto Caldão 1kg', 'Fort Atacadista', 5.99, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Feijão Preto Caldão 1kg', 'Fort Atacadista', 6.08, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Feijão Preto Caldão 1kg', 'Carrefour', 6.60, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Caldão 1kg', 'Carrefour', 6.38, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Caldão 1kg', 'Carrefour', 6.48, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Caldão 1kg', 'Big Bompreço', 6.54, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Caldão 1kg', 'Big Bompreço', 6.32, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Caldão 1kg', 'Big Bompreço', 6.41, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', FALSE),
    ('Feijão Carioca Caldão 1kg', 'Fort Atacadista', 10.34, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Feijão Carioca Caldão 1kg', 'Fort Atacadista', 9.99, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Feijão Carioca Caldão 1kg', 'Fort Atacadista', 10.14, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Feijão Carioca Caldão 1kg', 'Carrefour', 11.12, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Carioca Caldão 1kg', 'Carrefour', 10.74, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Carioca Caldão 1kg', 'Carrefour', 10.90, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Carioca Caldão 1kg', 'Big Bompreço', 10.81, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Carioca Caldão 1kg', 'Big Bompreço', 10.44, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Carioca Caldão 1kg', 'Big Bompreço', 10.60, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Prato Fino Tipo 1 com 5kg', 'Fort Atacadista', 21.71, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Arroz Branco Prato Fino Tipo 1 com 5kg', 'Fort Atacadista', 20.98, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Arroz Branco Prato Fino Tipo 1 com 5kg', 'Fort Atacadista', 21.29, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Arroz Branco Prato Fino Tipo 1 com 5kg', 'Carrefour', 23.56, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Prato Fino Tipo 1 com 5kg', 'Carrefour', 22.76, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Prato Fino Tipo 1 com 5kg', 'Carrefour', 23.10, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Prato Fino Tipo 1 com 5kg', 'Big Bompreço', 22.47, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Prato Fino Tipo 1 com 5kg', 'Big Bompreço', 21.71, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Prato Fino Tipo 1 com 5kg', 'Big Bompreço', 22.04, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Arbório Caldo Bom Tipo 1 Seleção Especial 500g', 'Fort Atacadista', 12.41, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Arroz Arbório Caldo Bom Tipo 1 Seleção Especial 500g', 'Fort Atacadista', 11.99, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Arroz Arbório Caldo Bom Tipo 1 Seleção Especial 500g', 'Fort Atacadista', 11.81, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Arroz Arbório Caldo Bom Tipo 1 Seleção Especial 500g', 'Carrefour', 13.59, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Arbório Caldo Bom Tipo 1 Seleção Especial 500g', 'Carrefour', 13.13, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Arbório Caldo Bom Tipo 1 Seleção Especial 500g', 'Carrefour', 12.93, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Arbório Caldo Bom Tipo 1 Seleção Especial 500g', 'Big Bompreço', 12.72, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Arbório Caldo Bom Tipo 1 Seleção Especial 500g', 'Big Bompreço', 12.29, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Arbório Caldo Bom Tipo 1 Seleção Especial 500g', 'Big Bompreço', 12.11, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Quero Lata 170g', 'Fort Atacadista', 4.54, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Ervilha Quero Lata 170g', 'Fort Atacadista', 4.39, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Ervilha Quero Lata 170g', 'Fort Atacadista', 4.46, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Ervilha Quero Lata 170g', 'Carrefour', 5.02, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Quero Lata 170g', 'Carrefour', 4.85, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Quero Lata 170g', 'Carrefour', 4.93, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Quero Lata 170g', 'Big Bompreço', 4.79, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Quero Lata 170g', 'Big Bompreço', 4.63, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Quero Lata 170g', 'Big Bompreço', 4.71, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Caldão Premium 400g', 'Fort Atacadista', 3.82, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Milho para Pipoca Caldão Premium 400g', 'Fort Atacadista', 3.69, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Milho para Pipoca Caldão Premium 400g', 'Fort Atacadista', 3.75, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Milho para Pipoca Caldão Premium 400g', 'Carrefour', 4.07, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Caldão Premium 400g', 'Carrefour', 3.93, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Caldão Premium 400g', 'Carrefour', 3.99, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Caldão Premium 400g', 'Big Bompreço', 3.99, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Caldão Premium 400g', 'Big Bompreço', 3.86, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Milho para Pipoca Caldão Premium 400g', 'Big Bompreço', 3.92, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Seara Nature Congelada 300g', 'Fort Atacadista', 7.23, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Ervilha Seara Nature Congelada 300g', 'Fort Atacadista', 6.99, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Ervilha Seara Nature Congelada 300g', 'Fort Atacadista', 7.09, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Ervilha Seara Nature Congelada 300g', 'Carrefour', 7.77, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Seara Nature Congelada 300g', 'Carrefour', 7.51, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Seara Nature Congelada 300g', 'Carrefour', 7.62, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Seara Nature Congelada 300g', 'Big Bompreço', 7.48, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Seara Nature Congelada 300g', 'Big Bompreço', 7.23, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Ervilha Seara Nature Congelada 300g', 'Big Bompreço', 7.34, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Mãe Véia 1kg', 'Fort Atacadista', 4.64, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Feijão Preto Mãe Véia 1kg', 'Fort Atacadista', 4.48, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Feijão Preto Mãe Véia 1kg', 'Fort Atacadista', 4.41, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Feijão Preto Mãe Véia 1kg', 'Carrefour', 5.03, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Mãe Véia 1kg', 'Carrefour', 4.86, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Mãe Véia 1kg', 'Carrefour', 4.78, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Mãe Véia 1kg', 'Big Bompreço', 4.76, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Mãe Véia 1kg', 'Big Bompreço', 4.59, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Feijão Preto Mãe Véia 1kg', 'Big Bompreço', 4.52, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Tio Urbano Tipo 1 com 1kg', 'Fort Atacadista', 4.13, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Arroz Parboilizado Tio Urbano Tipo 1 com 1kg', 'Fort Atacadista', 3.99, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Arroz Parboilizado Tio Urbano Tipo 1 com 1kg', 'Fort Atacadista', 4.05, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Arroz Parboilizado Tio Urbano Tipo 1 com 1kg', 'Carrefour', 4.52, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Tio Urbano Tipo 1 com 1kg', 'Carrefour', 4.37, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Tio Urbano Tipo 1 com 1kg', 'Carrefour', 4.43, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Tio Urbano Tipo 1 com 1kg', 'Big Bompreço', 4.36, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Tio Urbano Tipo 1 com 1kg', 'Big Bompreço', 4.21, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Tio Urbano Tipo 1 com 1kg', 'Big Bompreço', 4.27, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Urbano 1kg', 'Fort Atacadista', 5.30, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Arroz Branco Urbano 1kg', 'Fort Atacadista', 5.12, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Arroz Branco Urbano 1kg', 'Fort Atacadista', 5.20, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Arroz Branco Urbano 1kg', 'Carrefour', 5.86, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Urbano 1kg', 'Carrefour', 5.66, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Urbano 1kg', 'Carrefour', 5.75, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Urbano 1kg', 'Big Bompreço', 5.54, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Urbano 1kg', 'Big Bompreço', 5.35, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Branco Urbano 1kg', 'Big Bompreço', 5.43, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Catarinão 1kg', 'Fort Atacadista', 2.35, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Arroz Parboilizado Catarinão 1kg', 'Fort Atacadista', 2.27, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Arroz Parboilizado Catarinão 1kg', 'Fort Atacadista', 2.30, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Arroz Parboilizado Catarinão 1kg', 'Carrefour', 2.50, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Catarinão 1kg', 'Carrefour', 2.42, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Catarinão 1kg', 'Carrefour', 2.45, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Catarinão 1kg', 'Big Bompreço', 2.43, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Catarinão 1kg', 'Big Bompreço', 2.35, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Arroz Parboilizado Catarinão 1kg', 'Big Bompreço', 2.38, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Canjiquinha Yoki 500g', 'Fort Atacadista', 6.20, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Canjiquinha Yoki 500g', 'Fort Atacadista', 5.99, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Canjiquinha Yoki 500g', 'Fort Atacadista', 5.90, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Canjiquinha Yoki 500g', 'Carrefour', 6.67, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Canjiquinha Yoki 500g', 'Carrefour', 6.44, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Canjiquinha Yoki 500g', 'Carrefour', 6.34, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Canjiquinha Yoki 500g', 'Big Bompreço', 6.36, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Canjiquinha Yoki 500g', 'Big Bompreço', 6.14, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Canjiquinha Yoki 500g', 'Big Bompreço', 6.05, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca para Micro-ondas Yoki Cheddar com Sal 95g', 'Fort Atacadista', 7.23, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Pipoca para Micro-ondas Yoki Cheddar com Sal 95g', 'Fort Atacadista', 6.99, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Pipoca para Micro-ondas Yoki Cheddar com Sal 95g', 'Fort Atacadista', 7.09, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Pipoca para Micro-ondas Yoki Cheddar com Sal 95g', 'Carrefour', 7.84, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca para Micro-ondas Yoki Cheddar com Sal 95g', 'Carrefour', 7.58, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca para Micro-ondas Yoki Cheddar com Sal 95g', 'Carrefour', 7.69, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca para Micro-ondas Yoki Cheddar com Sal 95g', 'Big Bompreço', 7.63, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca para Micro-ondas Yoki Cheddar com Sal 95g', 'Big Bompreço', 7.37, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca para Micro-ondas Yoki Cheddar com Sal 95g', 'Big Bompreço', 7.48, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Pronta Amorita Caramelo 115g', 'Fort Atacadista', 8.18, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Pipoca Pronta Amorita Caramelo 115g', 'Fort Atacadista', 7.90, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Pipoca Pronta Amorita Caramelo 115g', 'Fort Atacadista', 8.02, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Pipoca Pronta Amorita Caramelo 115g', 'Carrefour', 8.96, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Pronta Amorita Caramelo 115g', 'Carrefour', 8.65, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Pronta Amorita Caramelo 115g', 'Carrefour', 8.78, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Pronta Amorita Caramelo 115g', 'Big Bompreço', 8.55, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Pronta Amorita Caramelo 115g', 'Big Bompreço', 8.26, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Pronta Amorita Caramelo 115g', 'Big Bompreço', 8.38, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Doce Amorita Ninho Trufada 115g', 'Fort Atacadista', 8.18, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Pipoca Doce Amorita Ninho Trufada 115g', 'Fort Atacadista', 7.90, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Pipoca Doce Amorita Ninho Trufada 115g', 'Fort Atacadista', 8.02, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Pipoca Doce Amorita Ninho Trufada 115g', 'Carrefour', 9.04, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Doce Amorita Ninho Trufada 115g', 'Carrefour', 8.73, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Doce Amorita Ninho Trufada 115g', 'Carrefour', 8.86, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Doce Amorita Ninho Trufada 115g', 'Big Bompreço', 8.47, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Doce Amorita Ninho Trufada 115g', 'Big Bompreço', 8.18, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Pipoca Doce Amorita Ninho Trufada 115g', 'Big Bompreço', 8.30, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Condensado Semidesnatado Piracanjuba 395g', 'Fort Atacadista', 4.64, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Leite Condensado Semidesnatado Piracanjuba 395g', 'Fort Atacadista', 4.48, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Leite Condensado Semidesnatado Piracanjuba 395g', 'Fort Atacadista', 4.41, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Leite Condensado Semidesnatado Piracanjuba 395g', 'Carrefour', 4.94, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Condensado Semidesnatado Piracanjuba 395g', 'Carrefour', 4.77, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Condensado Semidesnatado Piracanjuba 395g', 'Carrefour', 4.70, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Condensado Semidesnatado Piracanjuba 395g', 'Big Bompreço', 4.76, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Condensado Semidesnatado Piracanjuba 395g', 'Big Bompreço', 4.59, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Condensado Semidesnatado Piracanjuba 395g', 'Big Bompreço', 4.52, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Semidesnatado Zero Lactose Tirol Biociclos + Proteína 1L', 'Fort Atacadista', 9.29, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Leite UHT Semidesnatado Zero Lactose Tirol Biociclos + Proteína 1L', 'Fort Atacadista', 8.98, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Leite UHT Semidesnatado Zero Lactose Tirol Biociclos + Proteína 1L', 'Fort Atacadista', 9.11, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Leite UHT Semidesnatado Zero Lactose Tirol Biociclos + Proteína 1L', 'Carrefour', 9.99, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Semidesnatado Zero Lactose Tirol Biociclos + Proteína 1L', 'Carrefour', 9.65, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Semidesnatado Zero Lactose Tirol Biociclos + Proteína 1L', 'Carrefour', 9.79, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Semidesnatado Zero Lactose Tirol Biociclos + Proteína 1L', 'Big Bompreço', 9.80, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Semidesnatado Zero Lactose Tirol Biociclos + Proteína 1L', 'Big Bompreço', 9.47, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Semidesnatado Zero Lactose Tirol Biociclos + Proteína 1L', 'Big Bompreço', 9.61, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Fermentado Frutap 1,2kg', 'Fort Atacadista', 12.93, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Leite Fermentado Frutap 1,2kg', 'Fort Atacadista', 12.49, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Leite Fermentado Frutap 1,2kg', 'Fort Atacadista', 12.68, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Leite Fermentado Frutap 1,2kg', 'Carrefour', 14.03, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Fermentado Frutap 1,2kg', 'Carrefour', 13.55, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Fermentado Frutap 1,2kg', 'Carrefour', 13.76, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Fermentado Frutap 1,2kg', 'Big Bompreço', 13.51, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Fermentado Frutap 1,2kg', 'Big Bompreço', 13.05, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Fermentado Frutap 1,2kg', 'Big Bompreço', 13.25, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Tirol Zero Lactose Integral 1L', 'Fort Atacadista', 6.19, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Leite Tirol Zero Lactose Integral 1L', 'Fort Atacadista', 5.98, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Leite Tirol Zero Lactose Integral 1L', 'Fort Atacadista', 6.07, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Leite Tirol Zero Lactose Integral 1L', 'Carrefour', 6.78, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Tirol Zero Lactose Integral 1L', 'Carrefour', 6.55, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Tirol Zero Lactose Integral 1L', 'Carrefour', 6.65, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Tirol Zero Lactose Integral 1L', 'Big Bompreço', 6.41, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Tirol Zero Lactose Integral 1L', 'Big Bompreço', 6.19, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite Tirol Zero Lactose Integral 1L', 'Big Bompreço', 6.28, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida de Amêndoas Nuts Zero Açúcar Original 1L', 'Fort Atacadista', 11.28, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Bebida de Amêndoas Nuts Zero Açúcar Original 1L', 'Fort Atacadista', 10.90, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Bebida de Amêndoas Nuts Zero Açúcar Original 1L', 'Fort Atacadista', 10.74, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Bebida de Amêndoas Nuts Zero Açúcar Original 1L', 'Carrefour', 12.46, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida de Amêndoas Nuts Zero Açúcar Original 1L', 'Carrefour', 12.04, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida de Amêndoas Nuts Zero Açúcar Original 1L', 'Carrefour', 11.87, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida de Amêndoas Nuts Zero Açúcar Original 1L', 'Big Bompreço', 11.56, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida de Amêndoas Nuts Zero Açúcar Original 1L', 'Big Bompreço', 11.17, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida de Amêndoas Nuts Zero Açúcar Original 1L', 'Big Bompreço', 11.01, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Piracanjuba Integral Lata 300g', 'Fort Atacadista', 19.65, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Leite em Pó Piracanjuba Integral Lata 300g', 'Fort Atacadista', 18.99, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Leite em Pó Piracanjuba Integral Lata 300g', 'Fort Atacadista', 19.27, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Leite em Pó Piracanjuba Integral Lata 300g', 'Carrefour', 20.93, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Piracanjuba Integral Lata 300g', 'Carrefour', 20.22, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Piracanjuba Integral Lata 300g', 'Carrefour', 20.52, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Piracanjuba Integral Lata 300g', 'Big Bompreço', 20.73, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Piracanjuba Integral Lata 300g', 'Big Bompreço', 20.03, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Piracanjuba Integral Lata 300g', 'Big Bompreço', 20.33, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', FALSE),
    ('Bebida Láctea Starbucks Frappuccino 280ml', 'Fort Atacadista', 10.33, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Bebida Láctea Starbucks Frappuccino 280ml', 'Fort Atacadista', 9.98, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Bebida Láctea Starbucks Frappuccino 280ml', 'Fort Atacadista', 10.13, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Bebida Láctea Starbucks Frappuccino 280ml', 'Carrefour', 11.10, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida Láctea Starbucks Frappuccino 280ml', 'Carrefour', 10.73, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida Láctea Starbucks Frappuccino 280ml', 'Carrefour', 10.89, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida Láctea Starbucks Frappuccino 280ml', 'Big Bompreço', 10.79, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida Láctea Starbucks Frappuccino 280ml', 'Big Bompreço', 10.43, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Bebida Láctea Starbucks Frappuccino 280ml', 'Big Bompreço', 10.59, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Ninho Adulto Lata 350g', 'Fort Atacadista', 28.97, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Leite em Pó Ninho Adulto Lata 350g', 'Fort Atacadista', 27.99, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Leite em Pó Ninho Adulto Lata 350g', 'Fort Atacadista', 28.41, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Leite em Pó Ninho Adulto Lata 350g', 'Carrefour', 31.43, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Ninho Adulto Lata 350g', 'Carrefour', 30.37, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Ninho Adulto Lata 350g', 'Carrefour', 30.82, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Ninho Adulto Lata 350g', 'Big Bompreço', 29.98, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Ninho Adulto Lata 350g', 'Big Bompreço', 28.97, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite em Pó Ninho Adulto Lata 350g', 'Big Bompreço', 29.40, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Desnatado Zero Lactose Batavo Caixinha 1L', 'Fort Atacadista', 5.67, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Leite UHT Desnatado Zero Lactose Batavo Caixinha 1L', 'Fort Atacadista', 5.48, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Leite UHT Desnatado Zero Lactose Batavo Caixinha 1L', 'Fort Atacadista', 5.40, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Leite UHT Desnatado Zero Lactose Batavo Caixinha 1L', 'Carrefour', 6.21, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Desnatado Zero Lactose Batavo Caixinha 1L', 'Carrefour', 6.00, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Desnatado Zero Lactose Batavo Caixinha 1L', 'Carrefour', 5.91, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Desnatado Zero Lactose Batavo Caixinha 1L', 'Big Bompreço', 5.81, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Desnatado Zero Lactose Batavo Caixinha 1L', 'Big Bompreço', 5.62, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Leite UHT Desnatado Zero Lactose Batavo Caixinha 1L', 'Big Bompreço', 5.54, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Molico Zero Lactose Lata 260g', 'Fort Atacadista', 30.00, TIMESTAMP '2026-08-24 19:06:25', 'seed-historico', TRUE),
    ('Molico Zero Lactose Lata 260g', 'Fort Atacadista', 28.99, TIMESTAMP '2026-09-07 19:06:25', 'coleta-fort', TRUE),
    ('Molico Zero Lactose Lata 260g', 'Fort Atacadista', 29.42, TIMESTAMP '2026-09-21 19:06:25', 'seed-historico', TRUE),
    ('Molico Zero Lactose Lata 260g', 'Carrefour', 33.15, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Molico Zero Lactose Lata 260g', 'Carrefour', 32.03, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Molico Zero Lactose Lata 260g', 'Carrefour', 32.51, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE),
    ('Molico Zero Lactose Lata 260g', 'Big Bompreço', 31.65, TIMESTAMP '2026-08-24 19:06:25', 'seed-comparativo', TRUE),
    ('Molico Zero Lactose Lata 260g', 'Big Bompreço', 30.58, TIMESTAMP '2026-09-07 19:06:25', 'seed-comparativo', TRUE),
    ('Molico Zero Lactose Lata 260g', 'Big Bompreço', 31.04, TIMESTAMP '2026-09-21 19:06:25', 'seed-comparativo', TRUE)
) AS s(nome_produto, nome_mercado, valor, coletado_em, origem, disponivel)
JOIN produto p ON p.nome = s.nome_produto
JOIN mercado m ON m.nome = s.nome_mercado
WHERE NOT EXISTS (
    SELECT 1 FROM preco pr
    WHERE pr.produto_id = p.id
      AND pr.mercado_id = m.id
      AND pr.coletado_em = s.coletado_em
);

-- ----------------------------------------------------------------
-- Usuarios locais. Hash BCrypt (custo 10) de admin123 e user123.
-- ----------------------------------------------------------------
INSERT INTO usuario (nome, email, senha, papel, created_at)
SELECT v.nome, v.email, v.senha, v.papel, v.created_at
FROM (VALUES
    ('Davi Souza', 'davi@smartmarket.com.br', '$2a$10$hr7SWFVKWjsm6qT8q5GD2uimdeYw19qRtm8vgLdFRXB87dsyqfy9S', 'ADMIN', TIMESTAMP '2026-09-01 10:00:00'),
    ('Maria Santos', 'maria@email.com', '$2a$10$oNro0K0sDQ4Ixz896jFpy.KHTxRUMF.bL64dcha3SNbEhMy3KMjlK', 'USER', TIMESTAMP '2026-09-01 10:00:00')
) AS v(nome, email, senha, papel, created_at)
WHERE NOT EXISTS (SELECT 1 FROM usuario u WHERE u.email = v.email);

COMMIT;
