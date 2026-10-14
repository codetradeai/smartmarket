-- ============================================================
-- SmartMarket - Queries Otimizadas e Índices de Busca
-- PostgreSQL
-- ============================================================

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Índice solicitado pela task: busca por nome do produto
CREATE INDEX IF NOT EXISTS idx_produto_nome
    ON produto(nome);

-- Índice solicitado pela task: busca e ordenação por preço
CREATE INDEX IF NOT EXISTS idx_preco_valor
    ON preco(valor);

-- Índice composto para busca de preço por produto e mercado
CREATE INDEX IF NOT EXISTS idx_preco_produto_mercado
    ON preco(produto_id, mercado_id);


-- ============================================================
-- CONSULTAS RELACIONADAS AO PRODUTOREPOSITORY
-- ============================================================

-- Busca produtos por categoria
SELECT
    id,
    nome,
    marca,
    categoria,
    unidade,
    quantidade
FROM produto
WHERE categoria = 'Alimentos';


-- Busca por parte do nome normalizado
-- Equivalente ao findByNomeNormalizadoContaining(...)
SELECT
    id,
    nome,
    marca,
    categoria,
    unidade,
    quantidade
FROM produto
WHERE nome_normalizado LIKE '%arroz%';


-- ============================================================
-- CONSULTAS RELACIONADAS AO PRECOREPOSITORY
-- ============================================================

-- Busca preços de um produto em um determinado mercado
-- Equivalente ao findByProdutoIdAndMercadoId(...)
SELECT
    id,
    produto_id,
    mercado_id,
    valor,
    coletado_em,
    disponivel
FROM preco
WHERE produto_id = 1
  AND mercado_id = 1
ORDER BY valor ASC;


-- Busca preços de um determinado mercado
-- Equivalente ao findByMercadoId(...)
SELECT
    id,
    produto_id,
    mercado_id,
    valor,
    coletado_em,
    disponivel
FROM preco
WHERE mercado_id = 1
ORDER BY valor ASC;


-- Busca preços disponíveis
-- Equivalente ao findByDisponivelTrue(...)
SELECT
    id,
    produto_id,
    mercado_id,
    valor,
    coletado_em
FROM preco
WHERE disponivel = TRUE;


-- ============================================================
-- CONSULTA DE BUSCA E ORDENAÇÃO POR PREÇO
-- ============================================================

-- Consulta relacionada ao índice idx_preco_valor
SELECT
    id,
    produto_id,
    mercado_id,
    valor,
    coletado_em
FROM preco
WHERE valor <= 10.00
ORDER BY valor ASC;


-- ============================================================
-- ANÁLISE DOS PLANOS DE EXECUÇÃO
-- ============================================================
-- As consultas abaixo utilizam EXPLAIN para analisar os planos
-- de execução escolhidos pelo PostgreSQL.

-- Produto por categoria
EXPLAIN
SELECT
    id,
    nome,
    marca,
    categoria,
    unidade,
    quantidade
FROM produto
WHERE categoria = 'Alimentos';


-- Busca por nome normalizado
EXPLAIN
SELECT
    id,
    nome,
    marca,
    categoria,
    unidade,
    quantidade
FROM produto
WHERE nome_normalizado LIKE '%arroz%';


-- Produto + mercado
EXPLAIN
SELECT
    id,
    produto_id,
    mercado_id,
    valor,
    coletado_em,
    disponivel
FROM preco
WHERE produto_id = 1
  AND mercado_id = 1
ORDER BY valor ASC;


-- Preços por mercado
EXPLAIN
SELECT
    id,
    produto_id,
    mercado_id,
    valor,
    coletado_em,
    disponivel
FROM preco
WHERE mercado_id = 1
ORDER BY valor ASC;


-- Busca por valor
EXPLAIN
SELECT
    id,
    produto_id,
    mercado_id,
    valor,
    coletado_em
FROM preco
WHERE valor <= 10.00
ORDER BY valor ASC;


-- ============================================================
-- FIM DO SCRIPT
-- ============================================================