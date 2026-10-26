-- SmartMarket
-- Script DML de Massa de Dados Inicial (Seeds)
-- Banco de dados: PostgreSQL
-- Observacao: os valores de preco sao simulados para testes.

-- =====================================================
-- 1. Cadastro dos supermercados
-- =====================================================

INSERT INTO mercado (nome, endereco, ativo)
SELECT dados.nome, dados.endereco, TRUE
FROM (
    VALUES
        ('Fort Atacadista', 'Porto Alegre/RS'),
        ('Zaffari', 'Porto Alegre/RS'),
        ('Carrefour', 'Porto Alegre/RS')
) AS dados(nome, endereco)
WHERE NOT EXISTS (
    SELECT 1
    FROM mercado m
    WHERE LOWER(TRIM(m.nome)) = LOWER(TRIM(dados.nome))
);

-- =====================================================
-- 2. Cadastro dos 30 produtos
-- =====================================================

INSERT INTO produto (
    nome,
    nome_normalizado,
    marca,
    quantidade,
    unidade,
    categoria
)
SELECT
    dados.nome,
    LOWER(TRIM(dados.nome)),
    dados.marca,
    dados.quantidade,
    dados.unidade,
    dados.categoria
FROM (
    VALUES
        ('Arroz branco tipo 1', 'Tio Joao', 5.0, 'kg', 'Mercearia'),
        ('Feijao preto', 'Caldo Bom', 1.0, 'kg', 'Mercearia'),
        ('Acucar refinado', 'Uniao', 1.0, 'kg', 'Mercearia'),
        ('Cafe torrado e moido', 'Melitta', 500.0, 'g', 'Mercearia'),
        ('Leite integral UHT', 'Elege', 1.0, 'L', 'Laticinios'),
        ('Oleo de soja', 'Cocamar', 900.0, 'ml', 'Mercearia'),
        ('Farinha de trigo', 'Dona Benta', 1.0, 'kg', 'Mercearia'),
        ('Macarrao espaguete', 'Renata', 500.0, 'g', 'Mercearia'),
        ('Molho de tomate', 'Fugini', 300.0, 'g', 'Mercearia'),
        ('Sal refinado', 'Cisne', 1.0, 'kg', 'Mercearia'),
        ('Farinha de milho', 'Yoki', 500.0, 'g', 'Mercearia'),
        ('Aveia em flocos', 'Quaker', 170.0, 'g', 'Cereais'),
        ('Biscoito agua e sal', 'Marilan', 350.0, 'g', 'Biscoitos'),
        ('Pao de forma', 'Wickbold', 500.0, 'g', 'Padaria'),
        ('Margarina', 'Qualy', 500.0, 'g', 'Laticinios'),
        ('Queijo mucarela', 'Marca variavel', 1.0, 'kg', 'Frios'),
        ('Iogurte natural', 'Nestle', 170.0, 'g', 'Laticinios'),
        ('Manteiga com sal', 'Aviacao', 200.0, 'g', 'Laticinios'),
        ('Ovos brancos', 'Granja local', 12.0, 'un', 'Hortifruti'),
        ('Banana caturra', 'A granel', 1.0, 'kg', 'Hortifruti'),
        ('Maca gala', 'A granel', 1.0, 'kg', 'Hortifruti'),
        ('Batata inglesa', 'A granel', 1.0, 'kg', 'Hortifruti'),
        ('Tomate', 'A granel', 1.0, 'kg', 'Hortifruti'),
        ('Cebola', 'A granel', 1.0, 'kg', 'Hortifruti'),
        ('Peito de frango', 'Marca variavel', 1.0, 'kg', 'Carnes'),
        ('Carne moida bovina', 'Marca variavel', 1.0, 'kg', 'Carnes'),
        ('Detergente liquido', 'Ype', 500.0, 'ml', 'Limpeza'),
        ('Sabao em po', 'OMO', 800.0, 'g', 'Limpeza'),
        ('Papel higienico', 'Personal', 12.0, 'un', 'Higiene'),
        ('Creme dental', 'Colgate', 90.0, 'g', 'Higiene')
) AS dados(nome, marca, quantidade, unidade, categoria)
WHERE NOT EXISTS (
    SELECT 1
    FROM produto p
    WHERE LOWER(TRIM(p.nome)) = LOWER(TRIM(dados.nome))
);

-- =====================================================
-- 3. Geracao dos precos historicos simulados
-- 30 produtos x 3 supermercados x 2 datas = 180 precos
-- =====================================================

WITH produtos_preco (nome, indice, valor_base) AS (
    VALUES
        ('Arroz branco tipo 1', 1, 24.90),
        ('Feijao preto', 2, 7.49),
        ('Acucar refinado', 3, 4.29),
        ('Cafe torrado e moido', 4, 18.90),
        ('Leite integral UHT', 5, 4.79),
        ('Oleo de soja', 6, 6.49),
        ('Farinha de trigo', 7, 4.99),
        ('Macarrao espaguete', 8, 3.99),
        ('Molho de tomate', 9, 2.49),
        ('Sal refinado', 10, 2.79),
        ('Farinha de milho', 11, 3.49),
        ('Aveia em flocos', 12, 5.49),
        ('Biscoito agua e sal', 13, 4.99),
        ('Pao de forma', 14, 8.49),
        ('Margarina', 15, 7.99),
        ('Queijo mucarela', 16, 39.90),
        ('Iogurte natural', 17, 2.49),
        ('Manteiga com sal', 18, 9.49),
        ('Ovos brancos', 19, 10.99),
        ('Banana caturra', 20, 5.49),
        ('Maca gala', 21, 8.99),
        ('Batata inglesa', 22, 5.99),
        ('Tomate', 23, 7.99),
        ('Cebola', 24, 4.49),
        ('Peito de frango', 25, 18.90),
        ('Carne moida bovina', 26, 34.90),
        ('Detergente liquido', 27, 2.29),
        ('Sabao em po', 28, 12.90),
        ('Papel higienico', 29, 16.90),
        ('Creme dental', 30, 4.49)
),
mercados_preco (nome, ordem) AS (
    VALUES
        ('Fort Atacadista', 1),
        ('Zaffari', 2),
        ('Carrefour', 3)
),
datas_preco (coletado_em, fator) AS (
    VALUES
        (TIMESTAMP '2026-09-18 10:00:00', 0.98),
        (TIMESTAMP '2026-10-10 10:00:00', 1.00)
)
INSERT INTO preco (
    produto_id,
    mercado_id,
    valor,
    coletado_em,
    origem,
    nome_bruto,
    disponivel
)
SELECT
    p.id,
    m.id,
    ROUND(
        (
            pp.valor_base
            * (1 + (MOD(pp.indice + mp.ordem, 5) - 2) * 0.02)
            * dp.fator
        )::NUMERIC,
        2
    ),
    dp.coletado_em,
    'SEED_SIMULADO',
    p.nome,
    TRUE
FROM produtos_preco pp
JOIN produto p
    ON LOWER(TRIM(p.nome)) = LOWER(TRIM(pp.nome))
CROSS JOIN mercados_preco mp
JOIN mercado m
    ON LOWER(TRIM(m.nome)) = LOWER(TRIM(mp.nome))
CROSS JOIN datas_preco dp
WHERE NOT EXISTS (
    SELECT 1
    FROM preco pr
    WHERE pr.produto_id = p.id
      AND pr.mercado_id = m.id
      AND pr.coletado_em = dp.coletado_em
      AND pr.origem = 'SEED_SIMULADO'
);